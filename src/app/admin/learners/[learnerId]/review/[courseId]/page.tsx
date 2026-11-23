import { notFound } from 'next/navigation';
import { getLearnerById } from '@/lib/data/learners';
import { getCourseBySlug } from '@/lib/data/courses';
import { getCriterionReview } from '@/lib/data/criterionReview';
import { CriterionReviewView } from '@/components/admin/CriterionReviewView';
import { StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';

export default async function AdminCriterionReviewPage({
  params,
}: {
  params: Promise<{ learnerId: string; courseId: string }>;
}) {
  const { learnerId, courseId } = await params;
  const [learner, course, review] = await Promise.all([
    getLearnerById(learnerId),
    getCourseBySlug(courseId),
    getCriterionReview(learnerId, courseId),
  ]);
  if (!learner || !course) notFound();

  if (!review) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pagehdr">
          <div>
            <h1>
              {learner.name} — {course.title}
            </h1>
            <p>Review Queue / per-criterion evidence review</p>
          </div>
        </div>
        <StateCard
          icon={<Icon name="paperclip" className="h-5 w-5" />}
          title="No evidence submitted yet"
          description={`${learner.name} hasn't submitted practical evidence for ${course.title} yet.`}
        />
      </div>
    );
  }

  return <CriterionReviewView learner={learner} course={course} review={review} />;
}
