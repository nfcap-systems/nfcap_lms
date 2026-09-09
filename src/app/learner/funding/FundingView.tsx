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
import { Dialog } from '@/components/ui/Dialog';
import { updateWioaProfile, sendWioaOutreach } from '@/lib/actions/wioa';
import { buildWioaEmailBody, WIOA_EMAIL_SUBJECT } from '@/lib/wioa/email-template';
import type { LearnerProfile, WioaCommunicationRecord, WioaCaseRecord } from '@/lib/data/wioa';
import type { MatchedOffice } from '@/lib/wioa/matching';
import { WioaCaseFeed } from './WioaCaseFeed';

export function FundingView({
  profile,
  match,
  restrictedCourses,
  communications,
  cases,
  learnerName,
  learnerEmail,
}: {
  profile: LearnerProfile | null;
  match: MatchedOffice | null;
  restrictedCourses: { id: string; title: string }[];
  communications: WioaCommunicationRecord[];
  cases: WioaCaseRecord[];
  learnerName: string;
  learnerEmail: string;
}) {
  if (!profile || profile.fundingSource !== 'WIOA_PENDING' || !profile.zip) {
    return <AddressCapture profile={profile} />;
  }

  if (!match) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-8">
          <Badge tone="info">No office matched yet</Badge>
          <p className="text-sm text-text-secondary">
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
      learnerName={learnerName}
      learnerEmail={learnerEmail}
      city={profile.city ?? ''}
      zip={profile.zip}
      mobilePhone={profile.mobilePhone ?? ''}
    />
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
        <p className="mb-4 text-sm text-text-secondary">
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
  learnerName,
  learnerEmail,
  city,
  zip,
  mobilePhone,
}: {
  match: MatchedOffice;
  restrictedCourses: { id: string; title: string }[];
  communications: WioaCommunicationRecord[];
  cases: WioaCaseRecord[];
  learnerName: string;
  learnerEmail: string;
  city: string;
  zip: string;
  mobilePhone: string;
}) {
  const [courseId, setCourseId] = useState(restrictedCourses[0]?.id ?? '');
  const activeCase = cases.find((c) => c.courseId === courseId && !c.closedAt);
  const [emailOpen, setEmailOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [subject, setSubject] = useState(WIOA_EMAIL_SUBJECT);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const courseTitle = restrictedCourses.find((c) => c.id === courseId)?.title ?? '';
  const recipient = match.contact?.email ?? match.board.email;

  function openEmailDialog() {
    setSubject(WIOA_EMAIL_SUBJECT);
    setBody(
      buildWioaEmailBody({
        learnerName,
        city,
        zip,
        courseTitle,
        learnerEmail,
        learnerPhone: mobilePhone,
      }),
    );
    setEmailOpen(true);
  }

  function confirmSend() {
    startTransition(async () => {
      await sendWioaOutreach(courseId, match.contact?.id ?? null, recipient, subject, body);
      setEmailOpen(false);
      router.refresh();
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
            <p className="text-sm font-medium text-text-primary">{match.board.name}</p>
            <p className="text-xs text-text-muted">{match.board.address}</p>
            {match.ajcc && (
              <p className="mt-1 text-xs text-text-muted">
                Career center: {match.ajcc.name} — {match.ajcc.address}
              </p>
            )}
          </div>
          {match.contact && (
            <div className="rounded-lg border border-border-subtle bg-bg-subtle p-3">
              <p className="text-sm font-medium text-text-primary">{match.contact.name}</p>
              {match.contact.title && (
                <p className="text-xs text-text-muted">{match.contact.title}</p>
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
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-border-default bg-transparent px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-subtle"
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

      {communications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outreach log</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {communications.map((c) => (
              <div key={c.id} className="rounded-lg border border-border-subtle p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-text-primary">
                    {c.channel === 'EMAIL' ? 'Email sent' : 'Call logged'} to {c.recipient}
                  </p>
                  <Badge tone="success">Sent</Badge>
                </div>
                <p className="mt-1 text-xs text-text-muted">
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
                <p className="text-sm font-medium text-text-primary">{doc.requirementName}</p>
                <p className="text-sm text-text-secondary">{doc.requirementDescription}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">
            Your full document checklist becomes available once your WIOA case opens after outreach
            is sent — including any documents specific to {match.board.name}.
          </p>
        )}
      </Dialog>
    </div>
  );
}
