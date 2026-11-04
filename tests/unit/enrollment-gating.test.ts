import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { enroll, markLessonComplete, grantCourseUnlock } from '@/lib/actions/progress';
import { mockAuthUser } from '../setup/auth-mock';
import { createCourse, fakeUserId } from '../setup/fixtures';

describe('enrollment gating', () => {
  let learnerId: string;

  beforeEach(() => {
    learnerId = fakeUserId();
    mockAuthUser('LEARNER', learnerId);
  });

  it('enrolls freely in an OPEN course', async () => {
    const course = await createCourse({ access: 'OPEN' });

    await enroll(course.slug);

    const enrollment = await prisma.enrollment.findUnique({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    expect(enrollment).not.toBeNull();
  });

  it('refuses to enroll in a RESTRICTED course with no unlock', async () => {
    const course = await createCourse({ access: 'RESTRICTED' });

    await expect(enroll(course.slug)).rejects.toThrow(/restricted/i);

    const enrollment = await prisma.enrollment.findUnique({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    expect(enrollment).toBeNull();
  });

  it('allows enrollment in a RESTRICTED course once an admin grants a CourseUnlock', async () => {
    const course = await createCourse({ access: 'RESTRICTED' });
    mockAuthUser('ADMIN', fakeUserId());
    await grantCourseUnlock(learnerId, course.slug);

    mockAuthUser('LEARNER', learnerId);
    await enroll(course.slug);

    const enrollment = await prisma.enrollment.findUnique({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    expect(enrollment).not.toBeNull();
  });

  it('still refuses to mark a lesson complete in a RESTRICTED, unenrolled course', async () => {
    const course = await createCourse({ access: 'RESTRICTED' });

    await expect(markLessonComplete(course.slug, 'lesson-1')).rejects.toThrow(/restricted/i);
  });

  it('non-admins cannot grant a course unlock', async () => {
    const course = await createCourse({ access: 'RESTRICTED' });
    mockAuthUser('LEARNER', fakeUserId());

    await expect(grantCourseUnlock(learnerId, course.slug)).rejects.toThrow(/admin/i);
  });
});
