// Single source of truth for the app's role mechanism (`app_metadata.role` in Supabase Auth).
// src/proxy.ts (route confinement), src/lib/supabase/server.ts (getRole), and
// scripts/promote-role.ts all read from this instead of hardcoding the role list separately
// (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — proxy.ts's two hardcoded role blocks become a generic
// role -> prefix table).

export type Role = 'ADMIN' | 'LEARNER' | 'PARTNER_STAFF' | 'WIOA_COORDINATOR';

export const ALL_ROLES: Role[] = ['ADMIN', 'LEARNER', 'PARTNER_STAFF', 'WIOA_COORDINATOR'];

/// Each role is confined to exactly one route prefix — src/proxy.ts redirects a signed-in user
/// away from any other role's prefix, and redirects `/`, `/login`, `/signup` to this home.
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  LEARNER: '/learner',
  PARTNER_STAFF: '/partner',
  WIOA_COORDINATOR: '/coordinator',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ALL_ROLES as string[]).includes(value);
}
