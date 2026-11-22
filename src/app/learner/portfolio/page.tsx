import { getAllCourses } from '@/lib/data/courses';
import { getCredentialsForLearner, type Credential } from '@/lib/data/credentials';
import { getLearnerProgressMap, type CourseProgress } from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';
import { PortfolioView } from './PortfolioView';

export default async function PortfolioPage() {
  const user = await getAuthUser();
  const courses = await getAllCourses();
  const [credentials, progressMap] = await Promise.all([
    user ? getCredentialsForLearner(user.id, courses) : Promise.resolve<Credential[]>([]),
    user ? getLearnerProgressMap(user.id) : Promise.resolve<Record<string, CourseProgress>>({}),
  ]);
  const awaitingReview = Object.values(progressMap).filter((p) => p.evidence?.status === 'pending').length;

  return <PortfolioView credentials={credentials} awaitingReview={awaitingReview} />;
}
