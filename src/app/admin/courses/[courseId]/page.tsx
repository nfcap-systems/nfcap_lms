import Link from 'next/link';
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
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Curriculum Builder
        </p>
        <h1 className="text-xl font-semibold text-brand-heading">{course.title}</h1>
      </div>
      <CurriculumBuilderView course={course} />
    </div>
  );
}
