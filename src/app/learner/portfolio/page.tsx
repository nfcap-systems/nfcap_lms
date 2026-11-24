import { getAllCourses } from '@/lib/data/courses';
import { getCredentialsForLearner, type Credential } from '@/lib/data/credentials';
import { getPortfolioShareToken } from '@/lib/data/learners';
import { getLearnerProgressMap, type CourseProgress } from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';
import { PortfolioView } from './PortfolioView';

export default async function PortfolioPage() {
  const user = await getAuthUser();
  const courses = await getAllCourses();
  const [credentials, progressMap, shareToken] = await Promise.all([
    user ? getCredentialsForLearner(user.id, courses) : Promise.resolve<Credential[]>([]),
    user ? getLearnerProgressMap(user.id) : Promise.resolve<Record<string, CourseProgress>>({}),
    user ? getPortfolioShareToken(user.id) : Promise.resolve<string | null>(null),
  ]);
  const awaitingReview = Object.values(progressMap).filter(
    (p) => p.evidence?.status === 'pending',
  ).length;

  return (
    <PortfolioView
      credentials={credentials}
      awaitingReview={awaitingReview}
      shareToken={shareToken}
    />
  );
}
