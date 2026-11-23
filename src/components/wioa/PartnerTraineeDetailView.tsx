'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, CompletionRing, ProfileHeader, Textarea } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { WioaCaseDetail, WioaDocumentRecord } from '@/lib/data/wioa';
import { addWioaCaseNote, sendWioaCaseReminder, getWioaDocumentUrl } from '@/lib/actions/wioa';

export type TraineeCourseProgress = {
  courseId: string;
  title: string;
  status: 'complete' | 'in-progress' | 'not-started';
};

const COURSE_STATUS_LABEL: Record<TraineeCourseProgress['status'], string> = {
  complete: 'Complete',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

const COURSE_STATUS_TONE: Record<TraineeCourseProgress['status'], 'success' | 'pending' | 'neutral'> = {
  complete: 'success',
  'in-progress': 'pending',
  'not-started': 'neutral',
};

const DOC_STATUS_LABEL: Record<WioaDocumentRecord['status'], string> = {
  MISSING: 'Missing',
  UPLOADED: 'Uploaded',
  UNDER_REVIEW: 'Under review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  NOT_APPLICABLE: 'Not applicable',
};

const DOC_STATUS_TONE: Record<WioaDocumentRecord['status'], 'success' | 'pending' | 'danger' | 'neutral'> = {
  MISSING: 'danger',
  UPLOADED: 'pending',
  UNDER_REVIEW: 'pending',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  NOT_APPLICABLE: 'neutral',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PartnerTraineeDetailView({
  wioaCase,
  courseProgress,
}: {
  wioaCase: WioaCaseDetail;
  /** The single apprenticeship pathway's courses and this learner's real completion status per
   * course (certificateId-present = complete, enrolled-no-certificate = in progress, same
   * convention as HomeView/MyLearningView) — not a fabricated "4 of 4 enrolled" figure. */
  courseProgress: TraineeCourseProgress[];
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const missingDocs = wioaCase.documents.filter((d) => d.status === 'MISSING' || d.status === 'REJECTED');
  const completedCount = courseProgress.filter((c) => c.status === 'complete').length;
  const completionPercent =
    courseProgress.length > 0 ? Math.round((completedCount / courseProgress.length) * 100) : 0;
  const notes = wioaCase.communications.filter((c) => c.channel === 'NOTE');

  async function saveNote() {
    if (!note.trim()) return;
    setSavingNote(true);
    await addWioaCaseNote(wioaCase.id, note.trim());
    setSavingNote(false);
    setNote('');
    router.refresh();
  }

  async function sendReminder() {
    setSendingReminder(true);
    try {
      await sendWioaCaseReminder(wioaCase.id);
    } finally {
      setSendingReminder(false);
      router.refresh();
    }
  }

  async function viewDocument(documentId: string) {
    const url = await getWioaDocumentUrl(documentId);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="crumbrow">
        <Link href="/partner" style={{ color: 'inherit', textDecoration: 'none' }}>
          My Cases
        </Link>
        <span className="sep">/</span>
        <span className="cur">{wioaCase.learnerName}</span>
      </div>

      <ProfileHeader
        left={
          <>
            <CompletionRing percentage={completionPercent} initials={initials(wioaCase.learnerName)} />
            <div style={{ minWidth: 0 }}>
              <h1 className="phdr-name">{wioaCase.learnerName}</h1>
              <p className="phdr-sub">
                {wioaCase.learnerEmail} · {wioaCase.courseTitle}
              </p>
              <div className="pbadges">
                {missingDocs.length > 0 && (
                  <Badge tone="danger" style={{ fontSize: 11.5 }}>
                    {missingDocs.length} document{missingDocs.length === 1 ? '' : 's'} missing
                  </Badge>
                )}
                <span className="pbadge">
                  {completedCount} of {courseProgress.length} courses complete
                </span>
                <span className="pbadge">Case opened {formatDate(wioaCase.createdAt)}</span>
              </div>
            </div>
          </>
        }
        actions={
          <Button variant="primary" size="sm" disabled={sendingReminder} onClick={sendReminder}>
            {sendingReminder ? 'Sending…' : 'Send reminder'}
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, paddingTop: 4 }}>
        <div className="flex flex-col gap-5">
          <div>
            <div className="ov-h">Course progress</div>
            <div className="panel" style={{ padding: '4px 18px' }}>
              {courseProgress.map((c) => (
                <div className="crsrow" key={c.courseId}>
                  <span className="nm">{c.title}</span>
                  <Badge tone={COURSE_STATUS_TONE[c.status]}>{COURSE_STATUS_LABEL[c.status]}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="ov-h">Required documents</div>
            {wioaCase.documents.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No documents required for this case.</p>
            ) : (
              <div className="doccard">
                {wioaCase.documents.map((doc) => (
                  <div className="docrow" key={doc.id}>
                    <div className="doc-ic">
                      <Icon name="file-text" className="h-4 w-4" />
                    </div>
                    <div className="doc-main">
                      <div className="doc-name">{doc.requirementName}</div>
                      <div className="doc-desc">{doc.requirementDescription}</div>
                    </div>
                    <div className="doc-meta">
                      <Badge tone={DOC_STATUS_TONE[doc.status]}>{DOC_STATUS_LABEL[doc.status]}</Badge>
                    </div>
                    <div className="doc-actions">
                      {doc.status === 'MISSING' || doc.status === 'REJECTED' ? (
                        <Button variant="primary" size="sm" disabled={sendingReminder} onClick={sendReminder}>
                          Send reminder
                        </Button>
                      ) : (
                        <button type="button" className="dtbtn" onClick={() => viewDocument(doc.id)}>
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="ov-h" style={{ fontSize: 13.5 }}>
            Follow-up notes
          </div>
          <div className="panel" style={{ padding: '12px 16px', marginBottom: 12 }}>
            {notes.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No notes yet.</p>
            ) : (
              notes.map((n) => (
                <div className="noterow" key={n.id}>
                  <div className="note-av">{initials(wioaCase.assignedPartnerStaffName ?? 'Staff')}</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{formatDate(n.sentAt)}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{n.body}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <label className="field-label">Add a note</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Left a voicemail, will follow up Friday"
            style={{ minHeight: 70 }}
          />
          <button
            type="button"
            className="btn-primary btn-sm"
            style={{ marginTop: 8, width: '100%' }}
            disabled={savingNote || !note.trim()}
            onClick={saveNote}
          >
            {savingNote ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  );
}
