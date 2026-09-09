'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Card, Select } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { WioaCaseSummary } from '@/lib/data/wioa';
import type { LearnerRecord } from '@/lib/data/learners';
import { WIOA_STATUS_LABEL, WIOA_STATUS_PHASE, WIOA_UI_PHASES } from '@/lib/wioa/status';
import { assignWioaCasePartnerStaff } from '@/lib/actions/wioa';

type PhaseFilter = 'all' | (typeof WIOA_UI_PHASES)[number] | 'Closed';

export function WioaCaseListView({
  cases,
  basePath,
  partnerStaffRoster,
}: {
  cases: WioaCaseSummary[];
  /** '/coordinator' or '/partner' — case detail links and assignment revalidation target. */
  basePath: '/coordinator' | '/partner';
  /** Only passed on the Coordinator dashboard — presence of this prop is what turns on the
   * assignment dropdown (Partner Staff never assigns, only views their own assignment). */
  partnerStaffRoster?: LearnerRecord[];
}) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [followUpOnly, setFollowUpOnly] = useState(false);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (phaseFilter !== 'all' && WIOA_STATUS_PHASE[c.status] !== phaseFilter) return false;
      if (followUpOnly && !isFollowUp(c)) return false;
      return true;
    });
  }, [cases, phaseFilter, followUpOnly]);

  if (cases.length === 0) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-text-secondary">
          No WIOA cases yet — cases open automatically when a learner sends outreach from the
          Funding page.
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
          className="w-auto"
        >
          <option value="all">All phases</option>
          {[...WIOA_UI_PHASES, 'Closed' as const].map((phase) => (
            <option key={phase} value={phase}>
              {phase}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setFollowUpOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            followUpOnly
              ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
              : 'border-border-default text-text-secondary hover:bg-bg-subtle'
          }`}
        >
          <Icon name="clock" className="size-4" />
          Follow-up queue
        </button>
        <span className="text-xs text-text-muted">
          {filtered.length} of {cases.length} case{cases.length === 1 ? '' : 's'}
        </span>
      </div>

      <Card>
        <div className="divide-y divide-border-subtle">
          {filtered.map((c) => (
            <CaseRow key={c.id} c={c} basePath={basePath} partnerStaffRoster={partnerStaffRoster} />
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-text-secondary">
              No cases match this filter.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/** A case needs follow-up when staff sent outreach but hasn't heard back, or the learner
 * submitted documents that haven't been reviewed yet — the two states where a case can silently
 * stall waiting on a human. */
function isFollowUp(c: WioaCaseSummary): boolean {
  return c.status === 'AWAITING_RESPONSE' || c.pendingDocumentCount > 0;
}

function CaseRow({
  c,
  basePath,
  partnerStaffRoster,
}: {
  c: WioaCaseSummary;
  basePath: '/coordinator' | '/partner';
  partnerStaffRoster?: LearnerRecord[];
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);

  async function assign(partnerStaffId: string) {
    setAssigning(true);
    await assignWioaCasePartnerStaff(c.id, partnerStaffId || null);
    setAssigning(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
      <Link href={`${basePath}/${c.id}`} className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{c.learnerName}</p>
        <p className="text-xs text-text-muted">
          {c.courseTitle} · {c.boardName ?? 'No workforce board matched'}
        </p>
      </Link>

      <div className="flex items-center gap-3">
        {isFollowUp(c) && <Badge tone="pending">Follow-up</Badge>}
        {c.pendingDocumentCount > 0 && (
          <Badge tone="pending">{c.pendingDocumentCount} to review</Badge>
        )}
        <Badge tone={c.status === 'CLOSED_INELIGIBLE' ? 'danger' : 'info'}>
          {WIOA_STATUS_LABEL[c.status]}
        </Badge>

        {partnerStaffRoster && (
          <Select
            value={c.assignedPartnerStaffId ?? ''}
            disabled={assigning}
            onChange={(e) => assign(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-auto text-xs"
          >
            <option value="">Unassigned</option>
            {partnerStaffRoster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        {!partnerStaffRoster && c.assignedPartnerStaffName && (
          <span className="text-xs text-text-muted">Assigned: {c.assignedPartnerStaffName}</span>
        )}

        <Link href={`${basePath}/${c.id}`}>
          <Icon name="chevron-right" className="size-4 text-text-muted" />
        </Link>
      </div>
    </div>
  );
}
