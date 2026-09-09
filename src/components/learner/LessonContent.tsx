import { Badge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { lessonTypeIcon, lessonTypeLabel } from './lesson-type';
import type { Lesson } from '@/lib/types';

export function LessonContent({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Badge tone="info">
          <Icon name={lessonTypeIcon[lesson.type]} className="size-3" />
          {lessonTypeLabel[lesson.type]}
        </Badge>
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" className="size-3.5" />
          {lesson.durationMinutes} min
        </span>
      </div>

      <h2 className="text-lg font-semibold text-brand-heading">{lesson.title}</h2>

      {lesson.type === 'video' && (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-brand-primary text-on-brand">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/15">
              <Icon name="play" className="size-6" />
            </div>
            <span className="text-sm text-white/80">{lesson.durationMinutes} min video</span>
          </div>
        </div>
      )}

      {lesson.type === 'image' && (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-bg-subtle text-text-muted">
          <Icon name="image" className="size-10" />
        </div>
      )}

      {lesson.type === 'resource' && (
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-subtle p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bg-card text-brand-primary">
            <Icon name="paperclip" className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{lesson.resourceLabel}</p>
            <p className="text-xs text-text-muted">Downloadable resource</p>
          </div>
        </div>
      )}

      <p className="text-sm leading-relaxed text-text-secondary">{lesson.body}</p>
    </div>
  );
}
