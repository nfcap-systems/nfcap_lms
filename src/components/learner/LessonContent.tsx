import { Badge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { lessonTypeIcon, lessonTypeLabel } from './lesson-type';
import type { ContentBlock, Lesson } from '@/lib/types';

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

      {lesson.blocks.length === 0 ? (
        <p className="text-sm text-text-muted">This lesson has no content yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {lesson.blocks.map((block) => (
            <ContentBlockView key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'header-1':
      return <h1 className="text-xl font-semibold text-brand-heading">{block.content}</h1>;
    case 'header-2':
      return <h2 className="text-lg font-semibold text-brand-heading">{block.content}</h2>;
    case 'header-3':
      return <h3 className="text-base font-semibold text-brand-heading">{block.content}</h3>;
    case 'bullet-list':
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-secondary">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'numbered-list':
      return (
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-text-secondary">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case 'image':
      return (
        <figure className="flex flex-col gap-2">
          {block.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URLs, not a local/optimizable asset
            <img
              src={block.url}
              alt={block.content || 'Lesson image'}
              className="w-full rounded-xl border border-border-subtle object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-bg-subtle text-text-muted">
              <Icon name="image" className="size-10" />
            </div>
          )}
          {block.content && <figcaption className="text-xs text-text-muted">{block.content}</figcaption>}
        </figure>
      );
    case 'video':
      return (
        <figure className="flex flex-col gap-2">
          {block.url ? (
            <video controls className="w-full rounded-xl border border-border-subtle" src={block.url} />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-brand-primary text-on-brand">
              <div className="flex size-14 items-center justify-center rounded-full bg-white/15">
                <Icon name="play" className="size-6" />
              </div>
            </div>
          )}
          {block.content && <figcaption className="text-xs text-text-muted">{block.content}</figcaption>}
        </figure>
      );
    case 'text':
    default:
      return <p className="text-sm leading-relaxed text-text-secondary">{block.content}</p>;
  }
}
