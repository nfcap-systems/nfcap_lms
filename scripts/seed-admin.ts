import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Creates (or re-roles) one demo ADMIN account directly via the Supabase admin API — admin has no
// signup UI (docs/product/PRODUCT_CONTEXT.md Section 6/8), so this collapses the normal
// signup-then-promote-role flow into one step for local dev. Safe to re-run.
//
// Usage: npm run seed-admin

const DEMO_PASSWORD = 'Demo1234!';
const ADMIN_EMAIL = 'admin@demo.nfcap.test';
const ADMIN_NAME = 'Ada Min';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (existing) {
    // Also resets the password: without this, re-running this script after a prior session
    // changed the password via Account Settings (or just forgot it) silently leaves the login
    // broken while still printing a password that no longer works — happened twice already
    // (docs/plans/phase-3-and-design-migration-kickoff.md's Feature #1/#2 progress rows).
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      app_metadata: { role: 'ADMIN' },
      user_metadata: { name: ADMIN_NAME },
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Re-roled existing account ${ADMIN_EMAIL} -> ADMIN, password reset`);
  } else {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME },
      app_metadata: { role: 'ADMIN' },
    });
    if (error) throw error;
    console.log(`Created ${ADMIN_EMAIL} (ADMIN)`);
  }

  console.log(`\nAdmin login: ${ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
