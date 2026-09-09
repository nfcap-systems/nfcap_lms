'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CourseAccess as PrismaCourseAccess } from '@/generated/prisma/enums';
import { requireAdmin } from './guard';
import type { CourseAccess } from '@/lib/types';

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'course'
  );
}

function revalidateCourseLists() {
  revalidatePath('/admin/courses');
  revalidatePath('/learner/explore');
  revalidatePath('/learner/my-learning');
  revalidatePath('/learner');
}

export type NewCourseInput = {
  title: string;
  description: string;
  category: string;
  access: CourseAccess;
};

/** Appends a wholly new course to the end of the pathway (Curriculum Builder scope note,
 * docs/product/PRODUCT_CONTEXT.md Section 8 — one per-course authoring tool, no course reordering). */
export async function createCourse(input: NewCourseInput): Promise<{ slug: string }> {
  await requireAdmin();

  const baseSlug = slugify(input.title);
  let slug = baseSlug;
  let n = 2;
  while (await prisma.course.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${n++}`;
  }

  const maxOrder = await prisma.course.aggregate({ _max: { pathwayOrder: true } });
  const pathwayOrder = (maxOrder._max.pathwayOrder ?? 0) + 1;

  const course = await prisma.course.create({
    data: {
      slug,
      title: input.title,
      description: input.description,
      category: input.category,
      access:
        input.access === 'restricted' ? PrismaCourseAccess.RESTRICTED : PrismaCourseAccess.OPEN,
      pathwayOrder,
      evidencePrompt: `Submit evidence of your applied work for ${input.title}.`,
      assessment: { create: { passThreshold: 0.75 } },
    },
  });

  revalidateCourseLists();
  return { slug: course.slug };
}

/** Unpublishing hides a course from learner discovery only — it must never revoke access for
 * learners already enrolled (see src/lib/data/courses.ts getAllCourses vs getPublishedCourses). */
export async function setCoursePublished(slug: string, published: boolean): Promise<void> {
  await requireAdmin();
  await prisma.course.update({ where: { slug }, data: { isPublished: published } });
  revalidateCourseLists();
}
