import { requireAdmin } from '@/lib/actions/guard';
import { getWioaReportingSummary } from '@/lib/data/wioa';
import { WioaReportsView } from '@/components/wioa/WioaReportsView';

/** Admin's own view of the same WIOA reporting data Coordinator sees — spec §2's role table
 * lists "reporting" as an Administrator function alongside managing boards/contacts, and Admin
 * already owns the WorkforceBoard CRUD these board-performance numbers are about. Separate from
 * /admin/analytics, which is the general LMS (courses/learners) analytics placeholder, not WIOA. */
export default async function AdminWioaReportsPage() {
  const admin = await requireAdmin();
  const summary = await getWioaReportingSummary(
    { userId: admin.id, role: 'ADMIN' },
    { includeFunding: true },
  );

  return <WioaReportsView summary={summary} />;
}
