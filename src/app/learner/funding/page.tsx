import { getAuthUser, getRole } from '@/lib/supabase/server';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerProfile, getWioaCommunications, getWioaCasesForLearner } from '@/lib/data/wioa';
import { getWioaEmailTemplate } from '@/lib/data/wioa-email-template';
import { matchWorkforceOffice } from '@/lib/wioa/matching';
import { FundingView } from './FundingView';

export default async function FundingPage() {
  const user = await getAuthUser();
  if (!user) return null;
  const viewer = { userId: user.id, role: getRole(user) ?? 'LEARNER' };

  const [profile, courses, communications, cases, emailTemplate] = await Promise.all([
    getLearnerProfile(viewer, user.id),
    getAllCourses(),
    getWioaCommunications(viewer, user.id),
    getWioaCasesForLearner(viewer, user.id),
    getWioaEmailTemplate(),
  ]);

  const restrictedCourses = courses
    .filter((c) => c.access === 'restricted')
    .map((c) => ({ id: c.id, title: c.title }));

  const match = profile?.zip ? await matchWorkforceOffice(profile.zip, profile.city) : null;

  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : 'You';
  const learnerEmail = user.email ?? '';

  // Matches FundingView's own default course selection (restrictedCourses[0]) so the header
  // names the right course on first render, per LRN10-FundingStatus's "Your WIOA funding" +
  // course-subtitle pattern — not generic boilerplate regardless of which case is active.
  const defaultCourseTitle = restrictedCourses[0]?.title ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--ink)]">Your WIOA funding</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {defaultCourseTitle ??
            'Match to your local workforce board and start the WIOA eligibility process for apprenticeship tuition funding.'}
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
