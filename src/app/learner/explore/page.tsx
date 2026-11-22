import { getPublishedCourses } from '@/lib/data/courses';
import {
  getLearnerProgressMap,
  getCourseUnlocksForLearner,
  type CourseProgress,
  type CourseUnlockRecord,
} from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';
import { ExploreView } from './ExploreView';

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

  return <ExploreView courses={sorted} progressMap={progressMap} unlocks={unlocks} />;
}
