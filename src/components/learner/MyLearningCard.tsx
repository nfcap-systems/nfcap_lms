'use client';

import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { CourseProgress } from '@/lib/data/progress';
import { courseLessonCount, type Course } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';

export function MyLearningCard({
  course,
  progress,
}: {
  course: Course;
  progress?: CourseProgress;
}) {
  const router = useRouter();
  const total = courseLessonCount(course);
  const done = progress?.completedLessonIds.length ?? 0;
  const isComplete = total > 0 && done === total;
  const status = getCourseStatus(course, progress);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone="neutral">{course.category}</Badge>
            <h3 className="mt-2 text-base font-semibold text-brand-heading">{course.title}</h3>
          </div>
          <Badge tone={courseStatusTone[status]}>{courseStatusLabel[status]}</Badge>
        </div>

        <ProgressBar
          value={done}
          max={total}
          label={`${done} of ${total} lessons`}
          showPercentage
        />

        <Button
          size="sm"
          variant={isComplete ? 'outline' : 'primary'}
          className="w-full"
          onClick={() => router.push(`/learner/courses/${course.id}`)}
        >
          {isComplete ? 'Review Course' : done > 0 ? 'Continue' : 'Start Course'}
          <Icon name="arrow-right" className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
