import { vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { getAuthUser, getRole } from '@/lib/supabase/server';
import type { Role } from '@/lib/roles';

/** Points the mocked getAuthUser()/getRole() (see tests/setup/vitest.setup.ts) at a fake signed-in
 * user for the current test, so a real server action's role gate sees the role under test. */
export function mockAuthUser(role: Role | null, id: string) {
  const user = { id, app_metadata: { role } } as unknown as User;
  vi.mocked(getAuthUser).mockResolvedValue(role === null ? null : user);
  vi.mocked(getRole).mockReturnValue(role);
}
