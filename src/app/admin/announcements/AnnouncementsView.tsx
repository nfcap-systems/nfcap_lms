'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AnnouncementAudience } from '@/generated/prisma/enums';
import type { AdminAnnouncement } from '@/lib/data/announcements';
import { publishAnnouncement } from '@/lib/actions/announcements';
import { Button } from '@/components/admin-ui/button';
import { Checkbox } from '@/components/admin-ui/checkbox';
import { Input } from '@/components/admin-ui/input';
import { Label } from '@/components/admin-ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin-ui/select';
import { Textarea } from '@/components/admin-ui/textarea';
import { Badge, StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';

const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: 'LEARNERS', label: 'Learners' },
  { value: 'ALL', label: 'All users (every role)' },
  { value: 'ADMIN', label: 'Admin staff' },
  { value: 'COORDINATOR', label: 'WIOA Coordinators' },
  { value: 'PARTNER', label: 'Partner staff' },
];

// Recent-announcements list needs a short label per row — "Learners"/"All" fit inline, the
// per-role ones ("Admin staff") are too long next to a title + relative date, so this is its own
// shorter map rather than reusing AUDIENCE_OPTIONS' compose-dropdown wording.
const AUDIENCE_SHORT_LABEL: Record<AnnouncementAudience, string> = {
  LEARNERS: 'Learners',
  ALL: 'All roles',
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinators',
  PARTNER: 'Partner Staff',
};

function formatDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

export function AnnouncementsView({
  announcements,
  audienceCounts,
  unverifiedEmailCount,
}: {
  announcements: AdminAnnouncement[];
  audienceCounts: Record<AnnouncementAudience, number>;
  unverifiedEmailCount: number;
}) {
  const router = useRouter();
  const [audience, setAudience] = useState<AnnouncementAudience>('LEARNERS');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recipientCount = audienceCounts[audience];
  const valid = title.trim().length > 0 && body.trim().length > 0;
  const latest = announcements[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Announcements</h1>
          <p>Compose and track delivery to learners.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div className="panel" style={{ flex: 1.1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 12 }}>Compose</div>
          <div className="flex flex-col gap-1.5" style={{ marginBottom: 12 }}>
            <Label htmlFor="ann-audience">Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
              <SelectTrigger id="ann-audience" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5" style={{ marginBottom: 12 }}>
            <Label htmlFor="ann-subject">Subject</Label>
            <Input
              id="ann-subject"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New safety video added to Flooring Fundamentals"
            />
          </div>
          <div className="flex flex-col gap-1.5" style={{ marginBottom: 12 }}>
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ minHeight: 140 }}
              placeholder="What do you want this audience to know?"
            />
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              marginBottom: 16,
              color: 'var(--ink-muted)',
            }}
          >
            <Checkbox disabled />
            Also send as email — not yet built (no verified sending domain, see Phase 2 notes)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="sm"
              disabled={!valid || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await publishAnnouncement({ title: title.trim(), body: body.trim(), audience });
                  toast.success(
                    `Sent to ${recipientCount} ${recipientCount === 1 ? 'person' : 'people'}`,
                  );
                  setTitle('');
                  setBody('');
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Could not send the announcement.');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Send to {recipientCount} {recipientCount === 1 ? 'person' : 'people'}
            </Button>
          </div>
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 12 }}>
            Delivery coverage — last sent
          </div>
          {latest ? (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Delivered</th>
                    <th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>In-app</td>
                    <td>
                      {latest.audienceSize} / {latest.audienceSize}
                    </td>
                    <td>{latest.readCount}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-muted)' }}>
                Email delivery isn&apos;t built yet — announcements are in-app only until a sending
                domain is verified.
              </div>
              {unverifiedEmailCount > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-muted)' }}>
                  {unverifiedEmailCount} learner{unverifiedEmailCount === 1 ? '' : 's'} have no
                  verified email on file.
                </div>
              )}
            </>
          ) : (
            <StateCard
              icon={<Icon name="bell" className="h-5 w-5" />}
              title="No announcements sent yet"
              description="Delivery coverage for your first announcement will show up here."
            />
          )}

          <div
            style={{
              marginTop: 18,
              borderTop: '1px solid var(--nfcap-border)',
              paddingTop: 14,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
              Recent announcements
            </div>
            {announcements.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>None sent yet.</div>
            ) : (
              announcements.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    fontSize: 12.5,
                    padding: '7px 0',
                    borderBottom: '1px solid var(--nfcap-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{a.title}</span>
                    <span style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>
                      {formatDate(a.publishedAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Badge tone="neutral">{AUDIENCE_SHORT_LABEL[a.audience]}</Badge>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                      Delivered to {a.audienceSize} {a.audienceSize === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
