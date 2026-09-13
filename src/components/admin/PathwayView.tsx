'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Card } from '@/components/ui';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { reorderPathway, setCourseAccess } from '@/lib/actions/courses';
import type { CourseAccess } from '@/lib/types';
import type { AdminCourse } from '@/lib/data/courses';

export function PathwayView({ courses }: { courses: AdminCourse[] }) {
  const [, startTransition] = useTransition();
  const [ordered, setOrdered] = useState(() =>
    [...courses].sort((a, b) => a.pathwayOrder - b.pathwayOrder),
  );
  const [pendingAccess, setPendingAccess] = useState<Record<string, boolean>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrdered((current) => {
      const oldIndex = current.findIndex((c) => c.id === active.id);
      const newIndex = current.findIndex((c) => c.id === over.id);
      const next = arrayMove(current, oldIndex, newIndex);
      startTransition(async () => {
        await reorderPathway(next.map((c) => c.id));
      });
      return next;
    });
  }

  function handleAccessToggle(course: AdminCourse) {
    const nextAccess: CourseAccess = course.access === 'restricted' ? 'open' : 'restricted';
    setPendingAccess((prev) => ({ ...prev, [course.id]: true }));
    setOrdered((current) =>
      current.map((c) => (c.id === course.id ? { ...c, access: nextAccess } : c)),
    );
    startTransition(async () => {
      await setCourseAccess(course.id, nextAccess);
      setPendingAccess((prev) => {
        const rest = { ...prev };
        delete rest[course.id];
        return rest;
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Drag to reorder the apprenticeship pathway. A learner sees a{' '}
        <span className="font-medium text-text-primary">Restricted</span> course as locked until
        the course before it in this order is completed.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border-subtle">
              {ordered.map((course, index) => (
                <PathwayRow
                  key={course.id}
                  course={course}
                  position={index + 1}
                  pending={Boolean(pendingAccess[course.id])}
                  onToggleAccess={() => handleAccessToggle(course)}
                />
              ))}
            </ul>
          </Card>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function PathwayRow({
  course,
  position,
  pending,
  onToggleAccess,
}: {
  course: AdminCourse;
  position: number;
  pending: boolean;
  onToggleAccess: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 bg-bg-card px-4 py-3',
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${course.title}`}
        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-text-muted hover:bg-bg-subtle active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Icon name="grip-vertical" className="size-4" />
      </button>

      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand-primary">
        {String(position).padStart(2, '0')}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
        <p className="truncate text-xs text-text-muted">{course.category}</p>
      </div>

      {!course.published && <Badge tone="neutral">Unpublished</Badge>}

      <button
        type="button"
        onClick={onToggleAccess}
        disabled={pending}
        className={cn(
          'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60',
          course.access === 'restricted'
            ? 'border-status-restricted-border bg-status-restricted-bg text-status-restricted-text'
            : 'border-border-default bg-bg-subtle text-text-secondary hover:border-brand-primary/40',
        )}
      >
        {course.access === 'restricted' ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="lock" className="size-3" />
            Restricted
          </span>
        ) : (
          'Open'
        )}
      </button>
    </li>
  );
}
