import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ALL_ROLES, isRole, type Role } from '../src/lib/roles';

// Creates (or re-roles) demo WIOA staff accounts directly via the Supabase admin API — the app
// has no signup UI for non-LEARNER roles (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3), so this is the
// equivalent of "sign up at /signup, then npm run promote-role" collapsed into one step for
// manual QC. Safe to re-run.
//
// Usage:
//   npm run seed-wioa-staff                       (seeds the default staff set below)
//   npm run seed-wioa-staff -- you@example.com WIOA_COORDINATOR

const DEMO_PASSWORD = 'Demo1234!';

const DEFAULT_STAFF: { email: string; name: string; role: Role }[] = [
  { email: 'coordinator@demo.nfcap.test', name: 'Corey Dinator', role: 'WIOA_COORDINATOR' },
  { email: 'partner@demo.nfcap.test', name: 'Pat Ner', role: 'PARTNER_STAFF' },
];

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function upsertStaff(email: string, name: string, role: Role): Promise<void> {
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      app_metadata: { role },
      user_metadata: { name },
    });
    if (error) throw error;
    console.log(`Re-roled existing account ${email} -> ${role}`);
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role },
  });
  if (error) throw error;
  console.log(`Created ${email} (${role}) — password: ${DEMO_PASSWORD}`);
}

async function main() {
  const [emailArg, roleArg] = process.argv.slice(2);

  if (emailArg) {
    if (!roleArg || !isRole(roleArg)) {
      console.error(`Usage: npm run seed-wioa-staff -- <email> <role>`);
      console.error(`Roles: ${ALL_ROLES.join(', ')}`);
      process.exit(1);
    }
    await upsertStaff(emailArg, emailArg.split('@')[0], roleArg);
  } else {
    for (const s of DEFAULT_STAFF) await upsertStaff(s.email, s.name, s.role);
  }
  console.log(`\nAll demo staff accounts use password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
