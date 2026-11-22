'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  advanceWioaCaseStatus,
  getWioaDocumentUrl,
  getWioaDocumentVersions,
  getWioaDocumentVersionUrl,
  assignWioaCasePartnerStaff,
  updateWioaFunding,
  type WioaFundingFields,
  type WioaDocumentVersionRecord,
} from '@/lib/actions/wioa';
import type { WioaCaseDetail, WioaDocumentRecord } from '@/lib/data/wioa';
import type { LearnerRecord } from '@/lib/data/learners';
import type { WioaCaseStatus, AppointmentType } from '@/generated/prisma/enums';
import { WIOA_STATUS_LABEL, WIOA_STATUS_PHASE, nextStatusOptions } from '@/lib/wioa/status';

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

// Only these two next-statuses ever pair with scheduling an Appointment in the same action
// (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — Appointment is authoritative for the date,
// the case status is a derived label staff sets alongside creating it).
const APPOINTMENT_STATUS_TYPE: Partial<Record<WioaCaseStatus, AppointmentType>> = {
  ORIENTATION_SCHEDULED: 'ORIENTATION',
  INTAKE_APPOINTMENT_SCHEDULED: 'INTAKE',
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
  const pathwayPercent =
    wioaCase.status === 'APPRENTICESHIP_ENROLLMENT_COMPLETE'
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
                <span className="pbadge">{wioaCase.courseTitle}</span>
              </div>
            </div>
          </>
        }
      />

      <ProfileTabs
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'documents', label: `Documents${wioaCase.documents.length > 0 ? ` (${wioaCase.documents.length})` : ''}` },
          { key: 'history', label: 'Status history' },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {tab === 'overview' && (
        <div className="ov-grid" style={{ paddingTop: 4 }}>
          <div>
            <div className="ov-h">Case summary</div>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
              {wioaCase.learnerName.split(' ')[0]}&apos;s case is in the{' '}
              <strong style={{ color: 'var(--ink)' }}>{phase}</strong> phase (
              {WIOA_STATUS_LABEL[wioaCase.status]}); last status change was {formatDate(lastStatusChange)}.
            </p>

            <div style={{ height: 1, background: 'var(--border)', margin: '0 0 20px' }} />

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
                  <span className="ov-val">{wioaCase.boardName ?? 'No workforce board matched'}</span>
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

            <div style={{ height: 1, background: 'var(--border)', margin: '0 0 20px' }} />

            <StatusCard wioaCase={wioaCase} />

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
              <div style={{ marginTop: 20 }}>
                <FundingCard wioaCase={wioaCase} />
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
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{wioaCase.contactName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                    {wioaCase.boardName ?? 'Primary contact'}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '0 0 0' }}>No contact matched.</p>
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

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
                    <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{nextAppointment.notes}</div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No upcoming appointment scheduled.</p>
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

            <div className="ov-h" style={{ fontSize: 13.5 }}>
              Recent communications
            </div>
            {wioaCase.communications.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No outreach logged yet.</p>
            ) : (
              wioaCase.communications.slice(0, 2).map((c, i) => (
                <div className="side-row" key={c.id} style={i === 0 ? { paddingTop: 0 } : undefined}>
                  <Icon name={c.channel === 'EMAIL' ? 'mail' : 'phone'} className="side-ic" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {formatDate(c.sentAt)} — {c.channel === 'EMAIL' ? 'Email' : 'Call'} to {c.recipient}
                    </div>
                    {c.subject && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{c.subject}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            {wioaCase.documents.length === 0 ? (
              <p className="text-sm text-text-secondary">No documents required for this case.</p>
            ) : (
              wioaCase.documents.map((doc) => (
                <DocumentReviewRow key={doc.id} doc={doc} startTransition={startTransition} />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">Status changes</p>
              <div className="flex flex-col gap-2">
                {wioaCase.statusHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary">{WIOA_STATUS_LABEL[h.status]}</span>
                    <span className="text-xs text-text-muted">
                      {new Date(h.changedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {wioaCase.communications.length > 0 && (
              <div className="border-t border-border-subtle pt-4">
                <p className="mb-2 text-sm font-medium text-text-primary">Outreach log</p>
                <div className="flex flex-col gap-2">
                  {wioaCase.communications.map((c) => (
                    <div key={c.id} className="text-sm text-text-secondary">
                      {c.channel === 'EMAIL' ? 'Email' : 'Call'} to {c.recipient} — {formatDate(c.sentAt)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
    const url = await getWioaDocumentUrl(doc.id);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function viewVersion(versionId: string) {
    const url = await getWioaDocumentVersionUrl(versionId);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function toggleHistory() {
    if (history !== null) {
      setHistory(null);
      return;
    }
    setLoadingHistory(true);
    try {
      setHistory(await getWioaDocumentVersions(doc.id));
    } finally {
      setLoadingHistory(false);
    }
  }

  function review(status: 'ACCEPTED' | 'REJECTED') {
    startTransition(async () => {
      await setWioaDocumentStatus(doc.id, status, status === 'REJECTED' ? reason : undefined);
      setReviewing(false);
      setReason('');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-subtle p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-text-primary">{doc.requirementName}</p>
          {doc.fileName && (
            <button
              type="button"
              onClick={viewFile}
              className="mt-1 flex items-center gap-1.5 text-xs text-brand-primary hover:underline"
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

      {doc.status !== 'MISSING' && doc.status !== 'NOT_APPLICABLE' && (
        <div>
          <button type="button" onClick={toggleHistory} className="text-xs text-text-secondary hover:underline">
            {loadingHistory ? 'Loading history…' : history === null ? 'View past versions' : 'Hide past versions'}
          </button>
          {history !== null && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {history.length === 0 && <li className="text-xs text-text-muted">No earlier versions.</li>}
              {history.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-subtle p-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => viewVersion(v.id)}
                      className="flex items-center gap-1.5 text-xs text-brand-primary hover:underline"
                    >
                      <Icon name="paperclip" className="size-3.5" />
                      {v.fileName}
                    </button>
                    <span className="text-[11px] text-text-muted">
                      Uploaded{' '}
                      {v.uploadedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {v.status === 'REJECTED' && v.rejectionReason && (
                      <span className="text-[11px] text-danger">{v.rejectionReason}</span>
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
      await assignWioaCasePartnerStaff(wioaCase.id, partnerStaffId || null);
      router.refresh();
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

/** The 8 ETPL/funding milestones as one form (WIOA_INTEGRATION_PLAN.md Section 5/spec §14 —
 * tracked as separate fields, not a single status). Saves both EtplFundingRequest and
 * FundingAuthorization together via updateWioaFunding since Coordinator fills them in
 * incrementally as the case progresses, not all at once. */
function FundingCard({ wioaCase }: { wioaCase: WioaCaseDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const funding = wioaCase.funding;
  const auth = funding?.authorization;

  const [trainingProgram, setTrainingProgram] = useState(funding?.trainingProgram ?? '');
  const [etplProviderConfirmed, setEtplProviderConfirmed] = useState(
    funding?.etplProviderConfirmed ?? false,
  );
  const [submittedAt, setSubmittedAt] = useState(toDatetimeLocal(funding?.submittedAt));
  const [caseManagerNotifiedAt, setCaseManagerNotifiedAt] = useState(
    toDatetimeLocal(funding?.caseManagerNotifiedAt),
  );
  const [fundingReviewStatus, setFundingReviewStatus] = useState(funding?.fundingReviewStatus ?? '');
  const [requestStatus, setRequestStatus] = useState(funding?.status ?? '');
  const [itaIssuedAt, setItaIssuedAt] = useState(toDatetimeLocal(auth?.itaIssuedAt));
  const [approvedAmount, setApprovedAmount] = useState(
    auth?.approvedAmount != null ? String(auth.approvedAmount) : '',
  );
  const [approvalDate, setApprovalDate] = useState(toDateInput(auth?.approvalDate));
  const [trainingStartDate, setTrainingStartDate] = useState(toDateInput(auth?.trainingStartDate));
  const [authorizationStatus, setAuthorizationStatus] = useState(auth?.status ?? '');

  function save() {
    const fields: WioaFundingFields = {
      trainingProgram: trainingProgram || undefined,
      etplProviderConfirmed,
      submittedAt: submittedAt || undefined,
      caseManagerNotifiedAt: caseManagerNotifiedAt || undefined,
      fundingReviewStatus: fundingReviewStatus || undefined,
      requestStatus: requestStatus || undefined,
      itaIssuedAt: itaIssuedAt || undefined,
      approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
      approvalDate: approvalDate || undefined,
      trainingStartDate: trainingStartDate || undefined,
      authorizationStatus: authorizationStatus || undefined,
    };
    startTransition(async () => {
      await updateWioaFunding(wioaCase.id, fields);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funding</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Training program" htmlFor="trainingProgram">
          <Input id="trainingProgram" value={trainingProgram} onChange={(e) => setTrainingProgram(e.target.value)} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={etplProviderConfirmed}
            onChange={(e) => setEtplProviderConfirmed(e.target.checked)}
          />
          ETPL provider confirmed
        </label>

        <Field label="Request submitted at" htmlFor="submittedAt">
          <Input
            id="submittedAt"
            type="datetime-local"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
          />
        </Field>
        <Field label="Case manager notified at" htmlFor="caseManagerNotifiedAt">
          <Input
            id="caseManagerNotifiedAt"
            type="datetime-local"
            value={caseManagerNotifiedAt}
            onChange={(e) => setCaseManagerNotifiedAt(e.target.value)}
          />
        </Field>
        <Field label="Funding review status" htmlFor="fundingReviewStatus">
          <Input
            id="fundingReviewStatus"
            value={fundingReviewStatus}
            onChange={(e) => setFundingReviewStatus(e.target.value)}
            placeholder="e.g. Pending, Approved, Denied"
          />
        </Field>
        <Field label="Request status" htmlFor="requestStatus">
          <Input id="requestStatus" value={requestStatus} onChange={(e) => setRequestStatus(e.target.value)} />
        </Field>

        <div className="border-t border-border-subtle pt-4">
          <p className="mb-3 text-sm font-medium text-text-primary">Authorization</p>
          <div className="flex flex-col gap-4">
            <Field label="ITA issued at" htmlFor="itaIssuedAt">
              <Input
                id="itaIssuedAt"
                type="datetime-local"
                value={itaIssuedAt}
                onChange={(e) => setItaIssuedAt(e.target.value)}
              />
            </Field>
            <Field label="Approved amount" htmlFor="approvedAmount">
              <Input
                id="approvedAmount"
                type="number"
                min="0"
                step="0.01"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
              />
            </Field>
            <Field label="Approval date" htmlFor="approvalDate">
              <Input
                id="approvalDate"
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
              />
            </Field>
            <Field label="Training start date" htmlFor="trainingStartDate">
              <Input
                id="trainingStartDate"
                type="date"
                value={trainingStartDate}
                onChange={(e) => setTrainingStartDate(e.target.value)}
              />
            </Field>
            <Field label="Authorization status" htmlFor="authorizationStatus">
              <Input
                id="authorizationStatus"
                value={authorizationStatus}
                onChange={(e) => setAuthorizationStatus(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <Button size="sm" disabled={pending} onClick={save} className="w-fit">
          {pending ? 'Saving…' : 'Save funding details'}
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusCard({ wioaCase }: { wioaCase: WioaCaseDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = nextStatusOptions(wioaCase.status);
  const [nextStatus, setNextStatus] = useState<WioaCaseStatus | ''>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const appointmentType = nextStatus ? APPOINTMENT_STATUS_TYPE[nextStatus] : undefined;

  if (options.length === 0) return null;

  function advance() {
    if (!nextStatus) return;
    setError('');
    startTransition(async () => {
      try {
        await advanceWioaCaseStatus(
          wioaCase.id,
          nextStatus,
          appointmentType && scheduledAt ? { type: appointmentType, scheduledAt, notes: notes || undefined } : undefined,
        );
        setNextStatus('');
        setScheduledAt('');
        setNotes('');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not advance this case.');
      }
    });
  }

  return (
    <div>
      <div className="ov-h">Update status</div>
      <div className="flex flex-col gap-3">
        <Field label="Advance to" htmlFor="nextStatus" error={error || undefined}>
          <Select
            id="nextStatus"
            value={nextStatus}
            onChange={(e) => {
              setError('');
              setNextStatus(e.target.value as WioaCaseStatus);
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
              <Textarea id="apptNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Field>
          </>
        )}

        <Button size="sm" disabled={!nextStatus || pending} onClick={advance} className="w-fit">
          {pending ? 'Updating…' : 'Confirm status change'}
        </Button>
      </div>
    </div>
  );
}
