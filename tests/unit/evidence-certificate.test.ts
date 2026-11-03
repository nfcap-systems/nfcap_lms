import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { enroll, submitEvidence, setEvidenceStatus } from '@/lib/actions/progress';
import { mockAuthUser } from '../setup/auth-mock';
import { createCourse, fakeUserId } from '../setup/fixtures';

describe('evidence → certificate', () => {
  let learnerId: string;

  beforeEach(async () => {
    learnerId = fakeUserId();
    mockAuthUser('LEARNER', learnerId);
  });

  async function enrollAndSubmit() {
    const course = await createCourse({ access: 'OPEN' });
    await enroll(course.slug);
    await submitEvidence(course.slug, 'Finished the flooring section.', 'photo.jpg');
    return course;
  }

  it('creates a PENDING evidence submission on submit', async () => {
    const course = await enrollAndSubmit();

    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
      include: { evidenceSubmissions: true },
    });
    expect(enrollment.evidenceSubmissions).toHaveLength(1);
    expect(enrollment.evidenceSubmissions[0].status).toBe('PENDING');
  });

  it('approving evidence issues a certificate', async () => {
    const course = await enrollAndSubmit();
    mockAuthUser('ADMIN', fakeUserId());

    await setEvidenceStatus(learnerId, course.slug, 'approved');

    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
      include: { certificate: true, evidenceSubmissions: true },
    });
    expect(enrollment.evidenceSubmissions[0].status).toBe('APPROVED');
    expect(enrollment.certificate).not.toBeNull();
    expect(enrollment.certificate?.certificateCode).toContain('NFCAP-');
  });

  it('rejecting evidence after an approval retracts the certificate', async () => {
    const course = await enrollAndSubmit();
    mockAuthUser('ADMIN', fakeUserId());
    await setEvidenceStatus(learnerId, course.slug, 'approved');

    await setEvidenceStatus(learnerId, course.slug, 'rejected');

    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
      include: { certificate: true, evidenceSubmissions: true },
    });
    expect(enrollment.evidenceSubmissions[0].status).toBe('REJECTED');
    expect(enrollment.certificate).toBeNull();
  });

  it('a non-admin cannot approve evidence', async () => {
    const course = await enrollAndSubmit();
    mockAuthUser('LEARNER', fakeUserId());

    await expect(setEvidenceStatus(learnerId, course.slug, 'approved')).rejects.toThrow(/admin/i);
  });

  it('refuses to update status when there is no evidence submission', async () => {
    const course = await createCourse({ access: 'OPEN' });
    await enroll(course.slug);
    mockAuthUser('ADMIN', fakeUserId());

    await expect(setEvidenceStatus(learnerId, course.slug, 'approved')).rejects.toThrow(
      /no evidence submission/i,
    );
  });
});
