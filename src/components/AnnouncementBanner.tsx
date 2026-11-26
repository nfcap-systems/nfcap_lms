'use client';

import { useEffect } from 'react';
import { markAnnouncementRead } from '@/lib/actions/announcements';
import type { Announcement } from '@/lib/data/announcements';

/** Shared with src/app/learner/HomeView.tsx — same banner, same mark-read-on-view behavior,
 * for any role's dashboard that calls getActiveAnnouncementsForViewer. */
export function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  const [banner] = announcements;

  useEffect(() => {
    if (banner) void markAnnouncementRead(banner.id);
  }, [banner]);

  if (!banner) return null;

  return (
    <div className="announce-banner">
      <span className="announce-badge">New</span>
      <span className="announce-title">{banner.title}</span>
      <p className="announce-desc">{banner.body}</p>
    </div>
  );
}
