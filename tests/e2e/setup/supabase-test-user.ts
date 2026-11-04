import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Role } from '@/lib/roles';

/** Creates a throwaway, email-confirmed Supabase Auth user via the service-role admin API, so
 * Playwright can log in through the real auth flow without touching any pre-existing account.
 * App data (courses, enrollments, WIOA cases) never lives in Supabase Auth, so this only ever
 * mutates the Auth user table — never the app's own tables. */
export class E2eTestUser {
  readonly id: string;
  readonly email: string;
  readonly password = 'E2eTestPassword123!';

  private constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }

  static async create(role: Role): Promise<E2eTestUser> {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const email = `e2e-${role.toLowerCase()}-${randomUUID()}@nfcap-e2e.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'E2eTestPassword123!',
      email_confirm: true,
      app_metadata: { role },
    });
    if (error || !data.user) {
      throw new Error(`Failed to create E2E test user: ${error?.message}`);
    }
    return new E2eTestUser(data.user.id, email);
  }

  async delete(): Promise<void> {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await admin.auth.admin.deleteUser(this.id);
  }
}
