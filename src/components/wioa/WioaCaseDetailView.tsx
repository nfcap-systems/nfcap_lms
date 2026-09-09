'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import {
  setWioaDocumentStatus,
  advanceWioaCaseStatus,
  getWioaDocumentUrl,
  assignWioaCasePartnerStaff,
  updateWioaFunding,
  type WioaFundingFields,
} from '@/lib/actions/wioa';
import type { WioaCaseDetail, WioaDocumentRecord } from '@/lib/data/wioa';
import type { LearnerRecord } from '@/lib/data/learners';
import type { WioaCaseStatus, AppointmentType } from '@/generated/prisma/enums';
import { WIOA_STATUS_LABEL, nextStatusOptions } from '@/lib/wioa/status';

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

// Only these two next-statuses ever pair with scheduling an Appointment in the same action
// (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — Appointment is authoritative for the date,
// the case status is a derived label staff sets alongside creating it).
const APPOINTMENT_STATUS_TYPE: Partial<Record<WioaCaseStatus, AppointmentType>> = {
  ORIENTATION_SCHEDULED: 'ORIENTATION',
  INTAKE_APPOINTMENT_SCHEDULED: 'INTAKE',
};

export function WioaCaseDetailView({
  wioaCase,
  partnerStaffRoster,
}: {
  wioaCase: WioaCaseDetail;
  /** Only passed on the Coordinator dashboard — turns on the assignment control. Partner Staff
   * views their assignment read-only via wioaCase.assignedPartnerStaffName. */
  partnerStaffRoster?: LearnerRecord[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Matched office</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-text-secondary">
          <p>{wioaCase.boardName ?? 'No workforce board matched — resolve by hand.'}</p>
          {wioaCase.ajccName && <p>{wioaCase.ajccName}</p>}
          {wioaCase.contactName && <p>Contact: {wioaCase.contactName}</p>}
        </CardContent>
      </Card>

      {partnerStaffRoster && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentControl wioaCase={wioaCase} partnerStaffRoster={partnerStaffRoster} />
          </CardContent>
        </Card>
      )}
      {!partnerStaffRoster && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-secondary">
            {wioaCase.assignedPartnerStaffName
              ? `Assigned to ${wioaCase.assignedPartnerStaffName}`
              : 'Not yet assigned to a Partner Staff account.'}
          </CardContent>
        </Card>
      )}

      <StatusCard wioaCase={wioaCase} />

      {/* Coordinator-only, same gate as the Assignment control above (partnerStaffRoster is only
       * passed on the Coordinator dashboard) — Partner Staff's dashboard excludes funding data
       * entirely (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3), and wioaCase.funding is server-fetched
       * only for Coordinator in the first place (getWioaCaseDetail's includeFunding option). */}
      {partnerStaffRoster && <FundingCard wioaCase={wioaCase} />}

      {wioaCase.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {wioaCase.documents.map((doc) => (
              <DocumentReviewRow key={doc.id} doc={doc} />
            ))}
          </CardContent>
        </Card>
      )}

      {wioaCase.communications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outreach log</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {wioaCase.communications.map((c) => (
              <div key={c.id} className="text-sm text-text-secondary">
                {c.channel === 'EMAIL' ? 'Email' : 'Call'} to {c.recipient} —{' '}
                {new Date(c.sentAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
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
        </CardContent>
      </Card>
    </div>
  );

  function DocumentReviewRow({ doc }: { doc: WioaDocumentRecord }) {
    const [reason, setReason] = useState('');
    const [reviewing, setReviewing] = useState(false);

    async function viewFile() {
      const url = await getWioaDocumentUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
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
      </div>
    );
  }
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
          <Input
            id="trainingProgram"
            value={trainingProgram}
            onChange={(e) => setTrainingProgram(e.target.value)}
          />
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
          <Input
            id="requestStatus"
            value={requestStatus}
            onChange={(e) => setRequestStatus(e.target.value)}
          />
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

  const appointmentType = nextStatus ? APPOINTMENT_STATUS_TYPE[nextStatus] : undefined;

  function advance() {
    if (!nextStatus) return;
    startTransition(async () => {
      await advanceWioaCaseStatus(
        wioaCase.id,
        nextStatus,
        appointmentType && scheduledAt
          ? { type: appointmentType, scheduledAt, notes: notes || undefined }
          : undefined,
      );
      setNextStatus('');
      setScheduledAt('');
      setNotes('');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge tone={wioaCase.status === 'CLOSED_INELIGIBLE' ? 'danger' : 'info'}>
          {WIOA_STATUS_LABEL[wioaCase.status]}
        </Badge>

        {options.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
            <Field label="Advance to" htmlFor="nextStatus">
              <Select
                id="nextStatus"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as WioaCaseStatus)}
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
              {pending ? 'Updating…' : 'Confirm status change'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
