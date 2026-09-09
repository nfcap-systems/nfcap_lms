import type { IconName } from '@/components/icons';
import type { LessonType } from '@/lib/types';

export const lessonTypeIcon: Record<LessonType, IconName> = {
  video: 'play',
  text: 'file-text',
  image: 'image',
  resource: 'paperclip',
};

export const lessonTypeLabel: Record<LessonType, string> = {
  video: 'Video',
  text: 'Reading',
  image: 'Reference image',
  resource: 'Resource',
};
