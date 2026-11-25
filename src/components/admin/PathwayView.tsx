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
import { toast } from 'sonner';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
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

    // startTransition must NOT be called from inside a setState updater callback — that callback
    // can run during React's render phase, and calling startTransition there throws "Cannot call
    // startTransition while rendering" (seen live in dev: PathwayView[handleDragEnd > setOrdered]).
    // Compute `next` from the closure's `ordered` instead, since this handler only ever runs from
    // a user drag event, never during render.
    const oldIndex = ordered.findIndex((c) => c.id === active.id);
    const newIndex = ordered.findIndex((c) => c.id === over.id);
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    startTransition(async () => {
      try {
        await reorderPathway(next.map((c) => c.id));
        toast.success('Pathway order updated');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update the pathway order.');
      }
    });
  }

  function handleAccessToggle(course: AdminCourse) {
    const nextAccess: CourseAccess = course.access === 'restricted' ? 'open' : 'restricted';
    setPendingAccess((prev) => ({ ...prev, [course.id]: true }));
    setOrdered((current) =>
      current.map((c) => (c.id === course.id ? { ...c, access: nextAccess } : c)),
    );
    startTransition(async () => {
      try {
        await setCourseAccess(course.id, nextAccess);
        toast.success(
          nextAccess === 'restricted' ? `${course.title} is now restricted` : `${course.title} is now open to all`,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update course access.');
      } finally {
        setPendingAccess((prev) => {
          const rest = { ...prev };
          delete rest[course.id];
          return rest;
        });
      }
    });
  }

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--nfcap-border)',
          fontWeight: 600,
          fontSize: 14.5,
        }}
      >
        Pathway order — drag to reorder
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div>
            {ordered.map((course, index) => (
              <PathwayRow
                key={course.id}
                course={course}
                position={index + 1}
                pending={Boolean(pendingAccess[course.id])}
                onToggleAccess={() => handleAccessToggle(course)}
              />
            ))}
          </div>
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
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: course.access === 'restricted' ? 'var(--surface-muted)' : undefined,
      }}
      className={cn('step', isDragging && 'relative z-10 shadow-md')}
    >
      <button
        type="button"
        aria-label={`Reorder ${course.title}`}
        className="handle"
        style={{ background: 'none', border: 'none', padding: 0, display: 'flex' }}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip-vertical" className="h-4 w-4" />
      </button>

      <span style={{ width: 22, fontWeight: 700, color: 'var(--ink-muted)' }}>{position}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{course.title}</div>
        {!course.published && (
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Unpublished</div>
        )}
      </div>

      <span
        className={course.access === 'restricted' ? 'badge-neutral' : 'badge-accent'}
        style={{ flex: 'none' }}
      >
        {course.access === 'restricted' && <Icon name="lock" className="h-3 w-3" />}
        {course.access === 'restricted' ? 'Restricted' : 'Open to all'}
      </span>

      <button
        type="button"
        onClick={onToggleAccess}
        disabled={pending}
        className="btn-secondary btn-sm"
        style={{ flex: 'none' }}
      >
        {course.access === 'restricted' ? 'Open to all' : 'Restrict'}
      </button>
    </div>
  );
}
