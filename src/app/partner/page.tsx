import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaCases } from '@/lib/data/wioa';
import { getCoursePathwayList } from '@/lib/data/courses';
import { getProgressByLearner } from '@/lib/data/progress';
import { PartnerRosterView, type PartnerRosterRow } from '@/components/wioa/PartnerRosterView';

export default async function PartnerPage() {
  const user = await requirePartnerStaff();
  const cases = await getWioaCases(
    { userId: user.id, role: 'PARTNER_STAFF' },
    { assignedPartnerStaffId: user.id },
  );

  const pathwayCourses = await getCoursePathwayList();
  const progressByLearner = await getProgressByLearner(cases.map((c) => c.learnerId));

  const rows: PartnerRosterRow[] = cases.map((c) => {
    const progress = progressByLearner[c.learnerId] ?? {};
    const enrolledCount = pathwayCourses.filter((course) => progress[course.id]?.enrolled).length;
    return { ...c, enrolledCount, totalCourseCount: pathwayCourses.length };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>My Cases</h1>
          <p>Your assigned trainees — progress, missing documents, and follow-up notes.</p>
        </div>
      </div>

      <PartnerRosterView rows={rows} />
    </div>
  );
}
