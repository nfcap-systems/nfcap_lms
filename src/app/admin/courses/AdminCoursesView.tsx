'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Drawer,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { createCourse, setCoursePublished } from '@/lib/actions/courses';
import { courseLessonCount, type CourseAccess } from '@/lib/types';
import type { AdminCourse } from '@/lib/data/courses';

type ViewMode = 'card' | 'table';

export function AdminCoursesView({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<ViewMode>('table');
  const [addOpen, setAddOpen] = useState(false);

  const sorted = [...courses].sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  function togglePublished(course: AdminCourse) {
    startTransition(async () => {
      await setCoursePublished(course.id, !course.published);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-brand-heading">Courses</h1>
          <p className="mt-1 text-sm text-text-secondary">
            All courses in the apprenticeship program. Open a course to manage its sections,
            lessons, and knowledge assessment in the Curriculum Builder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 items-center gap-0.5 rounded-md border border-border-default p-0.5">
            <button
              type="button"
              onClick={() => setView('table')}
              aria-label="Table view"
              aria-pressed={view === 'table'}
              className={cn(
                'flex h-full w-7 shrink-0 items-center justify-center rounded-sm transition-colors',
                view === 'table'
                  ? 'bg-brand-primary text-on-brand'
                  : 'text-text-secondary hover:bg-bg-subtle',
              )}
            >
              <Icon name="list" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('card')}
              aria-label="Card view"
              aria-pressed={view === 'card'}
              className={cn(
                'flex h-full w-7 shrink-0 items-center justify-center rounded-sm transition-colors',
                view === 'card'
                  ? 'bg-brand-primary text-on-brand'
                  : 'text-text-secondary hover:bg-bg-subtle',
              )}
            >
              <Icon name="grid" className="size-4" />
            </button>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Icon name="plus" className="size-4" />
            Add Course
          </Button>
        </div>
      </div>

      {view === 'card' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onOpen={() => router.push(`/admin/courses/${course.id}`)}
              onTogglePublished={() => togglePublished(course)}
            />
          ))}
        </div>
      ) : (
        <CourseTable
          courses={sorted}
          onOpen={(id) => router.push(`/admin/courses/${id}`)}
          onTogglePublished={togglePublished}
        />
      )}

      <AddCourseDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(slug) => router.push(`/admin/courses/${slug}`)}
      />
    </div>
  );
}

function CourseCard({
  course,
  onOpen,
  onTogglePublished,
}: {
  course: AdminCourse;
  onOpen: () => void;
  onTogglePublished: () => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Badge tone="neutral">{course.category}</Badge>
          <div className="flex items-center gap-1.5">
            {course.access === 'restricted' && (
              <Badge tone="restricted">
                <Icon name="lock" className="size-3" />
                Restricted
              </Badge>
            )}
            <Badge tone={course.published ? 'success' : 'neutral'}>
              {course.published ? 'Published' : 'Unpublished'}
            </Badge>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-brand-heading">{course.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{course.description}</p>
        </div>

        <div className="mt-auto flex items-center gap-4 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="layers" className="size-3.5" />
            {course.sections.length} sections
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="book" className="size-3.5" />
            {courseLessonCount(course)} lessons
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="flex-1" variant="outline" onClick={onOpen}>
            Edit curriculum
            <Icon name="arrow-right" className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onTogglePublished}>
            {course.published ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseTable({
  courses,
  onOpen,
  onTogglePublished,
}: {
  courses: AdminCourse[];
  onOpen: (courseId: string) => void;
  onTogglePublished: (course: AdminCourse) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs font-semibold tracking-wide text-text-muted uppercase">
              <th className="px-5 py-3 font-semibold">Course</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Sections</th>
              <th className="px-5 py-3 font-semibold">Lessons</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="px-5 py-4">
                  <p className="font-medium text-text-primary">{course.title}</p>
                  <p className="text-xs text-text-muted">{course.category}</p>
                </td>
                <td className="px-5 py-4">
                  <Badge tone={course.published ? 'success' : 'neutral'}>
                    {course.published ? 'Published' : 'Unpublished'}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-text-secondary">{course.sections.length}</td>
                <td className="px-5 py-4 text-text-secondary">{courseLessonCount(course)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => onOpen(course.id)}>
                      Edit curriculum
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onTogglePublished(course)}>
                      {course.published ? 'Unpublish' : 'Publish'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AddCourseDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (courseSlug: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [access, setAccess] = useState<CourseAccess>('open');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setAccess('open');
  };

  const valid =
    title.trim().length > 0 && description.trim().length > 0 && category.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Add Course"
      description="Appended to the end of the apprenticeship pathway. You'll build its curriculum next."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || submitting}
            onClick={async () => {
              setSubmitting(true);
              const { slug } = await createCourse({
                title: title.trim(),
                description: description.trim(),
                category: category.trim(),
                access,
              });
              setSubmitting(false);
              onClose();
              reset();
              onCreated(slug);
            }}
          >
            Add Course
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Course title" htmlFor="course-title">
          <Input
            id="course-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Baseboard & Trim Finishing"
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="course-description">
          <Textarea
            id="course-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this course covers..."
          />
        </Field>
        <Field
          label="Category"
          htmlFor="course-category"
          hint="e.g. Foundations, Trade Skills, Career Readiness"
        >
          <Input
            id="course-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Trade Skills"
          />
        </Field>
        <Field label="Enrollment" htmlFor="course-access">
          <Select
            id="course-access"
            value={access}
            onChange={(e) => setAccess(e.target.value as CourseAccess)}
          >
            <option value="open">Open — learners can self-enroll</option>
            <option value="restricted">Restricted — assigned by NFCAP</option>
          </Select>
        </Field>
      </div>
    </Drawer>
  );
}
