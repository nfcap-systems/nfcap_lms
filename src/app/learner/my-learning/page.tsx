import { getAllCourses } from '@/lib/data/courses';
import { getLearnerProgressMap, type CourseProgress } from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';
import { MyLearningView } from './MyLearningView';

export default async function MyLearningPage() {
  const user = await getAuthUser();
  const [courses, progressMap] = await Promise.all([
    getAllCourses(),
    user ? getLearnerProgressMap(user.id) : Promise.resolve<Record<string, CourseProgress>>({}),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">My Learning</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Courses you&apos;re currently enrolled in or have been assigned.
        </p>
      </div>

      <MyLearningView courses={courses} progressMap={progressMap} />
    </div>
  );
}
