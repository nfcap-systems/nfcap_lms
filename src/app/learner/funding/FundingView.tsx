'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { Dialog } from '@/components/ui/Dialog';
import { updateWioaProfile, sendWioaOutreach, requestCourseFunding } from '@/lib/actions/wioa';
import { fillWioaEmailTemplate } from '@/lib/wioa/email-template';
import type {
  LearnerProfile,
  WioaCommunicationRecord,
  WioaCaseRecord,
  WioaCourseFundingRecord,
} from '@/lib/data/wioa';
import {
  WIOA_FUNDING_STATUS_LABEL,
  WIOA_FUNDING_STATUS_NEXT_STEP,
  WIOA_FUNDING_STATUS_ORDER,
} from '@/lib/wioa/status';
import type { WioaEmailTemplateRecord } from '@/lib/data/wioa-email-template';
import type { MatchedOffice } from '@/lib/wioa/matching';
import { WioaCaseFeed } from './WioaCaseFeed';

export function FundingView({
  profile,
  match,
  restrictedCourses,
  communications,
  cases,
  fundingRequests,
  learnerName,
  learnerEmail,
  emailTemplate,
}: {
  profile: LearnerProfile | null;
  match: MatchedOffice | null;
  restrictedCourses: { id: string; title: string }[];
  communications: WioaCommunicationRecord[];
  cases: WioaCaseRecord[];
  fundingRequests: WioaCourseFundingRecord[];
  learnerName: string;
  learnerEmail: string;
  emailTemplate: WioaEmailTemplateRecord;
}) {
  if (!profile || profile.fundingSource !== 'WIOA_PENDING' || !profile.zip) {
    return <AddressCapture profile={profile} />;
  }

  if (!match) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-8">
          <Badge tone="info">No office matched yet</Badge>
          <p className="text-sm text-[var(--ink-muted)]">
            We couldn&apos;t automatically match ZIP code <strong>{profile.zip}</strong> to a
            workforce board. NFCAP staff will review your address and assign your office by hand —
            check back here soon, or reach out to NFCAP directly.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <MatchedOfficeView
      match={match}
      restrictedCourses={restrictedCourses}
      communications={communications}
      cases={cases}
      fundingRequests={fundingRequests}
      learnerName={learnerName}
      learnerEmail={learnerEmail}
      city={profile.city ?? ''}
      zip={profile.zip}
      mobilePhone={profile.mobilePhone ?? ''}
      emailTemplate={emailTemplate}
    />
  );
}

function fundingFormatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Per-phase timeline for one course's funding request — same pattern as WioaCaseFeed's
 * eligibility timeline, over WIOA_FUNDING_STATUS_ORDER instead of the eligibility phases
 * (docs/build/PHASE_5_PROGRESS.md "Funding Progress Transparency" — a per-phase timeline with
 * dates, not just a current-status badge). FUNDING_DECLINED is terminal, not part of the normal
 * forward sequence, same treatment as CLOSED_INELIGIBLE on the eligibility side. */
function FundingRequestTimeline({ request }: { request: WioaCourseFundingRecord }) {
  const sequence = WIOA_FUNDING_STATUS_ORDER.filter((s) => s !== 'FUNDING_DECLINED');
  const phaseIndex =
    request.status === 'FUNDING_DECLINED'
      ? request.fundingStatusHistory.reduce((max, h) => {
          const idx = sequence.indexOf(h.status as (typeof sequence)[number]);
          return idx > max ? idx : max;
        }, -1)
      : sequence.indexOf(request.status as (typeof sequence)[number]);
  const dateFor = (status: (typeof sequence)[number]) =>
    request.fundingStatusHistory.find((h) => h.status === status)?.changedAt ?? null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--nfcap-border)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--ink)]">{request.courseTitle}</p>
        {request.status === 'FUNDING_DECLINED' ? (
          <Badge tone="danger">Funding declined</Badge>
        ) : (
          <Badge tone={request.status === 'TUITION_APPROVED' ? 'success' : 'info'}>
            {WIOA_FUNDING_STATUS_LABEL[request.status]}
          </Badge>
        )}
      </div>
      <div className="tl">
        {sequence.map((status, i) => {
          const state = i < phaseIndex ? 'done' : i === phaseIndex ? 'current' : 'future';
          const date = state === 'done' ? dateFor(status) : null;
          return (
            <div key={status} className={`tlrow ${state}`}>
              <div className="tldot" />
              <div className="tl-status">{WIOA_FUNDING_STATUS_LABEL[status]}</div>
              {state === 'current' ? (
                <div className="tl-meta">{WIOA_FUNDING_STATUS_NEXT_STEP[request.status]}</div>
              ) : (
                date && <div className="tl-meta">{fundingFormatDate(date)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Once the learner's master case is WIOA_ELIGIBLE, they pick a course to request funding for —
 * a funding request is its own, independent per-course record (docs/plans/wioa-spec-alignment-
 * kickoff.md #1). Shown below the eligibility status card, not before it. */
function FundingRequestsCard({
  restrictedCourses,
  fundingRequests,
}: {
  restrictedCourses: { id: string; title: string }[];
  fundingRequests: WioaCourseFundingRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const requestedCourseIds = new Set(fundingRequests.map((f) => f.courseId));
  const availableCourses = restrictedCourses.filter((c) => !requestedCourseIds.has(c.id));

  function request() {
    if (!selectedCourseId) return;
    startTransition(async () => {
      try {
        await requestCourseFunding(selectedCourseId);
        setSelectedCourseId('');
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not submit this funding request.',
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course funding requests</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {fundingRequests.length > 0 && (
          <div className="flex flex-col gap-3">
            {fundingRequests.map((f) => (
              <FundingRequestTimeline key={f.id} request={f} />
            ))}
          </div>
        )}

        {availableCourses.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Request funding for" htmlFor="fundingCourseId">
              <Select
                id="fundingCourseId"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">Select a course</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Button onClick={request} disabled={!selectedCourseId || pending}>
              {pending ? 'Submitting…' : 'Request funding'}
            </Button>
          </div>
        ) : (
          fundingRequests.length === 0 && (
            <p className="text-sm text-[var(--ink-muted)]">No restricted courses available.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}

function AddressCapture({ profile }: { profile: LearnerProfile | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start the WIOA process</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-[var(--ink-muted)]">
          Enter your address so we can match you to your local workforce board. These details are
          only used for WIOA routing.
        </p>
        <form
          action={(formData) =>
            startTransition(async () => {
              await updateWioaProfile(formData);
              router.refresh();
            })
          }
          className="flex flex-col gap-4"
        >
          <Field label="Street address" htmlFor="streetAddress">
            <Input
              id="streetAddress"
              name="streetAddress"
              defaultValue={profile?.streetAddress ?? ''}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" defaultValue={profile?.city ?? ''} required />
            </Field>
            <Field label="State" htmlFor="state">
              <Input id="state" name="state" defaultValue={profile?.state ?? 'CA'} required />
            </Field>
            <Field label="ZIP code" htmlFor="zip">
              <Input
                id="zip"
                name="zip"
                inputMode="numeric"
                pattern="[0-9]{5}"
                defaultValue={profile?.zip ?? ''}
                required
              />
            </Field>
          </div>
          <Field label="Mobile phone" htmlFor="mobilePhone">
            <Input
              id="mobilePhone"
              name="mobilePhone"
              type="tel"
              defaultValue={profile?.mobilePhone ?? ''}
              required
            />
          </Field>
          <Field label="Employment status" htmlFor="employmentStatus">
            <Select
              id="employmentStatus"
              name="employmentStatus"
              defaultValue={profile?.employmentStatus ?? ''}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="Unemployed">Unemployed</option>
              <option value="Employed part-time">Employed part-time</option>
              <option value="Employed full-time">Employed full-time</option>
              <option value="Not in labor force">Not in labor force</option>
            </Select>
          </Field>
          <Field
            label="Unemployment insurance status"
            htmlFor="unemploymentInsuranceStatus"
            hint="Have you filed for, received, or exhausted UI in the last 6 months?"
          >
            <Select
              id="unemploymentInsuranceStatus"
              name="unemploymentInsuranceStatus"
              defaultValue={profile?.unemploymentInsuranceStatus ?? ''}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="Currently receiving">Currently receiving</option>
              <option value="Filed, awaiting decision">Filed, awaiting decision</option>
              <option value="Exhausted in last 6 months">Exhausted in last 6 months</option>
              <option value="Not applicable">Not applicable</option>
            </Select>
          </Field>
          <Field
            label="Training / apprenticeship interest"
            htmlFor="trainingApprenticeshipInterest"
          >
            <Input
              id="trainingApprenticeshipInterest"
              name="trainingApprenticeshipInterest"
              defaultValue={profile?.trainingApprenticeshipInterest ?? ''}
              required
            />
          </Field>
          <Field label="Date of birth" htmlFor="dateOfBirth">
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={
                profile?.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : ''
              }
              required
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? 'Matching…' : 'Find my workforce board'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MatchedOfficeView({
  match,
  restrictedCourses,
  communications,
  cases,
  fundingRequests,
  learnerName,
  learnerEmail,
  city,
  zip,
  mobilePhone,
  emailTemplate,
}: {
  match: MatchedOffice;
  restrictedCourses: { id: string; title: string }[];
  communications: WioaCommunicationRecord[];
  cases: WioaCaseRecord[];
  fundingRequests: WioaCourseFundingRecord[];
  learnerName: string;
  learnerEmail: string;
  city: string;
  zip: string;
  mobilePhone: string;
  emailTemplate: WioaEmailTemplateRecord;
}) {
  const [courseId, setCourseId] = useState(restrictedCourses[0]?.id ?? '');
  // The learner now has one course-less master case, not one per course
  // (docs/plans/wioa-spec-alignment-kickoff.md #1) — `courseId` still drives the outreach-email
  // preview copy below, but no longer selects which case is active.
  const activeCase = cases.find((c) => !c.closedAt);
  const [emailOpen, setEmailOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [subject, setSubject] = useState(emailTemplate.subject);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const courseTitle = restrictedCourses.find((c) => c.id === courseId)?.title ?? '';
  const recipient = match.contact?.email ?? match.board.email;

  function openEmailDialog() {
    const placeholders = {
      learnerName,
      city,
      zip,
      courseTitle,
      learnerEmail,
      learnerPhone: mobilePhone,
    };
    setSubject(fillWioaEmailTemplate(emailTemplate.subject, placeholders));
    setBody(fillWioaEmailTemplate(emailTemplate.body, placeholders));
    setEmailOpen(true);
  }

  function confirmSend() {
    startTransition(async () => {
      try {
        await sendWioaOutreach(match.contact?.id ?? null, recipient, subject, body);
        setEmailOpen(false);
        router.refresh();
      } catch (err) {
        // Dialog stays open (unlike the success path) so the learner can retry without
        // re-filling the form — a failed send must not look identical to a successful one.
        toast.error(
          err instanceof Error ? err.message : 'Could not send this email. Please try again.',
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your matched workforce office</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">{match.board.name}</p>
            <p className="text-xs text-[var(--ink-muted)]">{match.board.address}</p>
            {match.ajcc && (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Career center: {match.ajcc.name} — {match.ajcc.address}
              </p>
            )}
          </div>
          {match.contact && (
            <div className="rounded-lg border border-[var(--nfcap-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-sm font-medium text-[var(--ink)]">{match.contact.name}</p>
              {match.contact.title && (
                <p className="text-xs text-[var(--ink-muted)]">{match.contact.title}</p>
              )}
            </div>
          )}

          {restrictedCourses.length > 1 && (
            <Field label="Which course are you seeking funding for?" htmlFor="courseId">
              <Select id="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {restrictedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={openEmailDialog} disabled={!courseId}>
              <Icon name="mail" className="size-4" />
              Email
            </Button>
            <a
              href={`tel:${match.contact?.phone ?? match.board.phone}`}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--nfcap-border)] bg-transparent px-4 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              <Icon name="phone" className="size-4" />
              Call
            </a>
            <Button variant="outline" onClick={() => setRequirementsOpen(true)}>
              <Icon name="clipboard" className="size-4" />
              View Requirements
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeCase && <WioaCaseFeed wioaCase={activeCase} />}

      {activeCase?.status === 'WIOA_ELIGIBLE' && (
        <FundingRequestsCard
          restrictedCourses={restrictedCourses}
          fundingRequests={fundingRequests}
        />
      )}

      {communications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outreach log</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {communications.map((c) => (
              <div key={c.id} className="rounded-lg border border-[var(--nfcap-border)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {c.channel === 'EMAIL' ? 'Email sent' : 'Call logged'} to {c.recipient}
                  </p>
                  <Badge tone={c.status === 'FAILED' ? 'danger' : 'success'}>
                    {c.status === 'FAILED' ? 'Failed' : 'Sent'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {new Date(c.sentAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Review before sending"
        description={`To: ${recipient}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSend} disabled={pending}>
              {pending ? 'Sending…' : 'Confirm & Send'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Subject" htmlFor="subject">
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Message" htmlFor="body">
            <Textarea
              id="body"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-56"
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={requirementsOpen}
        onClose={() => setRequirementsOpen(false)}
        title="Eligibility document requirements"
      >
        {activeCase && activeCase.documents.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {activeCase.documents.map((doc) => (
              <li key={doc.id}>
                <p className="text-sm font-medium text-[var(--ink)]">{doc.requirementName}</p>
                <p className="text-sm text-[var(--ink-muted)]">{doc.requirementDescription}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            Your full document checklist becomes available once your WIOA case opens after outreach
            is sent — including any documents specific to {match.board.name}.
          </p>
        )}
      </Dialog>
    </div>
  );
}
