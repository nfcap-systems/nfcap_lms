import { getAllCourses } from '@/lib/data/courses';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getLearnerById, getLearnerIdByPortfolioShareToken } from '@/lib/data/learners';
import { PublicPortfolioView, type PublicPortfolio } from './PublicPortfolioView';

export const metadata = { title: 'Shared Portfolio — NFCAP' };

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const learnerId = await getLearnerIdByPortfolioShareToken(token);
  if (!learnerId) {
    return <PublicPortfolioView portfolio={null} />;
  }

  const courses = await getAllCourses();
  const [credentials, learner] = await Promise.all([
    getCredentialsForLearner(learnerId, courses),
    getLearnerById(learnerId),
  ]);

  const portfolio: PublicPortfolio = {
    learnerName: learner?.name || 'NFCAP Learner',
    credentials,
    token,
  };

  return <PublicPortfolioView portfolio={portfolio} />;
}
