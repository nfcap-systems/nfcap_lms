import { getAllCourses, getPublishedCourses } from '@/lib/data/courses';
import { getLearnerProgressMap, getCourseUnlocksForLearner } from '@/lib/data/progress';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getWioaCasesForLearner } from '@/lib/data/wioa';
import { getActiveAnnouncementsForViewer } from '@/lib/data/announcements';
import { getAuthUser, getRole } from '@/lib/supabase/server';
import { HomeView } from './HomeView';

export default async function LearnerHomePage() {
  const user = await getAuthUser();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;
  const firstName = name?.split(' ')[0] ?? 'there';

  // Discovery (the pathway shelf) only shows published courses; enrollment/continuation logic
  // uses the full set so a learner already enrolled never loses access if Admin unpublishes it.
  const [allCourses, published] = await Promise.all([getAllCourses(), getPublishedCourses()]);
  const pathway = [...published].sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  // These five were previously five sequential awaits — none depend on each other (only on
  // `user`/`allCourses`, already resolved above), so running them serially paid every query's
  // full round-trip cost one after another instead of overlapping them. getWioaCasesForLearner in
  // particular opens its own RLS transaction (src/lib/db/rls.ts's withRlsContext), whose comment
  // documents ~1.7-2s baseline connection latency in this environment — batching lets that
  // transaction run concurrently with the others instead of adding its full cost on top.
  const [progressMap, courseUnlocks, credentials, wioaCases, announcements] = user
    ? await Promise.all([
        getLearnerProgressMap(user.id),
        getCourseUnlocksForLearner(user.id),
        getCredentialsForLearner(user.id, allCourses),
        getWioaCasesForLearner({ userId: user.id, role: getRole(user) ?? 'LEARNER' }, user.id),
        getActiveAnnouncementsForViewer(user.id, 'learner'),
      ])
    : [{}, {}, [], [], []];
  const unlockedCourseSlugs = Object.keys(courseUnlocks);

  return (
    <HomeView
      allCourses={allCourses}
      pathway={pathway}
      progressMap={progressMap}
      unlockedCourseSlugs={unlockedCourseSlugs}
      credentials={credentials}
      wioaCases={wioaCases}
      announcements={announcements}
      firstName={firstName}
    />
  );
}
