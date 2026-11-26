'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withRlsContext } from '@/lib/db/rls';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getOrigin } from '@/lib/origin';

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const RESET_LIMIT = 5;
const RESET_WINDOW_MS = 60 * 60 * 1000;

export type AuthFormState = { error?: string; next?: string };

function orNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : null;
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  try {
    await enforceRateLimit(email.toLowerCase(), 'login', LOGIN_LIMIT, LOGIN_WINDOW_MS);
  } catch {
    return { error: 'Too many login attempts. Please wait a few minutes and try again.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // A deactivated account (setUserActive, src/lib/actions/users.ts — Supabase's ban_duration
    // admin API) otherwise surfaces Supabase's own generic auth error text verbatim here, which
    // was never written with this case in mind. `user_banned` is Supabase's own documented error
    // code (@supabase/auth-js's ErrorCode union) for exactly this, so it's checked rather than
    // string-matching `error.message`, which isn't a stable contract across Supabase versions.
    if (error.code === 'user_banned') {
      return { error: 'Your account has been deactivated. Contact your administrator.' };
    }
    return { error: error.message };
  }

  // Deliberately NOT `redirect()` here (that performs a client-side/RSC navigation that patches
  // the DOM into the already-loaded page). The destination route's own CSS can still be loading
  // when that patch commits, which intermittently painted the admin/coordinator/partner shell
  // with its classes present but unstyled (missing borders, unstyled Quick Create button) until a
  // real reload. Returning the target here and letting the client do a full
  // `window.location.href` navigation (LoginAstryx.tsx) guarantees a fresh document load — the
  // same code path as the manual refresh that always fixed it.
  return { next: next || '/' };
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

  try {
    await enforceRateLimit(email.toLowerCase(), 'signup', SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
  } catch {
    return { error: 'Too many signup attempts from this address. Please try again later.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Sign up failed. Please try again.' };

  // Supabase's anti-enumeration behavior: signUp() for an email that's already registered
  // returns a 200 with a user object that has an empty `identities` array and a placeholder id
  // that doesn't exist in auth.users — not an error, and not a real new user. Previously this
  // fell through to admin.updateUserById() below, which then failed with a raw "User not found"
  // (Supabase's own 404 message) instead of a message that tells the learner what's actually
  // wrong.
  if (data.user.identities?.length === 0) {
    return { error: 'An account with this email already exists. Try logging in instead.' };
  }

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
  const learnerId = data.user.id;
  // RLS-scoped (docs/build/PHASE_1_DB_ACCESS_DECISION.md) — the signing-up user is always
  // creating their own profile, so `role` just needs to be a value `app_can_access_learner`
  // recognizes; LEARNER is also simply correct here.
  await withRlsContext({ userId: learnerId, role: 'LEARNER' }, (tx) =>
    tx.learnerProfile.create({
      data: {
        learnerId,
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
    }),
  );

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

/** Forgot-password request (Phase 2). Supabase's resetPasswordForEmail() intentionally doesn't
 * reveal whether the email belongs to an account (it "succeeds" either way to avoid leaking
 * which addresses are registered) — this action preserves that by always redirecting to the
 * same "check your email" state rather than branching on whether the account exists. */
export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');

  try {
    await enforceRateLimit(
      email.toLowerCase(),
      'password-reset-request',
      RESET_LIMIT,
      RESET_WINDOW_MS,
    );
  } catch {
    return { error: 'Too many requests. Please wait a while and try again.' };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  // src/app/auth/confirm/route.ts exchanges the email link's token for a real session. The
  // Supabase "Reset Password" email template must point there with token_hash/type/next — see
  // docs/build/PHASE_2_PASSWORD_RESET.md for the exact template text this depends on.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  });
  if (error) return { error: error.message };

  redirect('/forgot-password?sent=1');
}

/** Sets a new password from the /reset-password form. Only works because
 * src/app/auth/confirm/route.ts already established a real (recovery-scoped) session from a
 * valid, unexpired reset link before the user ever saw this form. */
export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect('/login?reset=1');
}
