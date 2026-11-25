import { prisma } from '@/lib/prisma';
import { deleteWioaDocumentFile } from '@/lib/supabase/wioa-storage';
import { logAuditEvent } from './audit';

/** Data Retention & Destruction Policy (docs/build/PHASE_1_DATA_RETENTION.md). Retention period
 * is still TBD (per the client scope doc's own note on this feature) — held as an env var so it
 * changes without a code deploy. `RETENTION_MONTHS_DEFAULT` is a placeholder, not an agreed
 * number; do not treat it as the real policy until docs/build/PHASE_1_DATA_RETENTION.md says so. */
const RETENTION_MONTHS_DEFAULT = 36;

function retentionWindowMonths(): number {
  const raw = process.env.DATA_RETENTION_MONTHS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : RETENTION_MONTHS_DEFAULT;
}

export type RetentionSweepResult = {
  retentionMonths: number;
  casesSwept: number;
  documentsDestroyed: number;
};

/** Destroys the uploaded document *files* (the actual identity-document content — SSN cards, ID,
 * EDD letters, per src/lib/supabase/wioa-storage.ts) for master cases closed (CLOSED_INELIGIBLE)
 * longer ago than the retention window, and clears any free-text fields that could carry PII.
 * Documents live on the master case, not a course-case
 * (docs/plans/wioa-spec-alignment-kickoff.md #1, full split) — eligibility documents are shared
 * across every funding request a learner makes, so they're only ever destroyed when the student's
 * WIOA relationship itself closes, not when one course's funding closes. Deliberately does NOT
 * delete the WioaCase/WioaStatusHistory rows themselves — those are the compliance record this
 * whole module exists to produce, and destroying them would defeat the Audit Trail feature right
 * next to this one. Every destroyed document is individually logged to AuditLog, not just a
 * summary count, so the log stays a real record of what was destroyed and when. */
export async function runDataRetentionSweep(): Promise<RetentionSweepResult> {
  const retentionMonths = retentionWindowMonths();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);

  const eligibleCases = await prisma.wioaCase.findMany({
    where: {
      status: 'CLOSED_INELIGIBLE',
      closedAt: { lt: cutoff },
    },
    select: {
      id: true,
      documents: {
        select: {
          id: true,
          storagePath: true,
          versions: { where: { storagePath: { not: '' } }, select: { id: true, storagePath: true } },
        },
      },
    },
  });

  let documentsDestroyed = 0;

  for (const wioaCase of eligibleCases) {
    for (const doc of wioaCase.documents) {
      for (const version of doc.versions) {
        await deleteWioaDocumentFile(version.storagePath);
        await prisma.wioaDocumentVersion.update({
          where: { id: version.id },
          data: { storagePath: '', fileName: '(destroyed by retention policy)' },
        });
        await logAuditEvent({
          actor: 'system',
          action: 'DATA_RETENTION_DESTROY_DOCUMENT_VERSION',
          targetType: 'WioaDocumentVersion',
          targetId: version.id,
          metadata: { wioaCaseId: wioaCase.id, retentionMonths },
        });
        documentsDestroyed += 1;
      }

      if (!doc.storagePath) continue;
      await deleteWioaDocumentFile(doc.storagePath);
      await prisma.wioaDocument.update({
        where: { id: doc.id },
        data: { storagePath: null, fileName: null, notes: null },
      });
      await logAuditEvent({
        actor: 'system',
        action: 'DATA_RETENTION_DESTROY_DOCUMENT',
        targetType: 'WioaDocument',
        targetId: doc.id,
        metadata: { wioaCaseId: wioaCase.id, retentionMonths },
      });
      documentsDestroyed += 1;
    }
  }

  return { retentionMonths, casesSwept: eligibleCases.length, documentsDestroyed };
}
