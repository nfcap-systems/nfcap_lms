import { connection } from 'next/server';
import { requireAdmin } from '@/lib/actions/guard';
import { getAuditLog } from '@/lib/actions/audit';
import { AuditLogView } from './AuditLogView';

export default async function AdminAuditPage() {
  // Audit entries accrue continuously across every role's actions — same "must stay dynamic"
  // reasoning as src/app/admin/page.tsx's learner roster.
  await connection();
  const admin = await requireAdmin();
  const entries = await getAuditLog(admin);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who did what, and when — funding document views, evidence/document review decisions, WIOA
          case status changes, and course-unlock grants. Read access to this table is itself
          restricted to Admin at the database level (docs/build/PHASE_1_DB_ACCESS_DECISION.md).
        </p>
      </div>
      <AuditLogView entries={entries} />
    </div>
  );
}
