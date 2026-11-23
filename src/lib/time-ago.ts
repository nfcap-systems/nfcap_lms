/** "5 minutes ago" / "3 hours ago" / "2 days ago" — shared by the reviewer queue and the learner's
 * evidence feedback screens (LRN06d–f). */
export function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return minutes <= 1 ? '1 minute ago' : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/** Day-granularity version for history lists (LRN06f: "Submitted today", "Submitted 2 days ago"). */
export function dayLabel(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
