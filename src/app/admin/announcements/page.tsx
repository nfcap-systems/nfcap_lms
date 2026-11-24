import { requireAdmin } from '@/lib/actions/guard';
import {
  getAnnouncementsForAdmin,
  getAudienceCounts,
  getUnverifiedEmailLearnerCount,
} from '@/lib/data/announcements';
import { AnnouncementsView } from './AnnouncementsView';

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const [announcements, audienceCounts, unverifiedEmailCount] = await Promise.all([
    getAnnouncementsForAdmin(),
    getAudienceCounts(),
    getUnverifiedEmailLearnerCount(),
  ]);

  return (
    <AnnouncementsView
      announcements={announcements}
      audienceCounts={audienceCounts}
      unverifiedEmailCount={unverifiedEmailCount}
    />
  );
}
