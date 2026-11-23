import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEvidenceFileSignedUrl } from '@/lib/supabase/evidence-storage';
import type { EvidenceStatus } from './progress';

/** How one attempt at one criterion ended up. `pending` = submitted, reviewer hasn't decided;
 * `unreviewed` = the submission was closed out (approved/rejected) without a verdict on this
 * criterion. */
export type AttemptOutcome = 'met' | 'not_met' | 'pending' | 'unreviewed';

export type CriterionAttempt = {
  /** 1-based, oldest first — "Attempt 1" is always the first real capture. */
  attemptNumber: number;
  submittedAt: string;
  outcome: AttemptOutcome;
  reviewerNote?: string;
  reviewerName?: string;
  /** Signed, short-lived. Undefined when the attempt had no photo (note-only) or signing failed. */
  thumbUrl?: string;
  learnerDescription?: string;
};

/** The slice of a CriterionAssessment (+ its submission) that attempt derivation needs. Kept
 * separate from Prisma's row type so `buildCriterionAttempts` is a pure function the unit tests
 * can drive without a database. */
export type AttemptSourceRow = {
  carriedForward: boolean;
  /** CriterionAssessment.submittedAt — null for verdict-only rows that predate feature #9. */
  capturedAt: Date | null;
  /** The owning EvidenceSubmission's own submittedAt, used for ordering. */
  submissionSubmittedAt: Date;
  submissionStatus: EvidenceStatus;
  met: boolean | null;
  reviewerNote: string | null;
  reviewedBy: string | null;
  learnerFilePath: string | null;
  learnerDescription: string | null;
};

type DerivedAttempt = Omit<CriterionAttempt, 'thumbUrl' | 'reviewerName'> & {
  reviewedBy?: string;
  filePath?: string;
};

/** Feature #11 — the attempt history for one criterion, reusing the project's "every row is kept,
 * latest computed at query time" pattern (QuizAttempt / EvidenceSubmission) instead of a separate
 * history table: each attempt is the criterion's own CriterionAssessment row on its own
 * EvidenceSubmission. Carried-forward copies (feature #10) are not attempts and are dropped, as
 * are verdict-only rows with no learner capture. Returned newest first, as LRN06f lists them. */
export function buildCriterionAttempts(rows: AttemptSourceRow[]): DerivedAttempt[] {
  return rows
    .filter((r) => !r.carriedForward && r.capturedAt !== null)
    .sort((a, b) => a.submissionSubmittedAt.getTime() - b.submissionSubmittedAt.getTime())
    .map((r, i): DerivedAttempt => {
      const outcome: AttemptOutcome =
        r.met === true
          ? 'met'
          : r.met === false
            ? 'not_met'
            : r.submissionStatus === 'pending'
              ? 'pending'
              : 'unreviewed';
      return {
        attemptNumber: i + 1,
        submittedAt: r.submissionSubmittedAt.toISOString(),
        outcome,
        reviewerNote: r.reviewerNote ?? undefined,
        learnerDescription: r.learnerDescription ?? undefined,
        reviewedBy: r.reviewedBy ?? undefined,
        filePath: r.learnerFilePath ?? undefined,
      };
    })
    .reverse();
}

/** Display name for a staff reviewer. Supabase Auth is the only user store (same as
 * `getLearnerById`); a lookup failure degrades to no name rather than breaking the page. */
async function getReviewerNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      try {
        const { data } = await createAdminClient().auth.admin.getUserById(id);
        const user = data.user;
        if (!user) return;
        const meta = user.user_metadata?.name;
        names.set(id, typeof meta === 'string' ? meta : (user.email ?? 'NFCAP staff'));
      } catch {
        // Name is decoration; the feedback itself must still render.
      }
    }),
  );
  return names;
}

async function safeSignedUrl(path: string | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  try {
    return await getEvidenceFileSignedUrl(path);
  } catch {
    return undefined;
  }
}

function toSourceRow(
  a: {
    carriedForward: boolean;
    submittedAt: Date | null;
    met: boolean | null;
    reviewerNote: string | null;
    reviewedBy: string | null;
    learnerFilePath: string | null;
    learnerDescription: string | null;
  },
  submission: { submittedAt: Date; status: { toLowerCase(): string } },
): AttemptSourceRow {
  return {
    carriedForward: a.carriedForward,
    capturedAt: a.submittedAt,
    submissionSubmittedAt: submission.submittedAt,
    submissionStatus: submission.status.toLowerCase() as EvidenceStatus,
    met: a.met,
    reviewerNote: a.reviewerNote,
    reviewedBy: a.reviewedBy,
    learnerFilePath: a.learnerFilePath,
    learnerDescription: a.learnerDescription,
  };
}

async function loadCriterionRows(learnerId: string, courseSlug: string, criterionId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { learnerId, course: { slug: courseSlug } },
    select: {
      course: { select: { assessmentCriteria: { where: { id: criterionId } } } },
      evidenceSubmissions: {
        select: {
          submittedAt: true,
          status: true,
          criterionAssessments: { where: { criterionId } },
        },
      },
    },
  });
  const criterion = enrollment?.course.assessmentCriteria[0];
  if (!enrollment || !criterion) return undefined;
  const rows = enrollment.evidenceSubmissions.flatMap((s) =>
    s.criterionAssessments.map((a) => toSourceRow(a, s)),
  );
  return { criterion, rows };
}

export type CriterionAttemptHistory = {
  criterionId: string;
  criterionTitle: string;
  attempts: CriterionAttempt[];
};

/** LRN06f-AttemptHistory for one criterion. Scoped to `learnerId`'s own enrollment, so one learner
 * can never read another's history by guessing a criterion id. */
export async function getCriterionAttemptHistory(
  learnerId: string,
  courseSlug: string,
  criterionId: string,
): Promise<CriterionAttemptHistory | undefined> {
  const loaded = await loadCriterionRows(learnerId, courseSlug, criterionId);
  if (!loaded) return undefined;
  const derived = buildCriterionAttempts(loaded.rows);
  const names = await getReviewerNames(
    derived.flatMap((a) => (a.reviewedBy ? [a.reviewedBy] : [])),
  );
  const attempts = await Promise.all(
    derived.map(async ({ reviewedBy, filePath, ...attempt }) => ({
      ...attempt,
      reviewerName: reviewedBy ? names.get(reviewedBy) : undefined,
      thumbUrl: await safeSignedUrl(filePath),
    })),
  );
  return { criterionId, criterionTitle: loaded.criterion.title, attempts };
}

export type NotMetCriterion = {
  criterionId: string;
  title: string;
  reviewerNote?: string;
  /** Which attempt at this criterion the feedback is on (1-based). */
  attemptNumber: number;
  attemptSubmittedAt: string;
  thumbUrl?: string;
  /** More than one attempt exists, so the "view attempt history" link is worth showing. */
  hasHistory: boolean;
};

export type ResubmissionContext = {
  evidenceSubmissionId: string;
  reviewedAt?: string;
  reviewerName?: string;
  overallNote?: string;
  /** Criteria that still need new evidence: explicitly Not Met, or never given a verdict before
   * the reviewer asked for a resubmission. */
  notMet: NotMetCriterion[];
  /** Criteria already Met — these carry forward untouched (see `submitGuidedEvidence`). */
  metCriterionIds: string[];
};

/** Feature #10 — everything LRN06d (Evidence not met) and LRN06e (Resubmit) need, for a learner
 * whose latest submission was rejected. Undefined when there's nothing to resubmit. */
export async function getResubmissionContext(
  learnerId: string,
  courseSlug: string,
): Promise<ResubmissionContext | undefined> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { learnerId, course: { slug: courseSlug } },
    include: {
      evidenceSubmissions: {
        orderBy: { submittedAt: 'desc' },
        include: { criterionAssessments: true },
      },
      course: { select: { assessmentCriteria: { orderBy: { order: 'asc' } } } },
    },
  });
  const latest = enrollment?.evidenceSubmissions[0];
  if (!enrollment || !latest || latest.status !== 'REJECTED') return undefined;

  const assessmentByCriterion = new Map(latest.criterionAssessments.map((a) => [a.criterionId, a]));
  const metCriterionIds: string[] = [];
  const pending = enrollment.course.assessmentCriteria.filter((c) => {
    const met = assessmentByCriterion.get(c.id)?.met === true;
    if (met) metCriterionIds.push(c.id);
    return !met;
  });

  const reviewerIds = pending.flatMap((c) => {
    const id = assessmentByCriterion.get(c.id)?.reviewedBy;
    return id ? [id] : [];
  });
  const names = await getReviewerNames(reviewerIds);

  const notMet = await Promise.all(
    pending.map(async (criterion): Promise<NotMetCriterion> => {
      const assessment = assessmentByCriterion.get(criterion.id);
      const attempts = buildCriterionAttempts(
        enrollment.evidenceSubmissions.flatMap((s) =>
          s.criterionAssessments
            .filter((a) => a.criterionId === criterion.id)
            .map((a) => toSourceRow(a, s)),
        ),
      );
      return {
        criterionId: criterion.id,
        title: criterion.title,
        reviewerNote: assessment?.reviewerNote ?? undefined,
        attemptNumber: attempts[0]?.attemptNumber ?? 1,
        attemptSubmittedAt: (assessment?.submittedAt ?? latest.submittedAt).toISOString(),
        thumbUrl: await safeSignedUrl(assessment?.learnerFilePath ?? undefined),
        hasHistory: attempts.length > 1,
      };
    }),
  );

  const firstReviewer = reviewerIds[0];
  return {
    evidenceSubmissionId: latest.id,
    reviewedAt: latest.statusUpdatedAt?.toISOString(),
    reviewerName: firstReviewer ? names.get(firstReviewer) : undefined,
    overallNote: latest.reviewerNote ?? undefined,
    notMet,
    metCriterionIds,
  };
}
