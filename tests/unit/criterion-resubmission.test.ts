import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  enroll,
  setEvidenceStatus,
  submitGuidedEvidence,
  type GuidedCriterionCapture,
} from '@/lib/actions/progress';
import { setCriterionVerdict } from '@/lib/actions/criterionReview';
import {
  buildCriterionAttempts,
  getCriterionAttemptHistory,
  getResubmissionContext,
  type AttemptSourceRow,
} from '@/lib/data/criterionAttempts';
import { mockAuthUser } from '../setup/auth-mock';
import { createCourse, fakeUserId } from '../setup/fixtures';

// Reviewer display name comes from Supabase Auth's admin API, which unit tests don't reach.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: { id, user_metadata: { name: 'Marcus Webb' } } },
        }),
      },
    },
  }),
}));

const note = (criterionId: string, description = 'Done'): GuidedCriterionCapture => ({
  criterionId,
  description,
  file: null,
});

describe('targeted resubmission + attempt history (features #10 / #11)', () => {
  let learnerId: string;
  let adminId: string;

  beforeEach(() => {
    learnerId = fakeUserId();
    adminId = fakeUserId();
    mockAuthUser('LEARNER', learnerId);
  });

  async function setup() {
    const course = await createCourse({ access: 'OPEN' });
    const [a, b, c] = await Promise.all(
      ['A', 'B', 'C'].map((title, i) =>
        prisma.assessmentCriterion.create({
          data: {
            courseId: course.id,
            title,
            guidance: `Show ${title}`,
            photoRequired: false,
            mandatoryForCertification: true,
            order: i + 1,
          },
        }),
      ),
    );
    await enroll(course.slug);
    await submitGuidedEvidence(course.slug, [note(a.id), note(b.id), note(c.id)]);
    return { course, a, b, c };
  }

  async function latestSubmission(courseId: string) {
    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { learnerId_courseId: { learnerId, courseId } },
    });
    return prisma.evidenceSubmission.findFirstOrThrow({
      where: { enrollmentId: enrollment.id },
      orderBy: { submittedAt: 'desc' },
      include: { criterionAssessments: true },
    });
  }

  /** Admin marks A and C Met, B Not Met, then sends the submission back. */
  async function rejectWithBNotMet(
    slug: string,
    submissionId: string,
    ids: { a: string; b: string; c: string },
  ) {
    mockAuthUser('ADMIN', adminId);
    await setCriterionVerdict(submissionId, ids.a, true);
    await setCriterionVerdict(submissionId, ids.b, false, 'Spacing uneven on the right edge');
    await setCriterionVerdict(submissionId, ids.c, true);
    await setEvidenceStatus(learnerId, slug, 'rejected');
    mockAuthUser('LEARNER', learnerId);
  }

  it('carries Met criteria forward and only requires the unmet one', async () => {
    const { course, a, b, c } = await setup();
    const first = await latestSubmission(course.id);
    await rejectWithBNotMet(course.slug, first.id, { a: a.id, b: b.id, c: c.id });

    await submitGuidedEvidence(course.slug, [note(b.id, 'Re-checked every gap with a spacer')]);

    const second = await latestSubmission(course.id);
    expect(second.id).not.toBe(first.id);
    expect(second.status).toBe('PENDING');
    const byCriterion = new Map(second.criterionAssessments.map((r) => [r.criterionId, r]));
    expect(byCriterion.get(a.id)).toMatchObject({ met: true, carriedForward: true });
    expect(byCriterion.get(c.id)).toMatchObject({ met: true, carriedForward: true });
    expect(byCriterion.get(b.id)).toMatchObject({
      met: null,
      carriedForward: false,
      learnerDescription: 'Re-checked every gap with a spacer',
    });
    // The rejected attempt is untouched — never overwritten.
    const firstAgain = await prisma.criterionAssessment.findMany({
      where: { evidenceSubmissionId: first.id },
    });
    expect(firstAgain).toHaveLength(3);
    expect(firstAgain.find((r) => r.criterionId === b.id)?.met).toBe(false);
  });

  it('refuses a resubmission that redoes a Met criterion or skips an unmet one', async () => {
    const { course, a, b, c } = await setup();
    const first = await latestSubmission(course.id);
    await rejectWithBNotMet(course.slug, first.id, { a: a.id, b: b.id, c: c.id });

    await expect(submitGuidedEvidence(course.slug, [note(a.id), note(b.id)])).rejects.toThrow(
      /already met/i,
    );
    await expect(submitGuidedEvidence(course.slug, [])).rejects.toThrow(/every criterion/i);
    // Nothing partial was written.
    expect((await latestSubmission(course.id)).id).toBe(first.id);
  });

  it('a carried-forward Met still satisfies gated certification once B is met', async () => {
    const { course, a, b, c } = await setup();
    const first = await latestSubmission(course.id);
    await rejectWithBNotMet(course.slug, first.id, { a: a.id, b: b.id, c: c.id });
    await submitGuidedEvidence(course.slug, [note(b.id)]);
    const second = await latestSubmission(course.id);

    mockAuthUser('ADMIN', adminId);
    await expect(setEvidenceStatus(learnerId, course.slug, 'approved')).rejects.toThrow();
    await setCriterionVerdict(second.id, b.id, true);
    await setEvidenceStatus(learnerId, course.slug, 'approved');

    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
      include: { certificate: true },
    });
    expect(enrollment.certificate).not.toBeNull();
  });

  it('first-ever submission still requires every criterion', async () => {
    const course = await createCourse({ access: 'OPEN' });
    const [a, b] = await Promise.all(
      ['A', 'B'].map((title, i) =>
        prisma.assessmentCriterion.create({
          data: {
            courseId: course.id,
            title,
            guidance: 'g',
            photoRequired: false,
            mandatoryForCertification: true,
            order: i + 1,
          },
        }),
      ),
    );
    await enroll(course.slug);
    await expect(submitGuidedEvidence(course.slug, [note(a.id)])).rejects.toThrow(
      /every criterion/i,
    );
    await submitGuidedEvidence(course.slug, [note(a.id), note(b.id)]);
  });

  it('getResubmissionContext lists only unmet criteria and is empty unless rejected', async () => {
    const { course, a, b, c } = await setup();
    expect(await getResubmissionContext(learnerId, course.slug)).toBeUndefined();

    const first = await latestSubmission(course.id);
    await rejectWithBNotMet(course.slug, first.id, { a: a.id, b: b.id, c: c.id });

    const ctx = await getResubmissionContext(learnerId, course.slug);
    expect(ctx?.notMet.map((n) => n.criterionId)).toEqual([b.id]);
    expect(ctx?.notMet[0]).toMatchObject({
      reviewerNote: 'Spacing uneven on the right edge',
      attemptNumber: 1,
      hasHistory: false,
    });
    expect(ctx?.metCriterionIds.sort()).toEqual([a.id, c.id].sort());
    expect(ctx?.reviewerName).toBe('Marcus Webb');
  });

  it('attempt history lists real attempts newest-first and excludes carried-forward copies', async () => {
    const { course, a, b, c } = await setup();
    const first = await latestSubmission(course.id);
    await rejectWithBNotMet(course.slug, first.id, { a: a.id, b: b.id, c: c.id });
    await submitGuidedEvidence(course.slug, [note(b.id)]);
    const second = await latestSubmission(course.id);
    mockAuthUser('ADMIN', adminId);
    await setCriterionVerdict(second.id, b.id, true);
    mockAuthUser('LEARNER', learnerId);

    const historyB = await getCriterionAttemptHistory(learnerId, course.slug, b.id);
    expect(historyB?.attempts.map((x) => [x.attemptNumber, x.outcome])).toEqual([
      [2, 'met'],
      [1, 'not_met'],
    ]);
    expect(historyB?.attempts[1].reviewerNote).toBe('Spacing uneven on the right edge');

    // A was Met once and carried forward — it was only ever attempted once.
    const historyA = await getCriterionAttemptHistory(learnerId, course.slug, a.id);
    expect(historyA?.attempts.map((x) => x.attemptNumber)).toEqual([1]);
  });

  it("attempt history is scoped to the caller's own enrollment", async () => {
    const { course, b } = await setup();
    expect(await getCriterionAttemptHistory(fakeUserId(), course.slug, b.id)).toBeUndefined();
  });
});

describe('buildCriterionAttempts (pure)', () => {
  const row = (over: Partial<AttemptSourceRow>): AttemptSourceRow => ({
    carriedForward: false,
    capturedAt: new Date('2026-01-01'),
    submissionSubmittedAt: new Date('2026-01-01'),
    submissionStatus: 'rejected',
    met: null,
    reviewerNote: null,
    reviewedBy: null,
    learnerFilePath: null,
    learnerDescription: null,
    ...over,
  });

  it('orders by submission time regardless of input order and numbers oldest as 1', () => {
    const out = buildCriterionAttempts([
      row({ submissionSubmittedAt: new Date('2026-01-03'), met: true }),
      row({ submissionSubmittedAt: new Date('2026-01-01'), met: false }),
    ]);
    expect(out.map((o) => [o.attemptNumber, o.outcome])).toEqual([
      [2, 'met'],
      [1, 'not_met'],
    ]);
  });

  it('drops carried-forward copies and verdict-only rows with no learner capture', () => {
    expect(
      buildCriterionAttempts([row({ carriedForward: true }), row({ capturedAt: null })]),
    ).toEqual([]);
  });

  it('distinguishes a still-pending attempt from one closed without a verdict', () => {
    const [pending] = buildCriterionAttempts([row({ submissionStatus: 'pending' })]);
    const [closed] = buildCriterionAttempts([row({ submissionStatus: 'approved' })]);
    expect(pending.outcome).toBe('pending');
    expect(closed.outcome).toBe('unreviewed');
  });
});
