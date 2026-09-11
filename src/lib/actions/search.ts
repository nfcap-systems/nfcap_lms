'use server';

import { getAuthUser } from '@/lib/supabase/server';
import { searchLearnerContent, type SearchResult } from '@/lib/data/search';

export async function searchGlobal(query: string): Promise<SearchResult[]> {
  const user = await getAuthUser();
  return searchLearnerContent(user?.id, query);
}
