'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { Icon } from '@/components/icons';
import { MyLearningCard } from '@/components/learner/MyLearningCard';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';

export function MyLearningView({
  courses,
  progressMap,
}: {
  courses: AdminCourse[];
  progressMap: Record<string, CourseProgress>;
}) {
  const router = useRouter();
  const enrolledCourses = [...courses]
    .filter((course) => progressMap[course.id]?.enrolled)
    .sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  if (enrolledCourses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <div className="flex size-10 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
            <Icon name="book" className="size-5" />
          </div>
          <h2 className="text-base font-semibold text-brand-heading">
            You&apos;re not enrolled in any courses yet
          </h2>
          <p className="max-w-md text-sm text-text-secondary">
            Head to the Course Catalog to browse NFCAP&apos;s training library and enroll in an open
            course.
          </p>
          <Button size="sm" onClick={() => router.push('/learner/explore')}>
            Browse Course Catalog
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {enrolledCourses.map((course) => (
        <MyLearningCard key={course.id} course={course} progress={progressMap[course.id]} />
      ))}
    </div>
  );
}
