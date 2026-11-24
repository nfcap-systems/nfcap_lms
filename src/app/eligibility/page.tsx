import { EligibilityCheckView } from '@/components/learner/EligibilityCheckView';
import { getEligibilityQuestions } from '@/lib/data/eligibility';

export const metadata = { title: 'Eligibility Check — NFCAP' };

export default async function EligibilityCheckPage() {
  const questions = await getEligibilityQuestions();
  return <EligibilityCheckView questions={questions} />;
}
