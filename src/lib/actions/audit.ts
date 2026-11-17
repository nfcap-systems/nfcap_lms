import { prisma } from '@/lib/prisma';
import { withRlsContext } from '@/lib/db/rls';
import type { Prisma } from '@/generated/prisma/client';
import type { User } from '@supabase/supabase-js';
import { getRole } from '@/lib/supabase/server';

/** Platform-Wide Audit Trail (docs/client/NFCAP_LMS_Feature_Detail_Client.md: "Record who did
 * what and when across sensitive activity... producing a defensible compliance record").
 * Append-only by convention (no update/delete call anywhere in this file, and the AuditLog RLS
 * policy only defines SELECT/INSERT — see prisma/migrations/20261105130000_pathway_audit_ratelimit).
 *
 * Writes go through the plain `prisma` client, not `withRlsContext` — the INSERT policy is
 * `WITH CHECK (true)` precisely so a log entry can be written from any authenticated action
 * without the overhead of opening an RLS transaction just to append one row. */
export async function logAuditEvent(params: {
  actor: User | 'system';
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { actor, action, targetType, targetId, metadata } = params;
  await prisma.auditLog.create({
    data: {
      actorId: actor === 'system' ? 'system' : actor.id,
      actorRole: actor === 'system' ? 'SYSTEM' : getRole(actor) ?? 'UNKNOWN',
      action,
      targetType,
      targetId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export type AuditLogEntry = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: Date;
};

/** Admin-only read (enforced twice: `requireAdmin()` at the call site in
 * src/app/admin/audit/page.tsx, and the AuditLog SELECT policy itself — this function supplies
 * the ADMIN role to that second layer instead of silently relying on the first). */
export async function getAuditLog(admin: User, limit = 200): Promise<AuditLogEntry[]> {
  return withRlsContext({ userId: admin.id, role: getRole(admin) ?? '' }, (tx) =>
    tx.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
  );
}
