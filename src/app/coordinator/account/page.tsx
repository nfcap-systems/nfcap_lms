import { getAuthUser } from '@/lib/supabase/server';
import { AccountSettingsForm } from '@/components/account/AccountSettingsForm';

export default async function CoordinatorAccountPage() {
  const user = await getAuthUser();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const email = user?.email ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--ink)]">Account Settings</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Manage your name, email, and password.</p>
      </div>

      <AccountSettingsForm name={name} email={email} />
    </div>
  );
}
