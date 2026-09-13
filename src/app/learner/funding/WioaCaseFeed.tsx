'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { uploadWioaDocument } from '@/lib/actions/wioa';
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

/** Learner-facing consolidated activity feed for one WIOA case (WIOA_INTEGRATION_PLAN.md
 * Section 7 — a read-only view over outreach log, documents, appointments, and next-step
 * guidance, plus the document upload UI itself). */
export function WioaCaseFeed({ wioaCase }: { wioaCase: WioaCaseRecord }) {
  const phaseIndex = WIOA_UI_PHASES.indexOf(
    WIOA_STATUS_PHASE[wioaCase.status] as (typeof WIOA_UI_PHASES)[number],
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Case status — {wioaCase.courseTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {WIOA_UI_PHASES.map((phase, i) => (
              <Badge key={phase} tone={i <= phaseIndex ? 'success' : 'neutral'}>
                {phase}
              </Badge>
            ))}
            {wioaCase.status === 'CLOSED_INELIGIBLE' && <Badge tone="danger">Closed</Badge>}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {WIOA_STATUS_LABEL[wioaCase.status]}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {WIOA_STATUS_NEXT_STEP[wioaCase.status]}
            </p>
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
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {wioaCase.appointments.map((a) => (
              <div key={a.id} className="rounded-lg border border-border-subtle p-3">
                <p className="text-sm font-medium text-text-primary">
                  {a.type === 'ORIENTATION'
                    ? 'Orientation'
                    : a.type === 'INTAKE'
                      ? 'Intake appointment'
                      : 'Follow-up'}
                </p>
                <p className="text-xs text-text-muted">
                  {new Date(a.scheduledAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                {a.notes && <p className="mt-1 text-sm text-text-secondary">{a.notes}</p>}
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

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        await uploadWioaDocument(doc.id, file);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  }

  const canUpload = doc.status === 'MISSING' || doc.status === 'REJECTED';

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-subtle p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-text-primary">{doc.requirementName}</p>
          <p className="text-xs text-text-secondary">{doc.requirementDescription}</p>
        </div>
        <Badge tone={docStatusTone[doc.status]}>{docStatusLabel[doc.status]}</Badge>
      </div>
      {doc.fileName && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Icon name="paperclip" className="size-3.5 text-brand-primary" />
          {doc.fileName}
        </div>
      )}
      {doc.status === 'REJECTED' && doc.rejectionReason && (
        <p className="text-xs text-danger">{doc.rejectionReason}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
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
    </div>
  );
}
