import { requireAdmin } from '@/lib/actions/guard';
import { getWioaReportingSummary } from '@/lib/data/wioa';
import { WioaReportsView } from '@/components/wioa/WioaReportsView';

export const dynamic = 'force-dynamic';

/** Admin's own view of the same WIOA reporting data Coordinator sees — spec §2's role table
 * lists "reporting" as an Administrator function alongside managing boards/contacts, and Admin
 * already owns the WorkforceBoard CRUD these board-performance numbers are about. Separate from
 * /admin/analytics, which is the general LMS (courses/learners) analytics placeholder, not WIOA. */
export default async function AdminWioaReportsPage() {
  await requireAdmin();
  const summary = await getWioaReportingSummary({ includeFunding: true });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">WIOA Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pipeline, document readiness, board performance, and follow-up queue across every WIOA
          case.
        </p>
      </div>

      <WioaReportsView summary={summary} />
    </div>
  );
}
