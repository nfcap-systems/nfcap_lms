import { notFound } from 'next/navigation';
import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaCaseDetail } from '@/lib/data/wioa';
import { getCoursePathwayList } from '@/lib/data/courses';
import { getLearnerProgressMap } from '@/lib/data/progress';
import {
  PartnerTraineeDetailView,
  type TraineeCourseProgress,
} from '@/components/wioa/PartnerTraineeDetailView';

export default async function PartnerCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const user = await requirePartnerStaff();
  const { caseId } = await params;
  const wioaCase = await getWioaCaseDetail({ userId: user.id, role: 'PARTNER_STAFF' }, caseId);
  // Partner Staff only ever sees their own assigned cases — a case ID typed/pasted for someone
  // else's case renders as not-found rather than leaking whether it exists.
  if (!wioaCase || wioaCase.assignedPartnerStaffId !== user.id) notFound();

  const [pathwayCourses, progress] = await Promise.all([
    getCoursePathwayList(),
    getLearnerProgressMap(wioaCase.learnerId),
  ]);

  const courseProgress: TraineeCourseProgress[] = pathwayCourses.map((course) => {
    const p = progress[course.id];
    const status: TraineeCourseProgress['status'] = p?.certificateId
      ? 'complete'
      : p?.enrolled
        ? 'in-progress'
        : 'not-started';
    return { courseId: course.id, title: course.title, status };
  });

  return <PartnerTraineeDetailView wioaCase={wioaCase} courseProgress={courseProgress} />;
}
