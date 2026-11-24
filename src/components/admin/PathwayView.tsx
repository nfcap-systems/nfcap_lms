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

      {course.access === 'restricted' ? (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            color: 'var(--ink-muted)',
            cursor: pending ? 'default' : 'pointer',
          }}
        >
          <input type="checkbox" checked disabled={pending} onChange={onToggleAccess} />
          Restricted — requires a CourseUnlock grant
        </label>
      ) : (
        <button
          type="button"
          onClick={onToggleAccess}
          disabled={pending}
          className="badge-neutral"
          style={{ border: 'none', cursor: pending ? 'default' : 'pointer' }}
        >
          Open to all
        </button>
      )}
    </div>
  );
}
