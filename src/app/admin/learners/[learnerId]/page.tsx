import { notFound } from 'next/navigation';
import { getLearnerById } from '@/lib/data/learners';
import { getAllCourses, getCriteriaCountsByCourseSlug } from '@/lib/data/courses';
import { getLearnerProgressMap, getCourseUnlocksForLearner } from '@/lib/data/progress';
import { LearnerProfileView } from '@/components/admin/LearnerProfileView';

export default async function AdminLearnerProfilePage({
  params,
}: {
  params: Promise<{ learnerId: string }>;
}) {
  const { learnerId } = await params;
  const learner = await getLearnerById(learnerId);
  if (!learner) notFound();

  const [courses, progress, courseUnlocks, criteriaCounts] = await Promise.all([
    getAllCourses(),
    getLearnerProgressMap(learnerId),
    getCourseUnlocksForLearner(learnerId),
    getCriteriaCountsByCourseSlug(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Learner</p>
        <h1 className="text-xl font-semibold text-foreground">{learner.name}</h1>
        <p className="text-sm text-muted-foreground">{learner.email}</p>
      </div>
      <LearnerProfileView
        learner={learner}
        courses={courses}
        progress={progress}
        courseUnlocks={courseUnlocks}
        criteriaCounts={criteriaCounts}
      />
    </div>
  );
}
