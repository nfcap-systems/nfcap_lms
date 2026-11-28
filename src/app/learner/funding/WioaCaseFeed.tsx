'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ProgressBar,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import {
  uploadWioaDocument,
  getWioaDocumentVersionsForLearner,
  getWioaDocumentVersionUrlForLearner,
  type WioaDocumentVersionRecord,
} from '@/lib/actions/wioa';
import type { WioaCaseRecord, WioaDocumentRecord } from '@/lib/data/wioa';
import {
  WIOA_STATUS_LABEL,
  WIOA_STATUS_PHASE,
  WIOA_STATUS_NEXT_STEP,
  WIOA_UI_PHASES,
} from '@/lib/wioa/status';

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

const docStatusLabel: Record<WioaDocumentRecord['status'], string> = {
  MISSING: 'Not uploaded',
  UPLOADED: 'Uploaded',
  UNDER_REVIEW: 'Under review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Needs resubmission',
  NOT_APPLICABLE: 'Not applicable',
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Learner-facing consolidated activity feed for one WIOA case (WIOA_INTEGRATION_PLAN.md
 * Section 7 — a read-only view over outreach log, documents, appointments, and next-step
 * guidance, plus the document upload UI itself).
 *
 * The "Case status" card below is a per-phase vertical timeline (matching docs/MOCKUP-INDEX.md's
 * `LRN10-FundingStatus` board), not a raw dump of every `WioaStatusHistory` row — that granular
 * view belongs to staff (`WioaCaseDetailView.tsx`'s History tab). Each phase's date is the
 * earliest status-history entry whose phase matches it; the current phase shows the next-step
 * guidance instead of a date. */
export function WioaCaseFeed({ wioaCase }: { wioaCase: WioaCaseRecord }) {
  // CLOSED_INELIGIBLE maps to the 'Closed' phase, which isn't one of WIOA_UI_PHASES' steps — fall
  // back to the furthest phase actually reached per statusHistory, so phases genuinely completed
  // before closure still render as done instead of every step going grey.
  const phaseIndex =
    wioaCase.status === 'CLOSED_INELIGIBLE'
      ? wioaCase.statusHistory.reduce((max, h) => {
          const idx = WIOA_UI_PHASES.indexOf(
            WIOA_STATUS_PHASE[h.status] as (typeof WIOA_UI_PHASES)[number],
          );
          return idx > max ? idx : max;
        }, -1)
      : WIOA_UI_PHASES.indexOf(
          WIOA_STATUS_PHASE[wioaCase.status] as (typeof WIOA_UI_PHASES)[number],
        );

  const phaseDate = (phase: (typeof WIOA_UI_PHASES)[number]) =>
    wioaCase.statusHistory.find((h) => WIOA_STATUS_PHASE[h.status] === phase)?.changedAt ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>WIOA eligibility status</CardTitle>
        </CardHeader>
        <CardContent>
          {wioaCase.status === 'CLOSED_INELIGIBLE' && (
            <Badge tone="danger" className="mb-4">
              Closed — ineligible
            </Badge>
          )}
          <div className="tl">
            {WIOA_UI_PHASES.map((phase, i) => {
              const state = i < phaseIndex ? 'done' : i === phaseIndex ? 'current' : 'future';
              const date = state === 'done' ? phaseDate(phase) : null;
              return (
                <div key={phase} className={`tlrow ${state}`}>
                  <div className="tldot" />
                  <div className="tl-status">{phase}</div>
                  {state === 'current' ? (
                    <div className="tl-meta">
                      {WIOA_STATUS_LABEL[wioaCase.status]} —{' '}
                      {WIOA_STATUS_NEXT_STEP[wioaCase.status]}
                    </div>
                  ) : (
                    date && <div className="tl-meta">{formatDate(date)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {wioaCase.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility documents</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ProgressBar
              value={
                wioaCase.documents.filter(
                  (d) => d.status === 'ACCEPTED' || d.status === 'NOT_APPLICABLE',
                ).length
              }
              max={wioaCase.documents.length}
              label="Documents accepted"
              showPercentage
            />
            {wioaCase.documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </CardContent>
        </Card>
      )}

      {wioaCase.appointments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Appointments</CardTitle>
            <Link
              href={`/learner/funding/appointments/${wioaCase.id}`}
              className="text-xs font-medium text-[var(--nfcap-accent)] hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {wioaCase.appointments.map((a) => (
              <div key={a.id} className="rounded-lg border border-[var(--nfcap-border)] p-3">
                <p className="text-sm font-medium text-[var(--ink)]">
                  {a.type === 'ORIENTATION'
                    ? 'Orientation'
                    : a.type === 'INTAKE'
                      ? 'Intake appointment'
                      : 'Follow-up'}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {new Date(a.scheduledAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                {a.notes && <p className="mt-1 text-sm text-[var(--ink-muted)]">{a.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DocumentCard({ doc }: { doc: WioaDocumentRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<WioaDocumentVersionRecord[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function viewVersion(versionId: string) {
    try {
      const url = await getWioaDocumentVersionUrlForLearner(versionId);
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
      setHistory(await getWioaDocumentVersionsForLearner(doc.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load upload history.');
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await uploadWioaDocument(doc.id, file);
        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
        } else {
          toast.success(`${doc.requirementName} uploaded`);
          router.refresh();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message);
        toast.error(message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  }

  // Capped is checked server-side too (uploadWioaDocument returns the friendly cap error either
  // way) — hiding the button here is purely so a learner who's hit the limit sees the "message
  // your case manager" copy instead of a button that would just fail.
  const canUpload = (doc.status === 'MISSING' || doc.status === 'REJECTED') && !doc.isCapped;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--nfcap-border)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">{doc.requirementName}</p>
          <p className="text-xs text-[var(--ink-muted)]">{doc.requirementDescription}</p>
        </div>
        <Badge tone={docStatusTone[doc.status]}>{docStatusLabel[doc.status]}</Badge>
      </div>
      {doc.fileName && (
        <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
          <Icon name="paperclip" className="size-3.5 text-[var(--nfcap-accent)]" />
          {doc.fileName}
        </div>
      )}
      {doc.status === 'REJECTED' && doc.rejectionReason && (
        <p className="text-xs text-[var(--status-problem)]">{doc.rejectionReason}</p>
      )}
      {doc.isCapped && (
        <p className="text-xs text-[var(--status-problem)]">
          You&apos;ve reached the upload limit for this document — message your case manager and
          they&apos;ll help you upload a new file.
        </p>
      )}
      {error && <p className="text-xs text-[var(--status-problem)]">{error}</p>}
      {canUpload && (
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" className="size-4" />
            {pending ? 'Uploading…' : doc.status === 'REJECTED' ? 'Re-upload' : 'Upload'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
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
                ? 'View upload history'
                : 'Hide upload history'}
          </button>
          {history !== null && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {history.length === 0 && (
                <li className="text-xs text-[var(--ink-muted)]">No earlier uploads.</li>
              )}
              {history.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 text-xs text-[var(--ink-muted)]"
                >
                  <button
                    type="button"
                    onClick={() => viewVersion(v.id)}
                    className="flex min-w-0 items-center gap-1.5 hover:underline"
                  >
                    <Icon name="paperclip" className="size-3.5 shrink-0" />
                    <span className="truncate">{v.fileName}</span>
                  </button>
                  <span className="shrink-0">
                    {v.uploadedAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    · {v.status === 'REJECTED' ? 'Rejected' : v.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
