import { getPendingReviewCount } from '@/lib/data/progress';
import { SidebarPromoBanner } from './SidebarPromoBanner';

/** Its own async component so AppSidebar/AdminLayout can wrap just this query in Suspense instead
 * of making the whole sidebar wait on it before painting. */
export async function PendingReviewBanner() {
  const pendingReviewCount = await getPendingReviewCount();
  if (pendingReviewCount <= 0) return null;
  return (
    <SidebarPromoBanner
      icon="check"
      title={`${pendingReviewCount} submission${pendingReviewCount === 1 ? '' : 's'} waiting`}
      description="Evidence is in your Review Queue, ready to go."
      href="/admin/reviews"
    />
  );
}
