'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { LessonType as PrismaLessonType } from '@/generated/prisma/enums';
import { requireAdmin } from './guard';
import type { LessonType } from '@/lib/types';

function revalidateCourse(courseSlug: string) {
  revalidatePath(`/admin/courses/${courseSlug}`);
  revalidatePath(`/learner/courses/${courseSlug}`);
}

export async function addSection(courseSlug: string, title: string): Promise<void> {
  await requireAdmin();
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { id: true },
  });
  const maxOrder = await prisma.section.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });
  await prisma.section.create({
    data: { courseId: course.id, title, order: (maxOrder._max.order ?? -1) + 1 },
  });
  revalidateCourse(courseSlug);
}

export type NewLessonInput = {
  title: string;
  type: LessonType;
  durationMinutes: number;
  body: string;
};

export async function addLesson(
  courseSlug: string,
  sectionId: string,
  lesson: NewLessonInput,
): Promise<void> {
  await requireAdmin();
  const maxOrder = await prisma.lesson.aggregate({
    where: { sectionId },
    _max: { order: true },
  });
  await prisma.lesson.create({
    data: {
      sectionId,
      title: lesson.title,
      type: PrismaLessonType[lesson.type.toUpperCase() as Uppercase<LessonType>],
      durationMinutes: lesson.durationMinutes,
      body: lesson.body,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  revalidateCourse(courseSlug);
}

export type NewQuestionInput = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export async function addQuestion(courseSlug: string, question: NewQuestionInput): Promise<void> {
  await requireAdmin();
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { assessment: { select: { id: true } } },
  });
  if (!course.assessment)
    throw new Error(`Course "${courseSlug}" has no assessment to add a question to.`);

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { assessmentId: course.assessment.id },
    _max: { order: true },
  });
  await prisma.quizQuestion.create({
    data: {
      assessmentId: course.assessment.id,
      prompt: question.prompt,
      options: question.options,
      correctIndex: question.correctIndex,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  revalidateCourse(courseSlug);
}
