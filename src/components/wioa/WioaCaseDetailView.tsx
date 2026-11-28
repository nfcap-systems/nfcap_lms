'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Icon } from '@/components/icons';
import {
  setWioaDocumentStatus,
  advanceWioaEligibilityStatus,
  getWioaDocumentUrl,
  getWioaDocumentVersions,
  getWioaDocumentVersionUrl,
  allowAnotherWioaDocumentUpload,
  assignWioaCasePartnerStaff,
  updateWioaFunding,
  type WioaFundingFields,
  type WioaDocumentVersionRecord,
} from '@/lib/actions/wioa';
import { advanceWioaFundingStatus } from '@/lib/actions/wioa';
import type { WioaCaseDetail, WioaDocumentRecord } from '@/lib/data/wioa';
import type { LearnerRecord } from '@/lib/data/learners';
import type {
  WioaEligibilityStatus,
  WioaFundingStatus,
  AppointmentType,
} from '@/generated/prisma/enums';
import {
  WIOA_STATUS_LABEL,
  WIOA_UI_PHASES,
  WIOA_ELIGIBILITY_STATUS_PHASE,
  nextStatusOptions,
  WIOA_FUNDING_STATUS_ORDER,
  WIOA_FUNDING_STATUS_LABEL,
  nextFundingStatusOptions,
} from '@/lib/wioa/status';

type FundingRequest = NonNullable<WioaCaseDetail['fundingRequests']>[number];

const docStatusTone: Record<
  WioaDocumentRecord['status'],
  'success' | 'pending' | 'info' | 'danger' | 'neutral'
> = {
  MISSING: 'neutral',
  UPLOADED: 'info',
  UNDER_REVIEW: 'pending',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  NOT_APPLICABLE: 'neutral',
};

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  ORIENTATION: 'Orientation',
  INTAKE: 'Intake',
  FOLLOWUP: 'Follow-up',
};

const COMMUNICATION_LABEL: Record<'EMAIL' | 'CALL' | 'NOTE', string> = {
  EMAIL: 'Email',
  CALL: 'Call',
  NOTE: 'Note',
};

// Only these two next-statuses ever pair with scheduling an Appointment in the same action
// (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — Appointment is authoritative for the date,
// the case status is a derived label staff sets alongside creating it).
const APPOINTMENT_STATUS_TYPE: Partial<Record<WioaEligibilityStatus, AppointmentType>> = {
  ORIENTATION_SCHEDULED: 'ORIENTATION',
  INTAKE_APPOINTMENT_SCHEDULED: 'INTAKE',
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMoney(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** Splits a two-word-or-more funding status label across two lines for the narrow chevron steps
 * (CLAUDE.local.md #5 — the real WIOA_FUNDING_STATUS_LABEL names are too long for one line at
 * equal chevron widths; this wraps at the natural midpoint instead of inventing a short-label
 * map). */
function wrapLabel(label: string) {
  const words = label.split(' ');
  const mid = Math.ceil(words.length / 2);
  return (
    <>
      {words.slice(0, mid).join(' ')}
      <br />
      {words.slice(mid).join(' ')}
    </>
  );
}

type View = 'overview' | 'documents' | 'history';

export function WioaCaseDetailView({
  wioaCase,
  basePath = '/coordinator',
  partnerStaffRoster,
}: {
  wioaCase: WioaCaseDetail;
  /** '/coordinator' or '/partner' — "All Cases"/"My Cases" breadcrumb back-link target. */
  basePath?: '/coordinator' | '/partner';
  /** Only passed on the Coordinator dashboard — turns on the assignment control. Partner Staff
   * views their assignment read-only via wioaCase.assignedPartnerStaffName. */
  partnerStaffRoster?: LearnerRecord[];
}) {
  const [, startTransition] = useTransition();
  const [view, setView] = useState<View>('overview');

  return (
    <div className="flex flex-col gap-5">
      <CaseCrumb
        wioaCase={wioaCase}
        basePath={basePath}
        view={view}
        onBack={() => setView('overview')}
      />

      <CaseHeader wioaCase={wioaCase} />

      {view === 'documents' && (
        <DocumentsView wioaCase={wioaCase} startTransition={startTransition} />
      )}

      {view === 'history' && <HistoryView wioaCase={wioaCase} />}

      {view === 'overview' && (
        <>
          <EligibilitySection wioaCase={wioaCase} />

          <div className="bodygrid">
            <div>
              <div className="sect-h">
                Course funding — one per course, independently advanceable
              </div>
              {!wioaCase.fundingRequests || wioaCase.fundingRequests.length === 0 ? (
                <p style={{ fontSize: 13.5, color: 'var(--ink-muted)' }}>
                  No course funding request exists yet for this case.
                </p>
              ) : (
                wioaCase.fundingRequests.map((fr) => (
                  <FundingSection key={fr.id} courseCase={fr} />
                ))
              )}
            </div>

            <RightRail
              wioaCase={wioaCase}
              partnerStaffRoster={partnerStaffRoster}
              onOpenDocuments={() => setView('documents')}
              onOpenHistory={() => setView('history')}
            />
          </div>
        </>
      )}
    </div>
  );
}

function CaseCrumb({
  wioaCase,
  basePath,
  view,
  onBack,
}: {
  wioaCase: WioaCaseDetail;
  basePath: '/coordinator' | '/partner';
  view: View;
  onBack: () => void;
}) {
  return (
    <div className="crumbrow">
      <Link href={basePath} style={{ color: 'inherit', textDecoration: 'none' }}>
        {basePath === '/partner' ? 'My Cases' : 'All Cases'}
      </Link>
      <span className="sep">/</span>
      {view === 'overview' ? (
        <span className="cur">{wioaCase.learnerName}</span>
      ) : (
        <>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            {wioaCase.learnerName}
          </button>
          <span className="sep">/</span>
          <span className="cur">{view === 'documents' ? 'Document review' : 'Status history'}</span>
        </>
      )}
    </div>
  );
}

/** The .rhdr header shared by the overview, documents and history views (CRD02/CRD03 redraw,
 * 2026-11-28) — replaces the old .phdr/.pring completion-ring shell for this screen. No course
 * title here (QC finding Q-1/S4 — courses belong to the funding section, not the case header). */
function CaseHeader({ wioaCase }: { wioaCase: WioaCaseDetail }) {
  return (
    <div className="rhdr">
      <div className="rhdr-left">
        <div className="rhdr-avatar">{initials(wioaCase.learnerName)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="rhdr-type">WIOA Case</div>
          <h1 className="rhdr-name">{wioaCase.learnerName}</h1>
          <p className="rhdr-sub">
            {wioaCase.learnerEmail} · Case opened {formatDate(wioaCase.createdAt)}
            {wioaCase.boardName && <> · {wioaCase.boardName}</>}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Eligibility as a step path across its 4 phases (DEMO-1 item 1) — a sibling of each funding
 * path below it (DEMO-2), using the existing WIOA_UI_PHASES/WIOA_ELIGIBILITY_STATUS_PHASE map
 * rather than a new one. A terminal state replaces the path rather than rendering as a step in it
 * (same rule as the funding paths, QC finding Q-2). */
function EligibilitySection({ wioaCase }: { wioaCase: WioaCaseDetail }) {
  const isClosed = wioaCase.status === 'CLOSED_INELIGIBLE';
  const isEligible = wioaCase.status === 'WIOA_ELIGIBLE';
  const phase = WIOA_ELIGIBILITY_STATUS_PHASE[wioaCase.status];
  const phaseIndex = WIOA_UI_PHASES.indexOf(phase as (typeof WIOA_UI_PHASES)[number]);

  return (
    <div>
      <div className="sect-h">Eligibility — one per learner</div>
      {isClosed ? (
        <div className="path-terminal">
          <span>✕</span>
          <span>{WIOA_STATUS_LABEL.CLOSED_INELIGIBLE}</span>
        </div>
      ) : (
        <div className="pathwrap">
          <div className="path">
            {WIOA_UI_PHASES.map((p, i) => (
              <div
                key={p}
                className={`path-step${i < phaseIndex ? ' done' : i === phaseIndex ? ' now' : ''}`}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {isEligible && (
        <p className="path-current" style={{ marginTop: 8 }}>
          <b>WIOA Eligible.</b> No advance control here anymore — everything below is per-course.
        </p>
      )}

      {!isClosed && !isEligible && <StatusCard wioaCase={wioaCase} />}
    </div>
  );
}

function RightRail({
  wioaCase,
  partnerStaffRoster,
  onOpenDocuments,
  onOpenHistory,
}: {
  wioaCase: WioaCaseDetail;
  partnerStaffRoster?: LearnerRecord[];
  onOpenDocuments: () => void;
  onOpenHistory: () => void;
}) {
  const nextAppointment = wioaCase.appointments.find(
    (a) => !a.completedAt && new Date(a.scheduledAt) >= new Date(),
  );
  const docsAwaiting = wioaCase.documents.filter(
    (d) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW',
  ).length;
  const docsAccepted = wioaCase.documents.filter((d) => d.status === 'ACCEPTED').length;

  return (
    <div>
      {partnerStaffRoster ? (
        <div className="rpanel">
          <div className="rpanel-h">
            <span className="left">Assigned Partner Staff</span>
          </div>
          <div className="rpanel-b">
            <AssignmentControl wioaCase={wioaCase} partnerStaffRoster={partnerStaffRoster} />
          </div>
        </div>
      ) : (
        <div className="rpanel">
          <div className="rpanel-h">
            <span className="left">Assigned Partner Staff</span>
          </div>
          <div className="rpanel-b">
            {wioaCase.assignedPartnerStaffName
              ? `Assigned to ${wioaCase.assignedPartnerStaffName}`
              : 'Not yet assigned.'}
          </div>
        </div>
      )}

      <div className="rpanel">
        <div className="rpanel-h">
          <span className="left">
            Documents <span className="cnt">{wioaCase.documents.length}</span>
          </span>
        </div>
        <div className="rpanel-b">
          {wioaCase.documents.length === 0
            ? 'No documents required for this case.'
            : `${docsAccepted} accepted${docsAwaiting > 0 ? `, ${docsAwaiting} awaiting review` : ''}.`}
          <div style={{ marginTop: 9 }}>
            <Button size="sm" variant="outline" onClick={onOpenDocuments}>
              Review documents
            </Button>
          </div>
        </div>
      </div>

      <div className="rpanel">
        <div className="rpanel-h">
          <span className="left">
            Appointments <span className="cnt">{wioaCase.appointments.length}</span>
          </span>
        </div>
        <div className="rpanel-b">
          {nextAppointment
            ? `${formatDate(nextAppointment.scheduledAt)} · ${APPOINTMENT_TYPE_LABEL[nextAppointment.type] ?? nextAppointment.type}`
            : 'No upcoming appointment scheduled.'}
        </div>
      </div>

      <div className="rpanel">
        <div className="rpanel-h">
          <span className="left">Board contact</span>
        </div>
        <div className="rpanel-b">
          {wioaCase.contactName ? (
            <>
              {wioaCase.boardName ?? 'Primary contact'}
              <br />
              {wioaCase.contactName}
            </>
          ) : (
            'No contact matched.'
          )}
        </div>
      </div>

      <div className="rpanel">
        <div className="rpanel-h">
          <span className="left">
            Communications <span className="cnt">{wioaCase.communications.length}</span>
          </span>
        </div>
        <div className="rpanel-b">
          {wioaCase.communications.length === 0
            ? 'No outreach logged yet.'
            : `Last: ${COMMUNICATION_LABEL[wioaCase.communications[0].channel]}, ${formatDate(wioaCase.communications[0].sentAt)}.`}
        </div>
      </div>

      <div className="rpanel">
        <div className="rpanel-h">
          <span className="left">
            Status history <span className="cnt">{wioaCase.statusHistory.length}</span>
          </span>
        </div>
        <div className="rpanel-b">
          Append-only log of every eligibility and funding change.
          <div style={{ marginTop: 9 }}>
            <Button size="sm" variant="outline" onClick={onOpenHistory}>
              View full history
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsView({
  wioaCase,
  startTransition,
}: {
  wioaCase: WioaCaseDetail;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  return (
    <div style={{ paddingTop: 4 }}>
      <p className="rhdr-current">
        Currently <b>{WIOA_STATUS_LABEL[wioaCase.status]}</b>
        {wioaCase.boardName && <> · {wioaCase.boardName}</>}
      </p>
      <div style={{ paddingTop: 14 }}>
        <div className="sect-h">Documents</div>
        <div className="doccard">
          <div className="doccard-head">
            <div className="doccard-title">Required documents</div>
            <div className="doccard-desc">
              {wioaCase.boardName
                ? `${wioaCase.boardName}'s standard checklist`
                : 'Standard checklist'}
              {wioaCase.documents.length > 0 &&
                ` — ${wioaCase.documents.length} requirement${wioaCase.documents.length === 1 ? '' : 's'}`}
            </div>
          </div>
          {wioaCase.documents.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]" style={{ padding: '14px 18px' }}>
              No documents required for this case.
            </p>
          ) : (
            wioaCase.documents.map((doc) => (
              <DocumentReviewRow key={doc.id} doc={doc} startTransition={startTransition} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryView({ wioaCase }: { wioaCase: WioaCaseDetail }) {
  return (
    <div
      style={{ paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1px 320px', gap: 28 }}
    >
      <div>
        <p className="panel-h">Status history</p>
        <p className="panel-sub">
          Every transition this case has recorded, oldest to most recent.
        </p>
        <div className="tl">
          {[...wioaCase.statusHistory].reverse().map((h, i, arr) => {
            const isCurrent = i === arr.length - 1;
            return (
              <div key={h.id} className={isCurrent ? 'tlrow current' : 'tlrow'}>
                <div className="tldot" />
                <div className="tl-status">{WIOA_STATUS_LABEL[h.status]}</div>
                <div className="tl-meta">
                  {formatDate(h.changedAt)} — recorded by {h.changedByName}
                  {isCurrent && ' · current status'}
                </div>
              </div>
            );
          })}
        </div>

        {wioaCase.communications.length > 0 && (
          <div className="border-t border-[var(--nfcap-border)] pt-4 mt-5">
            <p className="mb-2 text-sm font-medium text-[var(--ink)]">Outreach log</p>
            <div className="flex flex-col gap-2">
              {wioaCase.communications.map((c) => (
                <div key={c.id} className="text-sm text-[var(--ink-muted)]">
                  {COMMUNICATION_LABEL[c.channel]}
                  {c.channel !== 'NOTE' && <> to {c.recipient}</>} — {formatDate(c.sentAt)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ov-sep" />

      <div>
        <p className="panel-h" style={{ fontSize: 13.5 }}>
          Why this matters
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          Several of the funding journey&apos;s steps — orientation, CalJOBS, the application,
          the intake appointment and the eligibility decision — happen with the workforce board,
          outside this system. Coordinators record each status here as it&apos;s confirmed; the
          record is never editable after the fact, only appended to.
        </p>
      </div>
    </div>
  );
}

function DocumentReviewRow({
  doc,
  startTransition,
}: {
  doc: WioaDocumentRecord;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [history, setHistory] = useState<WioaDocumentVersionRecord[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function viewFile() {
    try {
      const url = await getWioaDocumentUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the document.');
    }
  }

  async function viewVersion(versionId: string) {
    try {
      const url = await getWioaDocumentVersionUrl(versionId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the document.');
    }
  }

  async function toggleHistory() {
    if (history !== null) {
      setHistory(null);
      return;
    }
    setLoadingHistory(true);
    try {
      setHistory(await getWioaDocumentVersions(doc.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load document history.');
    } finally {
      setLoadingHistory(false);
    }
  }

  function review(status: 'ACCEPTED' | 'REJECTED') {
    startTransition(async () => {
      try {
        await setWioaDocumentStatus(doc.id, status, status === 'REJECTED' ? reason : undefined);
        toast.success(status === 'ACCEPTED' ? 'Document accepted' : 'Document rejected');
        setReviewing(false);
        setReason('');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update the document.');
      }
    });
  }

  function allowAnotherUpload() {
    startTransition(async () => {
      try {
        const result = await allowAnotherWioaDocumentUpload(doc.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success('The learner can upload this document again.');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update the upload limit.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--nfcap-border)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
            <Icon name="file-text" className="size-3.5 shrink-0 text-[var(--ink-muted)]" />
            {doc.requirementName}
          </p>
          {doc.fileName && (
            <button
              type="button"
              onClick={viewFile}
              className="mt-1 flex items-center gap-1.5 text-xs text-[var(--nfcap-accent)] hover:underline"
            >
              <Icon name="paperclip" className="size-3.5" />
              {doc.fileName}
            </button>
          )}
        </div>
        <Badge tone={docStatusTone[doc.status]}>{doc.status.replace('_', ' ')}</Badge>
      </div>

      {(doc.status === 'UPLOADED' || doc.status === 'UNDER_REVIEW') && (
        <>
          {reviewing ? (
            <div className="flex flex-col gap-2">
              <Field label="Rejection reason" htmlFor={`reason-${doc.id}`}>
                <Textarea
                  id={`reason-${doc.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => review('REJECTED')}>
                  Confirm reject
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReviewing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review('ACCEPTED')}>
                <Icon name="check" className="size-4" />
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReviewing(true)}>
                <Icon name="x" className="size-4" />
                Reject
              </Button>
            </div>
          )}
        </>
      )}

      {doc.isCapped && (
        <div className="flex flex-col gap-2 rounded-md border border-[var(--status-problem)] bg-[var(--status-problem-bg)] p-2">
          <p className="text-xs text-[var(--status-problem)]">
            Upload limit reached — the learner can no longer resubmit this document on their own.
          </p>
          <Button size="sm" variant="outline" onClick={allowAnotherUpload}>
            Allow another upload
          </Button>
        </div>
      )}

      {doc.status !== 'MISSING' && doc.status !== 'NOT_APPLICABLE' && (
        <div>
          <button
            type="button"
            onClick={toggleHistory}
            className="text-xs text-[var(--ink-muted)] hover:underline"
          >
            {loadingHistory
              ? 'Loading history…'
              : history === null
                ? 'View past versions'
                : 'Hide past versions'}
          </button>
          {history !== null && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {history.length === 0 && (
                <li className="text-xs text-[var(--ink-muted)]">No earlier versions.</li>
              )}
              {history.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--nfcap-border)] bg-[var(--surface-muted)] p-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => viewVersion(v.id)}
                      className="flex items-center gap-1.5 text-xs text-[var(--nfcap-accent)] hover:underline"
                    >
                      <Icon name="paperclip" className="size-3.5" />
                      {v.fileName}
                    </button>
                    <span className="text-[11px] text-[var(--ink-muted)]">
                      Uploaded{' '}
                      {v.uploadedAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {v.status === 'REJECTED' && v.rejectionReason && (
                      <span className="text-[11px] text-[var(--status-problem)]">
                        {v.rejectionReason}
                      </span>
                    )}
                  </div>
                  <Badge tone={docStatusTone[v.status]}>{v.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentControl({
  wioaCase,
  partnerStaffRoster,
}: {
  wioaCase: WioaCaseDetail;
  partnerStaffRoster: LearnerRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function assign(partnerStaffId: string) {
    startTransition(async () => {
      try {
        await assignWioaCasePartnerStaff(wioaCase.id, partnerStaffId || null);
        toast.success(partnerStaffId ? 'Case assigned' : 'Case unassigned');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update the assignment.');
      }
    });
  }

  return (
    <Select
      id="assignedPartnerStaff"
      value={wioaCase.assignedPartnerStaffId ?? ''}
      disabled={pending}
      onChange={(e) => assign(e.target.value)}
    >
      <option value="">Unassigned</option>
      {partnerStaffRoster.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

/** yyyy-MM-ddThh:mm for <input type="datetime-local">, or '' when unset. */
function toDatetimeLocal(value: Date | string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
}

/** yyyy-MM-dd for <input type="date">, or '' when unset. */
function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

/** One course's funding pipeline: the step path (DEMO-1 item 2 — a sibling of the eligibility
 * path), the step-advance control (DEMO-3/A2) docked right below it (DEMO-1 item 3), and the
 * ETPL/funding milestone fields (DEMO-3/A4) presented as attribute rows under the step they
 * belong to. One instance per entry in `wioaCase.fundingRequests` (DEMO-3/A3) — no more pinning
 * to the first course case. */
function FundingSection({ courseCase }: { courseCase: FundingRequest }) {
  // FUNDING_DECLINED is a terminal branch, not the furthest step in the linear order — it must
  // replace the path, never render as "Step 5 of 5" (QC finding Q-2).
  const isDeclined = courseCase.status === 'FUNDING_DECLINED';
  const isClosed = isDeclined || courseCase.status === 'APPRENTICESHIP_ENROLLMENT_COMPLETE';
  const linearStatuses: WioaFundingStatus[] = WIOA_FUNDING_STATUS_ORDER.filter(
    (s) => s !== 'FUNDING_DECLINED',
  );
  const linearIndex = linearStatuses.indexOf(courseCase.status);
  const requestedAmount = formatMoney(courseCase.funding?.requestedAmount);

  return (
    <div className="ccard">
      <div className="ccard-h">
        <div>
          <div className="ccard-title">{courseCase.courseTitle}</div>
          <div className="ccard-meta">
            Requested {formatDate(courseCase.createdAt)}
            {requestedAmount ? ` · ${requestedAmount} requested` : ' · amount not yet set'}
          </div>
        </div>
        <span className="ccase-tag">{isClosed ? 'Closed' : 'Open'}</span>
      </div>
      <div className="ccard-body">
        {isDeclined ? (
          <div className="path-terminal">
            <span>✕</span>
            <span>Funding Declined</span>
          </div>
        ) : (
          <div className="pathwrap">
            <div className="path sm">
              {linearStatuses.map((s, i) => (
                <div
                  key={s}
                  className={`path-step wrap2${i < linearIndex ? ' done' : i === linearIndex ? ' now' : ''}`}
                >
                  {wrapLabel(WIOA_FUNDING_STATUS_LABEL[s])}
                </div>
              ))}
            </div>
          </div>
        )}

        <FundingAdvanceControl courseCase={courseCase} />
        <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '14px 0' }} />
        <FundingDetailsSection courseCase={courseCase} />
      </div>
    </div>
  );
}

/** DEMO-3/A2 — the funding advance control, docked directly under the step path it drives
 * (DEMO-1 item 3 — out of the old Status history tab). Next statuses only ever come from
 * `nextFundingStatusOptions`, never a free list of all five. Errors are shown inline from
 * `result.ok === false` (DEMO-3/A1, CLAUDE.md's error-handling convention), not via try/catch. */
function FundingAdvanceControl({ courseCase }: { courseCase: FundingRequest }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const options = nextFundingStatusOptions(courseCase.status);
  const [nextStatus, setNextStatus] = useState<WioaFundingStatus | ''>('');
  const [scheduleAppointment, setScheduleAppointment] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (options.length === 0) {
    return (
      <p className="path-current" style={{ marginTop: 10 }}>
        This funding request is closed — no further status change is possible.
      </p>
    );
  }

  function advance() {
    if (!nextStatus) return;
    setError('');
    startTransition(async () => {
      const result = await advanceWioaFundingStatus(
        courseCase.id,
        nextStatus,
        scheduleAppointment && scheduledAt ? { scheduledAt, notes: notes || undefined } : undefined,
      );
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Funding status updated');
      setNextStatus('');
      setScheduleAppointment(false);
      setScheduledAt('');
      setNotes('');
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          Advance
        </Button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }} className="flex flex-col gap-3">
      <Field
        label="New funding status"
        htmlFor={`fundingStatus-${courseCase.id}`}
        error={error || undefined}
      >
        <Select
          id={`fundingStatus-${courseCase.id}`}
          value={nextStatus}
          onChange={(e) => {
            setError('');
            setNextStatus(e.target.value as WioaFundingStatus);
          }}
        >
          <option value="">Select next status</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {WIOA_FUNDING_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>

      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
        <input
          type="checkbox"
          checked={scheduleAppointment}
          onChange={(e) => setScheduleAppointment(e.target.checked)}
        />
        Schedule a follow-up appointment
      </label>

      {scheduleAppointment && (
        <>
          <Field label="Appointment date/time" htmlFor={`fundingAppt-${courseCase.id}`}>
            <Input
              id={`fundingAppt-${courseCase.id}`}
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Field>
          <Field label="Notes (optional)" htmlFor={`fundingApptNotes-${courseCase.id}`}>
            <Textarea
              id={`fundingApptNotes-${courseCase.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </Field>
        </>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={!nextStatus || pending} onClick={advance} className="w-fit">
          {pending ? 'Saving…' : 'Save funding status'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="w-fit">
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** DEMO-3/A4 — the 12 ETPL/funding fields as attribute rows under the step above, read-only by
 * default (the CRD02 board's presentation) with an explicit Edit control that swaps in the real
 * form; still saves through `updateWioaFunding`, keyed to this course case's id (DEMO-3/A3). */
function FundingDetailsSection({ courseCase }: { courseCase: FundingRequest }) {
  const [editing, setEditing] = useState(false);
  const funding = courseCase.funding;
  const auth = funding?.authorization;

  if (editing) {
    return <FundingDetailsForm courseCase={courseCase} onDone={() => setEditing(false)} />;
  }

  return (
    <div>
      <div className="grp">
        <div className="grp-h">
          <span>Training request</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-[var(--nfcap-accent)] hover:underline"
          >
            Edit
          </button>
        </div>
        <div className="arow">
          <span className="k">Training program</span>
          <span className={funding?.trainingProgram ? 'v' : 'v empty'}>
            {funding?.trainingProgram || 'Not set'}
          </span>
        </div>
        <div className="arow">
          <span className="k">ETPL provider confirmed</span>
          <span className="v">{funding?.etplProviderConfirmed ? 'Yes' : 'No'}</span>
        </div>
        <div className="arow">
          <span className="k">Submitted</span>
          <span className={funding?.submittedAt ? 'v' : 'v empty'}>
            {funding?.submittedAt ? formatDate(funding.submittedAt) : 'Not yet submitted'}
          </span>
        </div>
        <div className="arow">
          <span className="k">Case manager notified</span>
          <span className={funding?.caseManagerNotifiedAt ? 'v' : 'v empty'}>
            {funding?.caseManagerNotifiedAt ? formatDate(funding.caseManagerNotifiedAt) : 'Not yet notified'}
          </span>
        </div>
        <div className="arow">
          <span className="k">Requested amount</span>
          <span className={funding?.requestedAmount != null ? 'v' : 'v empty'}>
            {formatMoney(funding?.requestedAmount) ?? 'Not set'}
          </span>
        </div>
        <div className="arow">
          <span className="k">Funding review status</span>
          <span className={funding?.fundingReviewStatus ? 'v' : 'v empty'}>
            {funding?.fundingReviewStatus || 'Not set'}
          </span>
        </div>
      </div>

      <div className="grp">
        <div className="grp-h">
          <span>Authorization</span>
        </div>
        <div className="arow">
          <span className="k">ITA issued</span>
          <span className={auth?.itaIssuedAt ? 'v' : 'v empty'}>
            {auth?.itaIssuedAt ? formatDate(auth.itaIssuedAt) : 'Not yet issued'}
          </span>
        </div>
        <div className="arow">
          <span className="k">Approved amount</span>
          <span className={auth?.approvedAmount != null ? 'v' : 'v empty'}>
            {formatMoney(auth?.approvedAmount) ?? 'Pending approval'}
          </span>
        </div>
        <div className="arow">
          <span className="k">Approval date</span>
          <span className={auth?.approvalDate ? 'v' : 'v empty'}>
            {auth?.approvalDate ? formatDate(auth.approvalDate) : 'Not yet approved'}
          </span>
        </div>
        <div className="arow">
          <span className="k">Training start date</span>
          <span className={auth?.trainingStartDate ? 'v' : 'v empty'}>
            {auth?.trainingStartDate ? formatDate(auth.trainingStartDate) : 'Not set'}
          </span>
        </div>
        <div className="arow">
          <span className="k">Authorization status</span>
          <span className={auth?.status ? 'v' : 'v empty'}>{auth?.status || 'Not set'}</span>
        </div>
      </div>
    </div>
  );
}

function FundingDetailsForm({
  courseCase,
  onDone,
}: {
  courseCase: FundingRequest;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const funding = courseCase.funding;
  const auth = funding?.authorization;

  const [trainingProgram, setTrainingProgram] = useState(funding?.trainingProgram ?? '');
  const [etplProviderConfirmed, setEtplProviderConfirmed] = useState(
    funding?.etplProviderConfirmed ?? false,
  );
  const [submittedAt, setSubmittedAt] = useState(toDatetimeLocal(funding?.submittedAt));
  const [caseManagerNotifiedAt, setCaseManagerNotifiedAt] = useState(
    toDatetimeLocal(funding?.caseManagerNotifiedAt),
  );
  const [requestedAmount, setRequestedAmount] = useState(
    funding?.requestedAmount != null ? String(funding.requestedAmount) : '',
  );
  const [fundingReviewStatus, setFundingReviewStatus] = useState(
    funding?.fundingReviewStatus ?? '',
  );
  const [requestStatus, setRequestStatus] = useState(funding?.status ?? '');
  const [itaIssuedAt, setItaIssuedAt] = useState(toDatetimeLocal(auth?.itaIssuedAt));
  const [approvedAmount, setApprovedAmount] = useState(
    auth?.approvedAmount != null ? String(auth.approvedAmount) : '',
  );
  const [approvalDate, setApprovalDate] = useState(toDateInput(auth?.approvalDate));
  const [trainingStartDate, setTrainingStartDate] = useState(toDateInput(auth?.trainingStartDate));
  const [authorizationStatus, setAuthorizationStatus] = useState(auth?.status ?? '');
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    const fields: WioaFundingFields = {
      trainingProgram: trainingProgram || undefined,
      etplProviderConfirmed,
      submittedAt: submittedAt || undefined,
      caseManagerNotifiedAt: caseManagerNotifiedAt || undefined,
      requestedAmount: requestedAmount ? Number(requestedAmount) : undefined,
      fundingReviewStatus: fundingReviewStatus || undefined,
      requestStatus: requestStatus || undefined,
      itaIssuedAt: itaIssuedAt || undefined,
      approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
      approvalDate: approvalDate || undefined,
      trainingStartDate: trainingStartDate || undefined,
      authorizationStatus: authorizationStatus || undefined,
    };
    startTransition(async () => {
      const result = await updateWioaFunding(courseCase.id, fields);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Funding details saved');
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grp-h" style={{ marginTop: 0 }}>
        <span>Funding &amp; authorization details</span>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-[var(--ink-muted)] hover:underline"
        >
          Cancel
        </button>
      </div>
      <Field label="Training program" htmlFor={`trainingProgram-${courseCase.id}`}>
        <Input
          id={`trainingProgram-${courseCase.id}`}
          value={trainingProgram}
          onChange={(e) => setTrainingProgram(e.target.value)}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
        <input
          type="checkbox"
          checked={etplProviderConfirmed}
          onChange={(e) => setEtplProviderConfirmed(e.target.checked)}
        />
        ETPL provider confirmed
      </label>

      <Field label="Request submitted at" htmlFor={`submittedAt-${courseCase.id}`}>
        <Input
          id={`submittedAt-${courseCase.id}`}
          type="datetime-local"
          value={submittedAt}
          onChange={(e) => setSubmittedAt(e.target.value)}
        />
      </Field>
      <Field label="Case manager notified at" htmlFor={`caseManagerNotifiedAt-${courseCase.id}`}>
        <Input
          id={`caseManagerNotifiedAt-${courseCase.id}`}
          type="datetime-local"
          value={caseManagerNotifiedAt}
          onChange={(e) => setCaseManagerNotifiedAt(e.target.value)}
        />
      </Field>
      <Field
        label="Requested amount"
        htmlFor={`requestedAmount-${courseCase.id}`}
        hint="What was asked for, before the board's own approved amount below"
      >
        <Input
          id={`requestedAmount-${courseCase.id}`}
          type="number"
          min="0"
          step="0.01"
          value={requestedAmount}
          onChange={(e) => setRequestedAmount(e.target.value)}
        />
      </Field>
      <Field label="Funding review status" htmlFor={`fundingReviewStatus-${courseCase.id}`}>
        <Input
          id={`fundingReviewStatus-${courseCase.id}`}
          value={fundingReviewStatus}
          onChange={(e) => setFundingReviewStatus(e.target.value)}
          placeholder="e.g. Pending, Approved, Denied"
        />
      </Field>
      <Field label="Request status" htmlFor={`requestStatus-${courseCase.id}`}>
        <Input
          id={`requestStatus-${courseCase.id}`}
          value={requestStatus}
          onChange={(e) => setRequestStatus(e.target.value)}
        />
      </Field>

      <div className="border-t border-[var(--nfcap-border)] pt-4">
        <p className="mb-3 text-sm font-medium text-[var(--ink)]">Authorization</p>
        <div className="flex flex-col gap-4">
          <Field label="ITA issued at" htmlFor={`itaIssuedAt-${courseCase.id}`}>
            <Input
              id={`itaIssuedAt-${courseCase.id}`}
              type="datetime-local"
              value={itaIssuedAt}
              onChange={(e) => setItaIssuedAt(e.target.value)}
            />
          </Field>
          <Field label="Approved amount" htmlFor={`approvedAmount-${courseCase.id}`}>
            <Input
              id={`approvedAmount-${courseCase.id}`}
              type="number"
              min="0"
              step="0.01"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
            />
          </Field>
          <Field label="Approval date" htmlFor={`approvalDate-${courseCase.id}`}>
            <Input
              id={`approvalDate-${courseCase.id}`}
              type="date"
              value={approvalDate}
              onChange={(e) => setApprovalDate(e.target.value)}
            />
          </Field>
          <Field label="Training start date" htmlFor={`trainingStartDate-${courseCase.id}`}>
            <Input
              id={`trainingStartDate-${courseCase.id}`}
              type="date"
              value={trainingStartDate}
              onChange={(e) => setTrainingStartDate(e.target.value)}
            />
          </Field>
          <Field label="Authorization status" htmlFor={`authorizationStatus-${courseCase.id}`}>
            <Input
              id={`authorizationStatus-${courseCase.id}`}
              value={authorizationStatus}
              onChange={(e) => setAuthorizationStatus(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {error && <p className="text-xs text-[var(--status-problem)]">{error}</p>}

      <Button size="sm" disabled={pending} onClick={save} className="w-fit">
        {pending ? 'Saving…' : 'Save funding details'}
      </Button>
    </div>
  );
}

/** DEMO-1 item 3 — the eligibility advance control, docked directly with the path it drives
 * instead of living in the old Status history tab. */
function StatusCard({ wioaCase }: { wioaCase: WioaCaseDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const options = nextStatusOptions(wioaCase.status);
  const [nextStatus, setNextStatus] = useState<WioaEligibilityStatus | ''>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const appointmentType = nextStatus ? APPOINTMENT_STATUS_TYPE[nextStatus] : undefined;

  if (options.length === 0) return null;

  function advance() {
    if (!nextStatus) return;
    setError('');
    startTransition(async () => {
      const result = await advanceWioaEligibilityStatus(
        wioaCase.id,
        nextStatus,
        appointmentType && scheduledAt
          ? { type: appointmentType, scheduledAt, notes: notes || undefined }
          : undefined,
      );
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Case status updated');
      setNextStatus('');
      setScheduledAt('');
      setNotes('');
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div style={{ marginTop: 8 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          Advance
        </Button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }} className="flex flex-col gap-3">
      <Field label="New status" htmlFor="nextStatus" error={error || undefined}>
        <Select
          id="nextStatus"
          value={nextStatus}
          onChange={(e) => {
            setError('');
            setNextStatus(e.target.value as WioaEligibilityStatus);
          }}
        >
          <option value="">Select next status</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {WIOA_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>

      {appointmentType && (
        <>
          <Field label="Appointment date/time" htmlFor="scheduledAt">
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Field>
          <Field label="Notes (optional)" htmlFor="apptNotes">
            <Textarea
              id="apptNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </Field>
        </>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={!nextStatus || pending} onClick={advance} className="w-fit">
          {pending ? 'Saving…' : 'Save status'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="w-fit">
          Cancel
        </Button>
      </div>
    </div>
  );
}
