import { getAllCourses, getPublishedCourses } from '@/lib/data/courses';
import { getCredentialsForLearner, type Credential } from '@/lib/data/credentials';
import { getLearnerProgressMap, getCourseUnlocksForLearner, type CourseProgress } from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';
import { CertificatesView } from './CertificatesView';

export default async function CertificatesPage() {
  const user = await getAuthUser();
  const [allCourses, published] = await Promise.all([getAllCourses(), getPublishedCourses()]);
  const pathway = [...published].sort((a, b) => a.pathwayOrder - b.pathwayOrder);
  const [credentials, progressMap, unlockedCourseSlugs] = await Promise.all([
    user ? getCredentialsForLearner(user.id, allCourses) : Promise.resolve<Credential[]>([]),
    user ? getLearnerProgressMap(user.id) : Promise.resolve<Record<string, CourseProgress>>({}),
    user ? getCourseUnlocksForLearner(user.id).then((u) => Object.keys(u)) : Promise.resolve<string[]>([]),
  ]);
  const learnerName =
    typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : 'You';

  return (
    <CertificatesView
      pathway={pathway}
      credentials={credentials}
      progressMap={progressMap}
      unlockedCourseSlugs={unlockedCourseSlugs}
      learnerName={learnerName}
    />
  );
}
