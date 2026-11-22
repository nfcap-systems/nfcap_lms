import { getAllCourses, getPublishedCourses } from '@/lib/data/courses';
import { getLearnerProgressMap, getCourseUnlocksForLearner, type CourseProgress } from '@/lib/data/progress';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getAuthUser } from '@/lib/supabase/server';
import { MyLearningView } from './MyLearningView';

export default async function MyLearningPage() {
  const user = await getAuthUser();
  const [allCourses, published] = await Promise.all([getAllCourses(), getPublishedCourses()]);
  const pathway = [...published].sort((a, b) => a.pathwayOrder - b.pathwayOrder);
  const progressMap = user
    ? await getLearnerProgressMap(user.id)
    : ({} as Record<string, CourseProgress>);
  const unlockedCourseSlugs = user ? Object.keys(await getCourseUnlocksForLearner(user.id)) : [];
  const credentials = user ? await getCredentialsForLearner(user.id, allCourses) : [];

  return (
    <MyLearningView
      pathway={pathway}
      progressMap={progressMap}
      unlockedCourseSlugs={unlockedCourseSlugs}
      credentials={credentials}
    />
  );
}
