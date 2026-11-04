'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Field, Textarea } from '@/components/ui';
import { Icon } from '@/components/icons';
import { submitEvidence } from '@/lib/actions/progress';
import type { EvidenceSubmission } from '@/lib/data/progress';
import type { Course } from '@/lib/types';

const statusCopy: Record<
  'pending' | 'approved' | 'rejected',
  { tone: 'pending' | 'success' | 'danger'; label: string }
> = {
  pending: { tone: 'pending', label: 'Pending Verification' },
  approved: { tone: 'success', label: 'Verified' },
  rejected: { tone: 'danger', label: 'Needs Resubmission' },
};

export function EvidenceView({
  course,
  evidence,
}: {
  course: Course;
  evidence: EvidenceSubmission | undefined;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resubmitting, setResubmitting] = useState(false);

  if (evidence && !resubmitting) {
    const status = statusCopy[evidence.status];
    return (
      <div className="flex flex-col gap-5">
        <Header />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border-subtle bg-bg-subtle p-5">
          <Badge tone={status.tone}>{status.label}</Badge>
          <p className="text-sm text-text-secondary">
            Submitted{' '}
            {new Date(evidence.submittedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {evidence.status === 'pending'
              ? '. NFCAP staff will review your submission and update its status here.'
              : evidence.status === 'approved'
                ? '. Your course is complete and your certificate has been issued.'
                : '. Update your submission below and resubmit for another review.'}
          </p>
          <p className="text-sm text-text-primary">{evidence.description}</p>
          {evidence.fileName && (
            <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-secondary">
              <Icon name="paperclip" className="size-4 shrink-0 text-brand-primary" />
              {evidence.fileName}
            </div>
          )}
          {evidence.status === 'approved' && (
            <Button size="sm" onClick={() => router.push('/learner/certificates')}>
              <Icon name="award" className="size-4" />
              View Certificate
            </Button>
          )}
          {evidence.status === 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDescription(evidence.description);
                setResubmitting(true);
              }}
            >
              Resubmit Evidence
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Header />
      <p className="text-sm text-text-secondary">{course.evidencePrompt}</p>

      <Field
        label="Description"
        htmlFor="evidence-description"
        hint="Describe the work shown and how it demonstrates what you learned."
      >
        <Textarea
          id="evidence-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your practical evidence..."
        />
      </Field>

      <Field label="Attachment (optional)">
        {file ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-bg-subtle px-3 py-2 text-sm text-text-secondary">
            <span className="flex items-center gap-2 truncate">
              <Icon name="paperclip" className="size-4 shrink-0 text-brand-primary" />
              <span className="truncate">{file.name}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              aria-label="Remove attachment"
              className="shrink-0 text-text-muted hover:text-text-primary"
            >
              <Icon name="x" className="size-4" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" className="size-4" />
            Attach photo or file
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>

      <div className="border-t border-border-subtle pt-5">
        <Button
          disabled={description.trim().length === 0}
          onClick={() => {
            const desc = description.trim();
            const fileName = file?.name;
            startTransition(async () => {
              await submitEvidence(course.id, desc, fileName);
              router.refresh();
            });
            setResubmitting(false);
          }}
        >
          {evidence ? 'Resubmit Evidence' : 'Submit Evidence'}
        </Button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <Badge tone="info">
        <Icon name="paperclip" className="size-3" />
        Practical Evidence
      </Badge>
    </div>
  );
}
