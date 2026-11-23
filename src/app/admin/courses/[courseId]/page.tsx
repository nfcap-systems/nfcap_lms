import Link from 'next/link';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/admin-ui/badge';
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
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Curriculum Builder
          </p>
          <h1 className="text-xl font-semibold text-foreground">{course.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{course.category}</Badge>
            {course.access === 'restricted' && (
              <Badge variant="outline">
                <Icon name="lock" className="size-3" />
                Restricted
              </Badge>
            )}
            <Badge variant={course.published ? 'success' : 'outline'}>
              {course.published ? 'Published' : 'Unpublished'}
            </Badge>
          </div>
        </div>
        <Link
          href={`/learner/courses/${course.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Icon name="arrow-right" className="size-4" />
          Preview as Learner
        </Link>
      </div>
      <CurriculumBuilderView course={course} criteria={criteria} />
    </div>
  );
}
