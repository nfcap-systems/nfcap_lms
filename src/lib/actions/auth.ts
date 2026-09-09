'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

export type AuthFormState = { error?: string };

function orNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : null;
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(next || '/');
}

/** Learner self-signup (docs/product/PRODUCT_CONTEXT.md: single Admin role, no admin signup UI — Admin
 * accounts are promoted via scripts/promote-admin.ts). Role-stamping must happen server-side:
 * app_metadata is not client-writable by design (it's the trusted claim middleware reads for
 * authorization), so this action signs the user up with the anon client and then immediately
 * uses the service-role admin client to set app_metadata.role = 'LEARNER'. */
export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!name) return { error: 'Name is required.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Sign up failed. Please try again.' };

  const admin = createAdminClient();
  const { error: roleError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role: 'LEARNER' },
  });
  if (roleError) return { error: roleError.message };

  // WIOA module, Phase 1 (docs/build/WIOA_BUILD_WORKFLOW.md) — the app's first Postgres-side user
  // record. Created for every signup, not just WIOA-pursuing ones, so the row always exists to
  // update later from Profile/Funding rather than needing a separate "does a profile exist yet"
  // branch there.
  const pursuingWioa = formData.get('pursuingWioa') === 'on';
  const dateOfBirth = String(formData.get('dateOfBirth') ?? '');
  await prisma.learnerProfile.create({
    data: {
      learnerId: data.user.id,
      fundingSource: pursuingWioa ? 'WIOA_PENDING' : 'SELF_PAY',
      streetAddress: orNull(formData.get('streetAddress')),
      city: orNull(formData.get('city')),
      state: orNull(formData.get('state')),
      zip: orNull(formData.get('zip')),
      preferredLanguage: orNull(formData.get('preferredLanguage')),
      employmentStatus: orNull(formData.get('employmentStatus')),
      unemploymentInsuranceStatus: orNull(formData.get('unemploymentInsuranceStatus')),
      trainingApprenticeshipInterest: orNull(formData.get('trainingApprenticeshipInterest')),
      mobilePhone: orNull(formData.get('mobilePhone')),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    },
  });

  if (data.session) {
    // Email confirmation is off, so signUp already established a session — but its JWT was
    // minted before the role stamp above, so it still carries empty app_metadata. Sign in again
    // to mint a fresh token that reflects role: 'LEARNER', then go straight to the dashboard.
    const { error: reLoginError } = await supabase.auth.signInWithPassword({ email, password });
    if (reLoginError) return { error: reLoginError.message };
    redirect('/learner');
  }

  // Email confirmation is on and no session was issued — the learner needs to confirm via
  // email first, then a normal /login gets a session with the already-stamped role.
  redirect('/login?confirm=1');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
