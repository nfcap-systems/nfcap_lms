import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ALL_ROLES, isRole } from '../src/lib/roles';

// One-time manual step: NFCAP LMS has no signup UI for anything but LEARNER
// (docs/product/PRODUCT_CONTEXT.md Section 6/8; docs/build/WIOA_BUILD_WORKFLOW.md Phase 3). Sign up normally
// at /signup first (that account starts as LEARNER), then run this script with that account's
// email and the target role to flip it.
//
// Usage: npx tsx scripts/promote-role.ts someone@example.com ADMIN

async function main() {
  const email = process.argv[2];
  const role = process.argv[3];

  if (!email || !role) {
    console.error('Usage: npx tsx scripts/promote-role.ts <email> <role>');
    console.error(`Roles: ${ALL_ROLES.join(', ')}`);
    process.exit(1);
  }
  if (!isRole(role)) {
    console.error(`Unknown role "${role}". Roles: ${ALL_ROLES.join(', ')}`);
    process.exit(1);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  // listUsers paginates; the prototype's user base is tiny so one page (default 50) is enough.
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No account found for ${email}. Sign up at /signup first.`);
    process.exit(1);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
  });
  if (updateError) throw updateError;

  console.log(`${email} is now ${role}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
