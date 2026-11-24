import { getLearnerProfile } from '@/lib/data/wioa';
import { wioaNavItem } from '@/lib/nav';
import { NavLinkItem } from './NavLinkItem';

/** The Funding nav item is conditional on LearnerProfile.fundingSource, which lives behind
 * src/lib/db/rls.ts's withRlsContext (its own comment documents ~1.7-2s baseline connection
 * latency in this environment). Kept as its own async component so src/app/learner/layout.tsx can
 * wrap just this in Suspense instead of blocking the whole header/shell on it. */
export async function WioaNavLink({ userId, role }: { userId: string; role: string }) {
  const profile = await getLearnerProfile({ userId, role }, userId);
  if (profile?.fundingSource !== 'WIOA_PENDING') return null;
  return <NavLinkItem href={wioaNavItem.href} label={wioaNavItem.label} />;
}
