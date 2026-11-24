'use server';

import { getAuthUser, getRole } from '@/lib/supabase/server';
import {
  searchLearnerContent,
  searchAdminContent,
  searchStaffCases,
  type SearchResult,
} from '@/lib/data/search';

/** Routes the navbar search bar's query by the caller's real role instead of always searching
 * learner-shaped content — Admin/Coordinator/Partner Staff used to get learner course/lesson/
 * certificate results linking to /learner/... routes they can't even open. */
export async function searchGlobal(query: string): Promise<SearchResult[]> {
  const user = await getAuthUser();
  if (!user) return searchLearnerContent(undefined, query);

  const role = getRole(user);
  if (role === 'ADMIN') return searchAdminContent(query);
  if (role === 'WIOA_COORDINATOR') {
    return searchStaffCases({ userId: user.id, role }, query, '/coordinator');
  }
  if (role === 'PARTNER_STAFF') {
    return searchStaffCases({ userId: user.id, role }, query, '/partner', {
      assignedPartnerStaffId: user.id,
    });
  }

  return searchLearnerContent(user.id, query);
}
