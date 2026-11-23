import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { bulkApproveEvidence, enroll, submitGuidedEvidence } from '@/lib/actions/progress';
import { getCourseProgress } from '@/lib/data/progress';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getAllCourses } from '@/lib/data/courses';
import { setCriterionVerdict } from '@/lib/actions/criterionReview';
import { mockAuthUser } from '../setup/auth-mock';
import { createCourse, fakeUserId } from '../setup/fixtures';

// setCriterionVerdict resolves the reviewer's display name through Supabase Auth's admin API,
// which unit tests don't reach — same stub as tests/unit/criterion-resubmission.test.ts.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: { id, user_metadata: { name: 'Ada Min' } } },
        }),
      },
    },
  }),
}));

// Feature #9's guided capture uploads every file before its transaction; these tests never pass a
// real File, but the module is stubbed so nothing can reach Storage from a unit test.
vi.mock('@/lib/supabase/evidence-storage', () => ({
  uploadEvidenceFile: vi.fn(async () => undefined),
  getEvidenceFileSignedUrl: vi.fn(async () => 'https://example.test/signed'),
}));

/** Feature #12 — Legacy Data & Regression Pass
 * (docs/plans/phase-3-and-design-migration-kickoff.md Step 2).
 *
 * Features #7–#11 reshaped evidence around CriterionAssessment, and the shapes now coexist: a
 * submission made before that work (or before its course had criteria) still carries its evidence
 * on the EvidenceSubmission itself. Every regression below was found live against real seed data,
 * not hypothesised. */
describe('legacy evidence coexisting with per-criterion evidence (feature #12)', () => {
  let learnerId: string;
  let adminId: string;

  beforeEach(() => {
    learnerId = fakeUserId();
    adminId = fakeUserId();
    mockAuthUser('LEARNER', learnerId);
  });

  async function courseWithCriteria(mandatory = true) {
    const course = await createCourse({ access: 'OPEN' });
    const criteria = await Promise.all(
      ['A', 'B'].map((title, i) =>
        prisma.assessmentCriterion.create({
          data: {
            courseId: course.id,
            title,
            guidance: `Show ${title}`,
            photoRequired: false,
            mandatoryForCertification: mandatory,
            order: i + 1,
          },
        }),
      ),
    );
    return { course, criteria };
  }

  /** The shape every pre-#9 submission has: description + course-level file, no criterion rows. */
  async function legacySubmission(courseId: string, withFile: boolean) {
    const enrollment = await prisma.enrollment.upsert({
      where: { learnerId_courseId: { learnerId, courseId } },
      update: {},
      create: { learnerId, courseId },
    });
    return prisma.evidenceSubmission.create({
      data: {
        enrollmentId: enrollment.id,
        description: 'Legacy single-description evidence.',
        fileName: withFile ? 'legacy.jpg' : null,
        filePath: withFile ? `${learnerId}/${enrollment.id}/legacy.jpg` : null,
        status: 'PENDING',
      },
    });
  }

  it('reports a legacy submission as not per-criterion, with its own course-level file', async () => {
    const { course } = await courseWithCriteria();
    await legacySubmission(course.id, true);

    const progress = await getCourseProgress(learnerId, course.slug);

    // The course HAS criteria, but this submission predates them — rendering it through the
    // guided summary hid the learner's own description and attachment entirely.
    expect(progress?.evidence?.isPerCriterion).toBe(false);
    expect(progress?.evidence?.hasSubmissionFile).toBe(true);
    expect(progress?.evidence?.hasFile).toBe(true);
    expect(progress?.evidence?.description).toBe('Legacy single-description evidence.');
  });

  it('reports a guided submission as per-criterion, with no course-level file', async () => {
    const { course, criteria } = await courseWithCriteria();
    await enroll(course.slug);
    await submitGuidedEvidence(
      course.slug,
      criteria.map((c) => ({ criterionId: c.id, description: `Did ${c.title}`, file: null })),
    );

    const progress = await getCourseProgress(learnerId, course.slug);

    expect(progress?.evidence?.isPerCriterion).toBe(true);
    // False even though evidence exists — `getEvidenceFileUrl` can only serve the course-level
    // file, so a truthy value here produced a 500 from Admin's learner detail screen.
    expect(progress?.evidence?.hasSubmissionFile).toBe(false);
  });

  it('gives a certified guided submission its per-criterion captures, so the Portfolio has something to render', async () => {
    const { course, criteria } = await courseWithCriteria();
    await enroll(course.slug);
    await submitGuidedEvidence(
      course.slug,
      criteria.map((c) => ({ criterionId: c.id, description: `Did ${c.title}`, file: null })),
    );

    mockAuthUser('ADMIN', adminId);
    const submission = await prisma.evidenceSubmission.findFirstOrThrow({
      where: { enrollment: { learnerId, courseId: course.id } },
      include: { criterionAssessments: true },
    });
    for (const assessment of submission.criterionAssessments) {
      await setCriterionVerdict(submission.id, assessment.criterionId, true);
    }
    await bulkApproveEvidence([{ learnerId, courseSlug: course.slug }]);

    const credentials = await getCredentialsForLearner(learnerId, await getAllCourses());
    const credential = credentials.find((c) => c.course.id === course.slug);

    // Guided submissions have an empty `description` by design; without these the Portfolio card
    // rendered completely blank.
    expect(credential?.evidence.description).toBe('');
    expect(credential?.criteria.map((c) => c.title)).toEqual(['A', 'B']);
    expect(credential?.criteria.map((c) => c.description)).toEqual(['Did A', 'Did B']);
  });

  it('leaves a certified legacy submission with no per-criterion captures and its description intact', async () => {
    const course = await createCourse({ access: 'OPEN' });
    await legacySubmission(course.id, false);
    mockAuthUser('ADMIN', adminId);
    await bulkApproveEvidence([{ learnerId, courseSlug: course.slug }]);

    const credentials = await getCredentialsForLearner(learnerId, await getAllCourses());
    const credential = credentials.find((c) => c.course.id === course.slug);

    expect(credential?.criteria).toEqual([]);
    expect(credential?.evidence.description).toBe('Legacy single-description evidence.');
  });

  describe('bulk approve across both shapes', () => {
    it('approves what it can and reports what the gate refused, instead of throwing', async () => {
      // One course with no criteria at all (old behaviour, must still certify), one whose
      // mandatory criteria are unmet (feature #7 refuses it).
      const open = await createCourse({ access: 'OPEN' });
      await legacySubmission(open.id, false);
      const { course: gated } = await courseWithCriteria();
      await legacySubmission(gated.id, false);

      mockAuthUser('ADMIN', adminId);
      const result = await bulkApproveEvidence([
        { learnerId, courseSlug: open.slug },
        { learnerId, courseSlug: gated.slug },
      ]);

      expect(result.approved).toBe(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].courseSlug).toBe(gated.slug);
      expect(result.skipped[0].reason).toContain('Cannot certify');

      // The approvable one really was approved and certified — a throw used to abandon the rest
      // of the selection mid-loop.
      const approved = await prisma.enrollment.findUniqueOrThrow({
        where: { learnerId_courseId: { learnerId, courseId: open.id } },
        include: { certificate: true, evidenceSubmissions: true },
      });
      expect(approved.evidenceSubmissions[0].status).toBe('APPROVED');
      expect(approved.certificate).not.toBeNull();

      const refused = await prisma.enrollment.findUniqueOrThrow({
        where: { learnerId_courseId: { learnerId, courseId: gated.id } },
        include: { certificate: true, evidenceSubmissions: true },
      });
      expect(refused.evidenceSubmissions[0].status).toBe('PENDING');
      expect(refused.certificate).toBeNull();
    });

    it('certifies a gated course once every mandatory criterion is Met', async () => {
      const { course, criteria } = await courseWithCriteria();
      await enroll(course.slug);
      await submitGuidedEvidence(
        course.slug,
        criteria.map((c) => ({ criterionId: c.id, description: `Did ${c.title}`, file: null })),
      );

      mockAuthUser('ADMIN', adminId);
      const submission = await prisma.evidenceSubmission.findFirstOrThrow({
        where: { enrollment: { learnerId, courseId: course.id } },
      });
      expect((await bulkApproveEvidence([{ learnerId, courseSlug: course.slug }])).approved).toBe(
        0,
      );

      for (const criterion of criteria) {
        await setCriterionVerdict(submission.id, criterion.id, true);
      }
      const result = await bulkApproveEvidence([{ learnerId, courseSlug: course.slug }]);

      expect(result).toEqual({ approved: 1, skipped: [] });
      const enrollment = await prisma.enrollment.findUniqueOrThrow({
        where: { learnerId_courseId: { learnerId, courseId: course.id } },
        include: { certificate: true },
      });
      expect(enrollment.certificate).not.toBeNull();
    });
  });
});
