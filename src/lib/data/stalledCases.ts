import { withRlsContext } from '@/lib/db/rls';
import type { WioaEligibilityStatus } from '@/generated/prisma/enums';

/** Stalled-Case Detection (docs/build/LAYER1_DATA_MODEL_DESIGN.md decision #5 — computed, not
 * stored, because it's entirely derivable from WioaCase.updatedAt + status, and a stored flag
 * would either need a background job this codebase doesn't have, or be wrong the instant time
 * passes without a write). Terminal statuses never count as stalled, no matter how old.
 *
 * The actual threshold (how many days = stalled) is a product decision, not an engineering one
 * (design doc "not designed in this pass") — 14 is CRD05-StalledCases's own board's wording
 * ("3 cases with no movement in 14+ days", Sidebar.dc.html's banner copy) used as a literal
 * default until the client says otherwise; callers may override it. No UI wired to this yet
 * (CRD05-StalledCases is not built, Layer 3C). */
const TERMINAL_STATUSES: WioaEligibilityStatus[] = ['CLOSED_INELIGIBLE', 'WIOA_ELIGIBLE'];
const DEFAULT_STALLED_DAYS = 14;

export type StalledCase = {
  id: string;
  learnerId: string;
  status: WioaEligibilityStatus;
  daysSinceLastMovement: number;
};

export async function getStalledCases(
  viewerId: string,
  role: string,
  stalledAfterDays = DEFAULT_STALLED_DAYS,
): Promise<StalledCase[]> {
  const cutoff = new Date(Date.now() - stalledAfterDays * 24 * 60 * 60 * 1000);

  return withRlsContext({ userId: viewerId, role }, async (tx) => {
    const cases = await tx.wioaCase.findMany({
      where: {
        status: { notIn: TERMINAL_STATUSES },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, learnerId: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });

    const now = Date.now();
    return cases.map((c) => ({
      id: c.id,
      learnerId: c.learnerId,
      status: c.status,
      daysSinceLastMovement: Math.floor((now - c.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
    }));
  });
}
