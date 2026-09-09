import { getAllCourses, getPublishedCourses } from '@/lib/data/courses';
import { getLearnerProgressMap, getCourseUnlocksForLearner } from '@/lib/data/progress';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getAuthUser } from '@/lib/supabase/server';
import { HomeView } from './HomeView';

export default async function LearnerHomePage() {
  const user = await getAuthUser();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;
  const firstName = name?.split(' ')[0] ?? 'there';

  // Discovery (the pathway shelf) only shows published courses; enrollment/continuation logic
  // uses the full set so a learner already enrolled never loses access if Admin unpublishes it.
  const [allCourses, published] = await Promise.all([getAllCourses(), getPublishedCourses()]);
  const pathway = [...published].sort((a, b) => a.pathwayOrder - b.pathwayOrder);
  const progressMap = user ? await getLearnerProgressMap(user.id) : {};
  const unlockedCourseSlugs = user
    ? Object.keys(await getCourseUnlocksForLearner(user.id))
    : [];
  const credentials = user ? await getCredentialsForLearner(user.id, allCourses) : [];

  return (
    <HomeView
      allCourses={allCourses}
      pathway={pathway}
      progressMap={progressMap}
      unlockedCourseSlugs={unlockedCourseSlugs}
      credentials={credentials}
      firstName={firstName}
    />
  );
}
