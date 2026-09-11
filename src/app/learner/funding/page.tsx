import { getAuthUser } from '@/lib/supabase/server';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerProfile, getWioaCommunications, getWioaCasesForLearner } from '@/lib/data/wioa';
import { getWioaEmailTemplate } from '@/lib/data/wioa-email-template';
import { matchWorkforceOffice } from '@/lib/wioa/matching';
import { FundingView } from './FundingView';

export default async function FundingPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const [profile, courses, communications, cases, emailTemplate] = await Promise.all([
    getLearnerProfile(user.id),
    getAllCourses(),
    getWioaCommunications(user.id),
    getWioaCasesForLearner(user.id),
    getWioaEmailTemplate(),
  ]);

  const restrictedCourses = courses
    .filter((c) => c.access === 'restricted')
    .map((c) => ({ id: c.id, title: c.title }));

  const match = profile?.zip ? await matchWorkforceOffice(profile.zip) : null;

  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : 'You';
  const learnerEmail = user.email ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">WIOA Funding</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Match to your local workforce board and start the WIOA eligibility process for
          apprenticeship tuition funding.
        </p>
      </div>

      <FundingView
        profile={profile}
        match={match}
        restrictedCourses={restrictedCourses}
        communications={communications}
        cases={cases}
        learnerName={name}
        learnerEmail={learnerEmail}
        emailTemplate={emailTemplate}
      />
    </div>
  );
}
