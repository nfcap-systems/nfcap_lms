import { ExploreCourseCard } from '@/components/learner/ExploreCourseCard';
import { getPublishedCourses } from '@/lib/data/courses';
import {
  getLearnerProgressMap,
  getCourseUnlocksForLearner,
  type CourseProgress,
  type CourseUnlockRecord,
} from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';

export default async function ExplorePage() {
  const user = await getAuthUser();
  const [courses, progressMap, unlocks] = await Promise.all([
    getPublishedCourses(),
    user ? getLearnerProgressMap(user.id) : Promise.resolve<Record<string, CourseProgress>>({}),
    user
      ? getCourseUnlocksForLearner(user.id)
      : Promise.resolve<Record<string, CourseUnlockRecord>>({}),
  ]);
  const sorted = [...courses].sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Course Catalog</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          NFCAP&apos;s full apprenticeship pathway. Courses marked Restricted are assigned by NFCAP
          staff based on your progress and program placement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((course) => (
          <ExploreCourseCard
            key={course.id}
            course={course}
            progress={progressMap[course.id]}
            unlocked={Boolean(unlocks[course.id])}
          />
        ))}
      </div>
    </div>
  );
}
