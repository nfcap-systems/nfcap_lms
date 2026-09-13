import { getPathwaySummary } from '@/lib/data/pathway';
import { PathwayListView } from './PathwayListView';

export const dynamic = 'force-dynamic';

export default async function AdminPathwayListPage() {
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
