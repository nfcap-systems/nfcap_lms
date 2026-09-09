import { prisma } from '@/lib/prisma';
import type { CourseWhereInput } from '@/generated/prisma/models';
import type { Course, Lesson, LessonType } from '@/lib/types';

export type AdminCourse = Course & { published: boolean };

const courseInclude = {
  sections: {
    orderBy: { order: 'asc' as const },
    include: { lessons: { orderBy: { order: 'asc' as const } } },
  },
  assessment: { include: { questions: { orderBy: { order: 'asc' as const } } } },
};

async function findCourses(where?: CourseWhereInput) {
  return prisma.course.findMany({
    where,
    orderBy: { pathwayOrder: 'asc' },
    include: courseInclude,
  });
}

type DbCourse = Awaited<ReturnType<typeof findCourses>>[number];

// `Course.id` is the route/lookup key everywhere in the app (URLs, progress-store keys) — it's
// mapped to the DB's readable `slug`, not the internal cuid, so routes stay human-readable
// (/learner/courses/safety-tools) and the not-yet-migrated progress-store's mock keys still line
// up. Section/lesson ids stay as real DB ids since nothing routes by them.
function mapCourse(db: DbCourse): AdminCourse {
  return {
    id: db.slug,
    title: db.title,
    description: db.description,
    category: db.category,
    access: db.access === 'RESTRICTED' ? 'restricted' : 'open',
    pathwayOrder: db.pathwayOrder,
    evidencePrompt: db.evidencePrompt,
    published: db.isPublished,
    sections: db.sections.map((section) => ({
      id: section.id,
      title: section.title,
      lessons: section.lessons.map((lesson): Lesson => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.type.toLowerCase() as LessonType,
        durationMinutes: lesson.durationMinutes,
        body: lesson.body,
        src: lesson.src ?? undefined,
        resourceLabel: lesson.resourceLabel ?? undefined,
      })),
    })),
    assessment: {
      id: db.assessment?.id ?? '',
      passThreshold: db.assessment?.passThreshold ?? 0.75,
      questions: (db.assessment?.questions ?? []).map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
      })),
    },
  };
}

/** All courses regardless of publish state — for admin, and for any learner-facing lookup where
 * a course a learner is already enrolled in must stay reachable even if Admin unpublished it. */
export async function getAllCourses(): Promise<AdminCourse[]> {
  const courses = await findCourses();
  return courses.map(mapCourse);
}

/** Learner discovery only (Explore, Home's pathway shelf) — hides unpublished courses. Never use
 * this for an enrollment/progress/detail lookup (see getAllCourses' doc comment). */
export async function getPublishedCourses(): Promise<AdminCourse[]> {
  const courses = await findCourses({ isPublished: true });
  return courses.map(mapCourse);
}

export async function getCourseBySlug(slug: string): Promise<AdminCourse | undefined> {
  const course = await prisma.course.findUnique({ where: { slug }, include: courseInclude });
  return course ? mapCourse(course) : undefined;
}
