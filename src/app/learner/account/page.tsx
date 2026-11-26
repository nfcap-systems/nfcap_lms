import { getAuthUser } from '@/lib/supabase/server';
import { getLearnerProfile, getWioaCasesForLearner } from '@/lib/data/wioa';
import { AccountSettingsForm } from '@/components/account/AccountSettingsForm';
import { LearnerAccountSidebar } from '@/components/learner/LearnerAccountSidebar';

export default async function LearnerAccountPage() {
  const user = await getAuthUser();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const email = user?.email ?? '';
  const [profile, wioaCases] = user
    ? await Promise.all([
        getLearnerProfile({ userId: user.id, role: 'LEARNER' }, user.id),
        getWioaCasesForLearner({ userId: user.id, role: 'LEARNER' }, user.id),
      ])
    : [null, []];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--ink)]">Account Settings</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Manage your name, email, password, and contact info.
        </p>
      </div>

      <div
        className="grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]"
        style={{
          display: 'grid',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <AccountSettingsForm name={name} email={email} learnerProfile={profile} />
        <LearnerAccountSidebar
          name={name || email || 'You'}
          memberSince={user ? new Date(user.created_at) : new Date()}
          latestWioaCase={wioaCases[0] ?? null}
        />
      </div>
    </div>
  );
}
