import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export function fakeUserId(): string {
  return randomUUID();
}

export async function createCourse(
  overrides: Partial<{ slug: string; access: 'OPEN' | 'RESTRICTED' }> = {},
) {
  const slug = overrides.slug ?? `course-${randomUUID()}`;
  return prisma.course.create({
    data: {
      slug,
      title: `Test Course ${slug}`,
      description: 'A course for tests.',
      category: 'General',
      access: overrides.access ?? 'OPEN',
      pathwayOrder: 1,
      evidencePrompt: 'Submit a photo of the finished work.',
    },
  });
}

/** Creates a course with exactly one section/lesson, so "all lessons complete" is a single
 * CompletedLesson row — enough for tests that need to reach the evidence step without driving
 * an entire course's content through the UI. */
export async function createCourseWithOneLesson(
  overrides: Partial<{ slug: string; access: 'OPEN' | 'RESTRICTED' }> = {},
) {
  const course = await createCourse(overrides);
  const section = await prisma.section.create({
    data: { courseId: course.id, title: 'Section 1', order: 1 },
  });
  const lesson = await prisma.lesson.create({
    data: { sectionId: section.id, title: 'Lesson 1', type: 'TEXT', durationMinutes: 5, order: 1 },
  });
  return { course, section, lesson };
}

/** Enrolls a learner and fast-forwards them straight to the evidence step (lesson complete, quiz
 * passed) by writing the prerequisite rows directly, skipping the UI walk through course content. */
export async function enrollAndCompleteLesson(
  learnerId: string,
  courseId: string,
  lessonId: string,
) {
  const enrollment = await prisma.enrollment.upsert({
    where: { learnerId_courseId: { learnerId, courseId } },
    update: {},
    create: { learnerId, courseId },
  });
  await prisma.completedLesson.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: {},
    create: { enrollmentId: enrollment.id, lessonId },
  });
  await prisma.quizAttempt.create({
    data: { enrollmentId: enrollment.id, scorePercent: 100, passed: true },
  });
  return enrollment;
}

export async function createWorkforceBoard() {
  return prisma.workforceBoard.create({
    data: {
      name: `Test Board ${randomUUID()}`,
      county: 'Test County',
      serviceArea: 'Test Area',
      phone: '555-0100',
      email: 'board@example.test',
      address: '123 Test St',
    },
  });
}

export async function createDocumentRequirement(workforceBoardId: string, name = 'Proof of ID') {
  return prisma.wioaDocumentRequirement.create({
    data: {
      workforceBoardId,
      name,
      description: `${name} requirement`,
    },
  });
}

export async function createWioaCase(params: {
  learnerId: string;
  courseId: string;
  workforceBoardId?: string;
  status?: import('@/generated/prisma/enums').WioaCaseStatus;
  assignedPartnerStaffId?: string;
}) {
  return prisma.wioaCase.create({
    data: {
      learnerId: params.learnerId,
      courseId: params.courseId,
      workforceBoardId: params.workforceBoardId,
      status: params.status ?? 'INITIAL_CONTACT_SENT',
      assignedPartnerStaffId: params.assignedPartnerStaffId,
    },
  });
}
