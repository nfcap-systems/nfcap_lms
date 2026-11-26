import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaCases } from '@/lib/data/wioa';
import { getCoursePathwayList } from '@/lib/data/courses';
import { getProgressByLearner } from '@/lib/data/progress';
import { getCohortMembershipsForLearners } from '@/lib/data/cohorts';
import { getActiveAnnouncementsForViewer } from '@/lib/data/announcements';
import { PartnerRosterView, type PartnerRosterRow } from '@/components/wioa/PartnerRosterView';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

export default async function PartnerPage() {
  const user = await requirePartnerStaff();

  // getCoursePathwayList doesn't depend on `cases` at all, but was previously stuck waiting for
  // it to resolve before even starting — the two run concurrently instead now.
  const [cases, pathwayCourses, announcements] = await Promise.all([
    getWioaCases({ userId: user.id, role: 'PARTNER_STAFF' }, { assignedPartnerStaffId: user.id }),
    getCoursePathwayList(),
    getActiveAnnouncementsForViewer(user.id, 'partner'),
  ]);

  const [progressByLearner, cohortMembershipByLearner] = await Promise.all([
    getProgressByLearner(cases.map((c) => c.learnerId)),
    getCohortMembershipsForLearners(cases.map((c) => c.learnerId)),
  ]);

  const rows: PartnerRosterRow[] = cases.map((c) => {
    const progress = progressByLearner[c.learnerId] ?? {};
    const enrolledCount = pathwayCourses.filter((course) => progress[course.id]?.enrolled).length;
    return {
      ...c,
      enrolledCount,
      totalCourseCount: pathwayCourses.length,
      cohortName: cohortMembershipByLearner.get(c.learnerId)?.cohortName ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>My Cases</h1>
          <p>Your assigned trainees — progress, missing documents, and follow-up notes.</p>
        </div>
      </div>

      <AnnouncementBanner announcements={announcements} />

      <PartnerRosterView rows={rows} />
    </div>
  );
}
