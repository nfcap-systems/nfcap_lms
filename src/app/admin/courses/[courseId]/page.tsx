import Link from 'next/link';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui';
import { CurriculumBuilderView } from '@/components/admin/CurriculumBuilderView';
import { getAssessmentCriteria, getCourseBySlug } from '@/lib/data/courses';

export default async function CurriculumBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [course, criteria] = await Promise.all([
    getCourseBySlug(courseId),
    getAssessmentCriteria(courseId),
  ]);

  if (!course) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Link href="/admin/courses" className="text-sm font-medium text-primary hover:underline">
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
            Courses / <b style={{ color: 'var(--ink)' }}>{course.title}</b> / Curriculum
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{course.category}</Badge>
            {course.access === 'restricted' && (
              <Badge tone="neutral">
                <Icon name="lock" className="size-3" />
                Restricted
              </Badge>
            )}
            <Badge tone={course.published ? 'success' : 'neutral'}>
              {course.published ? 'Published' : 'Unpublished'}
            </Badge>
          </div>
        </div>
        <Link href={`/learner/courses/${course.id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
          <Icon name="arrow-right" className="size-4" />
          Preview as Learner
        </Link>
      </div>
      <CurriculumBuilderView course={course} criteria={criteria} />
    </div>
  );
}
