'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Icon } from '@/components/icons';
import { notificationTypeIcon } from '@/lib/notifications/display';
import { timeAgo } from '@/lib/time-ago';
import { useClampedPanelPosition } from '@/lib/notifications/useClampedPanelPosition';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications';
import type { Notification } from '@/lib/data/notifications';

/** LRN18-NotificationsPanel. Replaces the shared `NotificationsMenu` (NOTIF-1) — the learner side
 * of the split `ADM18`/`LRN18` boards settle on (CLAUDE.local.md #1: one component rendering fine
 * for two roles isn't evidence it's right for either). Learner volume is low ("a few a week" per
 * the kickoff plan's Decision 1), so this stays a plain read list — no filter tabs, unlike the
 * staff panel. */
export function LearnerNotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelStyle = useClampedPanelPosition(buttonRef, open, { width: 352 });

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // markNotificationRead/markAllNotificationsRead throw via requireUser() (session expired is the
  // realistic case) — this bell renders in every layout, on a tree whose shape varies with data
  // (empty vs N items), exactly the condition CLAUDE.md's "Error handling convention" and
  // CLAUDE.local.md #11 warn can swallow a thrown Server Action error into a useless generic
  // error. These two stay `throw`-based (CLAUDE.md: reserve throw for access-control failures,
  // which session expiry is) but the caller still needs to not leave the panel silently broken —
  // a toast plus bailing out before navigating, so a failed mark-read doesn't quietly load the
  // destination as if it had succeeded.
  function handleSelect(notification: Notification) {
    setOpen(false);
    startTransition(async () => {
      try {
        if (!notification.read) await markNotificationRead(notification.id);
      } catch {
        toast.error('Could not update that notification. Try refreshing the page.');
        return;
      }
      if (notification.link) router.push(notification.link);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
      } catch {
        toast.error('Could not mark notifications as read. Try refreshing the page.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="lhdr-iconbtn2 relative"
      >
        <Icon name="bell" className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--status-problem)]"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={panelStyle}
          className="z-50 overflow-hidden rounded-2xl border border-[var(--nfcap-border)] bg-[var(--surface)] shadow-elevated"
        >
          <div className="flex items-center justify-between border-b border-[var(--nfcap-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--ink)]">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[var(--nfcap-accent)] hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--ink-muted)]">
              You&apos;re all caught up — nothing new yet.
            </p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    disabled={pending}
                    className={`flex w-full gap-3 border-b border-[var(--nfcap-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-muted)] disabled:opacity-60 ${
                      notification.read ? '' : 'bg-[var(--surface-muted)]'
                    }`}
                  >
                    <Icon
                      name={notificationTypeIcon(notification.type)}
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--nfcap-accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-[var(--ink)]">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-[var(--status-problem)]"
                          />
                        )}
                      </span>
                      <span className="line-clamp-2 text-xs text-[var(--ink-muted)]">
                        {notification.body}
                      </span>
                      <span className="mt-0.5 block text-[0.6875rem] text-[var(--ink-muted)]">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
