import Link from 'next/link';
import { Badge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { CurriculumBuilderView } from '@/components/admin/CurriculumBuilderView';
import { getCourseBySlug } from '@/lib/data/courses';

export default async function CurriculumBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseBySlug(courseId);

  if (!course) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-text-secondary">Course not found.</p>
        <Link
          href="/admin/courses"
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Curriculum Builder
          </p>
          <h1 className="text-xl font-semibold text-brand-heading">{course.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{course.category}</Badge>
            {course.access === 'restricted' && (
              <Badge tone="restricted">
                <Icon name="lock" className="size-3" />
                Restricted
              </Badge>
            )}
            <Badge tone={course.published ? 'success' : 'neutral'}>
              {course.published ? 'Published' : 'Unpublished'}
            </Badge>
          </div>
        </div>
        <Link
          href={`/learner/courses/${course.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border-default bg-transparent px-3 text-sm font-medium text-text-primary transition-colors hover:bg-brand-tint"
        >
          <Icon name="arrow-right" className="size-4" />
          Preview as Learner
        </Link>
      </div>
      <CurriculumBuilderView course={course} />
    </div>
  );
}
