'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { LessonType as PrismaLessonType, ContentBlockType as PrismaContentBlockType } from '@/generated/prisma/enums';
import { requireAdmin } from './guard';
import type { ContentBlockType, LessonType } from '@/lib/types';

function revalidateCourse(courseSlug: string) {
  revalidatePath(`/admin/courses/${courseSlug}`);
  revalidatePath(`/learner/courses/${courseSlug}`);
}

async function courseSlugForLesson(lessonId: string): Promise<string> {
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { section: { select: { course: { select: { slug: true } } } } },
  });
  return lesson.section.course.slug;
}

async function courseSlugForBlock(blockId: string): Promise<string> {
  const block = await prisma.contentBlock.findUniqueOrThrow({
    where: { id: blockId },
    select: { lesson: { select: { section: { select: { course: { select: { slug: true } } } } } } },
  });
  return block.lesson.section.course.slug;
}

const blockTypeToPrisma: Record<ContentBlockType, PrismaContentBlockType> = {
  text: PrismaContentBlockType.TEXT,
  'bullet-list': PrismaContentBlockType.BULLET_LIST,
  'numbered-list': PrismaContentBlockType.NUMBERED_LIST,
  'header-1': PrismaContentBlockType.HEADER_1,
  'header-2': PrismaContentBlockType.HEADER_2,
  'header-3': PrismaContentBlockType.HEADER_3,
  image: PrismaContentBlockType.IMAGE,
  video: PrismaContentBlockType.VIDEO,
};

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

export async function updateSection(
  courseSlug: string,
  sectionId: string,
  title: string,
): Promise<void> {
  await requireAdmin();
  await prisma.section.update({ where: { id: sectionId }, data: { title } });
  revalidateCourse(courseSlug);
}

export async function deleteSection(courseSlug: string, sectionId: string): Promise<void> {
  await requireAdmin();
  await prisma.section.delete({ where: { id: sectionId } });
  revalidateCourse(courseSlug);
}

export type NewBlockInput = {
  type: ContentBlockType;
  content: string;
  items?: string[];
  url?: string;
};

export type NewLessonInput = {
  title: string;
  type: LessonType;
  durationMinutes: number;
  blocks: NewBlockInput[];
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
      order: (maxOrder._max.order ?? -1) + 1,
      blocks: {
        create: lesson.blocks.map((block, index) => ({
          type: blockTypeToPrisma[block.type],
          content: block.content,
          items: block.items ?? [],
          url: block.url,
          order: index,
        })),
      },
    },
  });
  revalidateCourse(courseSlug);
}

export type UpdateLessonInput = {
  title: string;
  type: LessonType;
  durationMinutes: number;
};

export async function updateLesson(
  courseSlug: string,
  lessonId: string,
  lesson: UpdateLessonInput,
): Promise<void> {
  await requireAdmin();
  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: lesson.title,
      type: PrismaLessonType[lesson.type.toUpperCase() as Uppercase<LessonType>],
      durationMinutes: lesson.durationMinutes,
    },
  });
  revalidateCourse(courseSlug);
}

export async function deleteLesson(courseSlug: string, lessonId: string): Promise<void> {
  await requireAdmin();
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidateCourse(courseSlug);
}

export async function addContentBlock(lessonId: string, block: NewBlockInput): Promise<void> {
  await requireAdmin();
  const [courseSlug, maxOrder] = await Promise.all([
    courseSlugForLesson(lessonId),
    prisma.contentBlock.aggregate({ where: { lessonId }, _max: { order: true } }),
  ]);
  await prisma.contentBlock.create({
    data: {
      lessonId,
      type: blockTypeToPrisma[block.type],
      content: block.content,
      items: block.items ?? [],
      url: block.url,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  revalidateCourse(courseSlug);
}

export type UpdateBlockInput = {
  type: ContentBlockType;
  content: string;
  items?: string[];
  url?: string;
};

export async function updateContentBlock(
  blockId: string,
  block: UpdateBlockInput,
): Promise<void> {
  await requireAdmin();
  const courseSlug = await courseSlugForBlock(blockId);
  await prisma.contentBlock.update({
    where: { id: blockId },
    data: {
      type: blockTypeToPrisma[block.type],
      content: block.content,
      items: block.items ?? [],
      url: block.url,
    },
  });
  revalidateCourse(courseSlug);
}

export async function deleteContentBlock(blockId: string): Promise<void> {
  await requireAdmin();
  const courseSlug = await courseSlugForBlock(blockId);
  await prisma.contentBlock.delete({ where: { id: blockId } });
  revalidateCourse(courseSlug);
}

export async function moveContentBlock(
  lessonId: string,
  blockId: string,
  direction: 'up' | 'down',
): Promise<void> {
  await requireAdmin();
  const blocks = await prisma.contentBlock.findMany({
    where: { lessonId },
    orderBy: { order: 'asc' },
  });
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) throw new Error(`Block "${blockId}" not found on lesson "${lessonId}".`);

  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= blocks.length) return;

  const current = blocks[index];
  const neighbor = blocks[neighborIndex];
  await prisma.$transaction([
    prisma.contentBlock.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    prisma.contentBlock.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);
  revalidateCourse(await courseSlugForLesson(lessonId));
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

export type UpdateQuestionInput = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export async function updateQuestion(
  courseSlug: string,
  questionId: string,
  question: UpdateQuestionInput,
): Promise<void> {
  await requireAdmin();
  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      prompt: question.prompt,
      options: question.options,
      correctIndex: question.correctIndex,
    },
  });
  revalidateCourse(courseSlug);
}

export async function deleteQuestion(courseSlug: string, questionId: string): Promise<void> {
  await requireAdmin();
  await prisma.quizQuestion.delete({ where: { id: questionId } });
  revalidateCourse(courseSlug);
}
