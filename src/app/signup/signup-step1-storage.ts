/** Hand-off between /signup (Step 1) and /signup/wioa (Step 2) — both pre-auth, so there's no
 * server-side session to stash this in yet. sessionStorage only: per-tab, never reaches the
 * server, and clears itself when the tab closes. Left in place (not cleared) across the hand-off
 * so Step 1 can still prefill itself if the learner uses Step 2's "Back" link. */
export const SIGNUP_STEP1_KEY = 'nfcap-signup-step1';

export type SignupStep1 = {
  name: string;
  email: string;
  password: string;
};
