'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CompletionRing,
  Field,
  Input,
  ProfileHeader,
  ProfileTabs,
  Select,
  Textarea,
} from '@/components/ui';
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
  WIOA_STATUS_PHASE,
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

const COMMUNICATION_ICON: Record<'EMAIL' | 'CALL' | 'NOTE', 'mail' | 'phone' | 'file-text'> = {
  EMAIL: 'mail',
  CALL: 'phone',
  NOTE: 'file-text',
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

type Tab = 'overview' | 'documents' | 'history';

export function WioaCaseDetailView({
  wioaCase,
  basePath,
  partnerStaffRoster,
}: {
  wioaCase: WioaCaseDetail;
  /** '/coordinator' or '/partner' — breadcrumb back-link target. */
  basePath: '/coordinator' | '/partner';
  /** Only passed on the Coordinator dashboard — turns on the assignment control. Partner Staff
   * views their assignment read-only via wioaCase.assignedPartnerStaffName. */
  partnerStaffRoster?: LearnerRecord[];
}) {
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>('overview');
  const phase = WIOA_STATUS_PHASE[wioaCase.status];
  const lastStatusChange = wioaCase.statusHistory[0]?.changedAt ?? wioaCase.createdAt;
  const nextAppointment = wioaCase.appointments.find(
    (a) => !a.completedAt && new Date(a.scheduledAt) >= new Date(),
  );
  // Funding enrollment-complete is now a per-course fact, not an eligibility-case one
  // (docs/plans/wioa-spec-alignment-kickoff.md #1) — 100% once any funding request reaches it.
  const pathwayPercent = wioaCase.fundingRequests?.some(
    (f) => f.status === 'APPRENTICESHIP_ENROLLMENT_COMPLETE',
  )
    ? 100
    : wioaCase.status === 'CLOSED_INELIGIBLE'
      ? 0
      : 50;

  return (
    <div className="flex flex-col gap-5">
      <div className="crumbrow">
        <Link href={basePath} style={{ color: 'inherit', textDecoration: 'none' }}>
          All Cases
        </Link>
        <span className="sep">/</span>
        <span>{wioaCase.learnerName}</span>
        <span className="sep">/</span>
        <span className="cur">Case details</span>
      </div>

      <ProfileHeader
        left={
          <>
            <CompletionRing percentage={pathwayPercent} initials={initials(wioaCase.learnerName)} />
            <div style={{ minWidth: 0 }}>
              <h1 className="phdr-name">{wioaCase.learnerName}</h1>
              <p className="phdr-sub">
                {wioaCase.learnerEmail} · Case opened {formatDate(wioaCase.createdAt)}
              </p>
              <div className="pbadges">
                <Badge tone="info" style={{ fontSize: 11.5 }}>
                  {phase}
                </Badge>
                <span className="pbadge">{WIOA_STATUS_LABEL[wioaCase.status]}</span>
                {wioaCase.boardName && <span className="pbadge">{wioaCase.boardName}</span>}
              </div>
            </div>
          </>
        }
      />

      <ProfileTabs
        tabs={[
          { key: 'overview', label: 'Overview' },
          {
            key: 'documents',
            label: `Documents${wioaCase.documents.length > 0 ? ` (${wioaCase.documents.length})` : ''}`,
          },
          { key: 'history', label: 'Status history' },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {tab === 'overview' && (
        <div className="ov-grid" style={{ paddingTop: 4 }}>
          <div>
            <div className="ov-h">Case summary</div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-muted)',
                lineHeight: 1.6,
                margin: '0 0 20px',
              }}
            >
              {wioaCase.learnerName.split(' ')[0]}&apos;s case is in the{' '}
              <strong style={{ color: 'var(--ink)' }}>{phase}</strong> phase (
              {WIOA_STATUS_LABEL[wioaCase.status]}); last status change was{' '}
              {formatDate(lastStatusChange)}.
            </p>

            <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '0 0 20px' }} />

            <div className="ov-h">Case details</div>
            <div className="ov-detgrid" style={{ marginBottom: 20 }}>
              <div className="ov-detcol">
                <div className="ov-field">
                  <span className="ov-sub">Case ID</span>
                  <span className="ov-val">{wioaCase.id}</span>
                </div>
                <div className="ov-field">
                  <span className="ov-sub">Course / pathway</span>
                  <span className="ov-val">{wioaCase.courseTitle}</span>
                </div>
              </div>
              <div className="ov-detcol">
                <div className="ov-field">
                  <span className="ov-sub">Workforce board</span>
                  <span className="ov-val">
                    {wioaCase.boardName ?? 'No workforce board matched'}
                  </span>
                </div>
                <div className="ov-field">
                  <span className="ov-sub">AJCC center</span>
                  <span className="ov-val">{wioaCase.ajccName ?? '—'}</span>
                </div>
              </div>
              <div className="ov-detcol">
                <div className="ov-field">
                  <span className="ov-sub">Case opened</span>
                  <span className="ov-val">{formatDate(wioaCase.createdAt)}</span>
                </div>
                <div className="ov-field">
                  <span className="ov-sub">Last status change</span>
                  <span className="ov-val">{formatDate(lastStatusChange)}</span>
                </div>
              </div>
            </div>

            {partnerStaffRoster && (
              <div style={{ marginTop: 20 }}>
                <div className="ov-h">Assignment</div>
                <AssignmentControl wioaCase={wioaCase} partnerStaffRoster={partnerStaffRoster} />
              </div>
            )}
            {!partnerStaffRoster && (
              <div style={{ marginTop: 20 }}>
                <div className="ov-h">Assignment</div>
                <p style={{ fontSize: 13.5, color: 'var(--ink-muted)' }}>
                  {wioaCase.assignedPartnerStaffName
                    ? `Assigned to ${wioaCase.assignedPartnerStaffName}`
                    : 'Not yet assigned to a Partner Staff account.'}
                </p>
              </div>
            )}

            {partnerStaffRoster && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="ov-h">Funding</div>
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
            )}
          </div>

          <div className="ov-sep" />

          <div>
            <div className="ov-h" style={{ fontSize: 13.5 }}>
              Board contact
            </div>
            {wioaCase.contactName ? (
              <div className="side-row" style={{ paddingTop: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--surface-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    flexShrink: 0,
                  }}
                >
                  {initials(wioaCase.contactName)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                    {wioaCase.contactName}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                    {wioaCase.boardName ?? 'Primary contact'}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '0 0 0' }}>
                No contact matched.
              </p>
            )}

            <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '14px 0' }} />

            <div className="ov-h" style={{ fontSize: 13.5 }}>
              Upcoming appointment
            </div>
            {nextAppointment ? (
              <div className="side-row">
                <Icon name="clock" className="side-ic" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                    {formatDate(nextAppointment.scheduledAt)} ·{' '}
                    {APPOINTMENT_TYPE_LABEL[nextAppointment.type] ?? nextAppointment.type}
                  </div>
                  {nextAppointment.notes && (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                      {nextAppointment.notes}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                No upcoming appointment scheduled.
              </p>
            )}

            <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '14px 0' }} />

            <div className="ov-h" style={{ fontSize: 13.5 }}>
              Recent communications
            </div>
            {wioaCase.communications.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No outreach logged yet.</p>
            ) : (
              wioaCase.communications.slice(0, 2).map((c, i) => (
                <div
                  className="side-row"
                  key={c.id}
                  style={i === 0 ? { paddingTop: 0 } : undefined}
                >
                  <Icon name={COMMUNICATION_ICON[c.channel]} className="side-ic" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {formatDate(c.sentAt)} — {COMMUNICATION_LABEL[c.channel]}
                      {c.channel !== 'NOTE' && <> to {c.recipient}</>}
                    </div>
                    {c.subject && (
                      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{c.subject}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="doccard" style={{ marginTop: 18 }}>
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
      )}

      {tab === 'history' && (
        <div
          style={{ paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1px 320px', gap: 28 }}
        >
          <div>
            <Card style={{ marginBottom: 24 }}>
              <CardContent>
                <StatusCard wioaCase={wioaCase} />
              </CardContent>
            </Card>

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
      )}
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
    <Field label="Assigned Partner Staff" htmlFor="assignedPartnerStaff">
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
    </Field>
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

/** One course's funding pipeline: the step-advance control (DEMO-3/A2) plus the ETPL/funding
 * milestone fields (DEMO-3/A4) presented underneath the step they belong to, so it's unambiguous
 * which control actually moves the case (the enum, not the form). One instance per entry in
 * `wioaCase.fundingRequests` (DEMO-3/A3) — no more pinning to the first course case. */
function FundingSection({ courseCase }: { courseCase: FundingRequest }) {
  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <CardTitle>{courseCase.courseTitle}</CardTitle>
          <span className="pbadge">{WIOA_FUNDING_STATUS_LABEL[courseCase.status]}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FundingAdvanceControl courseCase={courseCase} />
        <div style={{ height: 1, background: 'var(--nfcap-border)' }} />
        <FundingDetailsForm courseCase={courseCase} />
      </CardContent>
    </Card>
  );
}

/** DEMO-3/A2 — the funding advance control, one per course case. Next statuses only ever come
 * from `nextFundingStatusOptions`, never a free list of all five. Errors are shown inline from
 * `result.ok === false` (DEMO-3/A1, CLAUDE.md's error-handling convention), not via try/catch. */
function FundingAdvanceControl({ courseCase }: { courseCase: FundingRequest }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = nextFundingStatusOptions(courseCase.status);
  const stepIndex = WIOA_FUNDING_STATUS_ORDER.indexOf(courseCase.status);
  const [nextStatus, setNextStatus] = useState<WioaFundingStatus | ''>('');
  const [scheduleAppointment, setScheduleAppointment] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

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
      router.refresh();
    });
  }

  return (
    <div>
      <p className="panel-sub" style={{ margin: '0 0 10px' }}>
        {stepIndex >= 0 && `Step ${stepIndex + 1} of ${WIOA_FUNDING_STATUS_ORDER.length}`}
      </p>
      {options.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
          This funding request is closed — no further status change is possible.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
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

          <Button size="sm" disabled={!nextStatus || pending} onClick={advance} className="w-fit">
            {pending ? 'Saving…' : 'Save funding status'}
          </Button>
        </div>
      )}
    </div>
  );
}

/** DEMO-3/A4 — the 12 ETPL/funding fields as attributes recorded against the step above, not a
 * flat form that advances anything itself. Saves via updateWioaFunding, keyed to this course
 * case's id (DEMO-3/A3 — no more pinning to the first course case). */
function FundingDetailsForm({ courseCase }: { courseCase: FundingRequest }) {
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
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="mb-0 text-sm font-medium text-[var(--ink)]">
        Funding &amp; authorization details
      </p>
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

function StatusCard({ wioaCase }: { wioaCase: WioaCaseDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
      router.refresh();
    });
  }

  return (
    <div>
      <p className="panel-h">Record a status change</p>
      <p className="panel-sub">
        Current status: {WIOA_STATUS_LABEL[wioaCase.status]} — set when the real-world step (outside
        this system) actually happens.
      </p>
      <div className="flex flex-col gap-3">
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

        <Button size="sm" disabled={!nextStatus || pending} onClick={advance} className="w-fit">
          {pending ? 'Saving…' : 'Save status'}
        </Button>
      </div>
    </div>
  );
}
