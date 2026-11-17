'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getRole } from '@/lib/supabase/server';
import { requireUser } from './guard';
import { withRlsContext } from '@/lib/db/rls';
import { enforceRateLimit } from '@/lib/rate-limit';

export type AccountFormState = { error?: string; success?: string };

// Matches Phase 1's password-reset-request limit (src/lib/actions/auth.ts) — same sensitivity.
const SENSITIVE_LIMIT = 5;
const SENSITIVE_WINDOW_MS = 60 * 60 * 1000;

function orNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : null;
}

/** Re-proves the caller's identity for a sensitive change (email/password) by signing in again
 * with the password they just typed. Supabase has no dedicated "verify current password"
 * endpoint, and `updateUser()` doesn't check session freshness on its own, so without this a
 * hijacked session could silently change the password or email (docs/build/PHASE_2_PROGRESS.md,
 * Session & Login Hardening). Throws a plain user-facing message rather than Supabase's wording. */
async function reauthenticate(email: string, currentPassword: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (error) throw new Error('Current password is incorrect.');
  return supabase;
}

export async function updateName(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Name is required.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { name } });
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: 'Name updated.' };
}

export async function updateEmail(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const newEmail = String(formData.get('email') ?? '').trim();
  const currentPassword = String(formData.get('currentPassword') ?? '');
  if (!newEmail) return { error: 'Email is required.' };
  if (!currentPassword) return { error: 'Enter your current password to confirm this change.' };
  if (!user.email) return { error: 'Current account has no email on file.' };

  try {
    await enforceRateLimit(user.id, 'account-email-change', SENSITIVE_LIMIT, SENSITIVE_WINDOW_MS);
  } catch {
    return { error: 'Too many attempts. Please wait a while and try again.' };
  }

  let supabase;
  try {
    supabase = await reauthenticate(user.email, currentPassword);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Current password is incorrect.' };
  }

  // Supabase's "Confirm email change" template needs the same `/auth/confirm` wiring the
  // reset-password/signup templates already got this phase (docs/build/PHASE_2_PROGRESS.md) —
  // until that's done in the dashboard, the default confirmation link won't land on a route this
  // app handles.
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { error: error.message };

  return { success: 'Check your new email address for a confirmation link to finish the change.' };
}

export async function updateAccountPassword(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  if (newPassword.length < 8) return { error: 'New password must be at least 8 characters.' };
  if (!user.email) return { error: 'Current account has no email on file.' };

  try {
    await enforceRateLimit(
      user.id,
      'account-password-change',
      SENSITIVE_LIMIT,
      SENSITIVE_WINDOW_MS,
    );
  } catch {
    return { error: 'Too many attempts. Please wait a while and try again.' };
  }

  let supabase;
  try {
    supabase = await reauthenticate(user.email, currentPassword);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Current password is incorrect.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: 'Password updated.' };
}

/** Learner-only contact info. Deliberately excludes the WIOA intake fields
 * (`employmentStatus`/`unemploymentInsuranceStatus`/`trainingApprenticeshipInterest`/
 * `fundingSource`) that `updateWioaProfile` (src/lib/actions/wioa.ts) owns — those belong to the
 * Funding intake flow, and that action unconditionally sets `fundingSource: 'WIOA_PENDING'` as a
 * side effect this general account-settings page must not trigger. */
export async function updateContactInfo(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  if (getRole(user) !== 'LEARNER') return { error: 'Not available for this account.' };

  const dateOfBirth = String(formData.get('dateOfBirth') ?? '');

  await withRlsContext({ userId: user.id, role: 'LEARNER' }, (tx) =>
    tx.learnerProfile.update({
      where: { learnerId: user.id },
      data: {
        streetAddress: orNull(formData.get('streetAddress')),
        city: orNull(formData.get('city')),
        state: orNull(formData.get('state')),
        zip: orNull(formData.get('zip')),
        mobilePhone: orNull(formData.get('mobilePhone')),
        preferredLanguage: orNull(formData.get('preferredLanguage')),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    }),
  );

  revalidatePath('/learner/account');
  return { success: 'Contact info updated.' };
}
