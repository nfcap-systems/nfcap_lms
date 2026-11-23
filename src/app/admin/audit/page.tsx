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

  return <AuditLogView entries={entries} />;
}
