import { connection } from 'next/server';
import { getPathwaySummary } from '@/lib/data/pathway';
import { PathwayListView } from './PathwayListView';

export default async function AdminPathwayListPage() {
  // getPathwaySummary folds in the learner roster (src/lib/data/learners.ts), which comes from
  // Supabase Auth directly and has no revalidatePath hook on signup — see src/app/admin/page.tsx.
  await connection();
  const summary = await getPathwaySummary();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Pathway</h1>
        <p className="mt-1 text-sm text-text-secondary">
          The apprenticeship pathway learners progress through. NFCAP runs one pathway for now
          (docs/product/PRODUCT_CONTEXT.md Section 5).
        </p>
      </div>
      <PathwayListView summary={summary} />
    </div>
  );
}
