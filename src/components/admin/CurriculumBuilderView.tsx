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
import { lessonTypeIcon, lessonTypeLabel } from '@/components/learner/lesson-type';
import { addLesson, addQuestion, addSection } from '@/lib/actions/curriculum';
import type { Course, LessonType } from '@/lib/types';

type ModalState =
  | { type: 'section' }
  | { type: 'lesson'; sectionId: string; sectionTitle: string }
  | { type: 'question' }
  | null;

export function CurriculumBuilderView({ course }: { course: Course }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { sections } = course;
  const questions = course.assessment.questions;
  const [modal, setModal] = useState<ModalState>(null);

  function runAndRefresh(action: Promise<void>) {
    startTransition(async () => {
      await action;
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{course.category}</Badge>
            {course.access === 'restricted' ? (
              <Badge tone="restricted">
                <Icon name="lock" className="size-3" />
                Restricted
              </Badge>
            ) : (
              <Badge tone="info">Open</Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">{course.description}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Sections & Lessons</h2>
          <Button size="sm" variant="outline" onClick={() => setModal({ type: 'section' })}>
            <Icon name="layers" className="size-4" />
            Add Section
          </Button>
        </div>

        {sections.map((section) => (
          <Card key={section.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-brand-heading">{section.title}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setModal({ type: 'lesson', sectionId: section.id, sectionTitle: section.title })
                  }
                >
                  <Icon name="book" className="size-4" />
                  Add Lesson
                </Button>
              </div>

              {section.lessons.length === 0 ? (
                <p className="text-xs text-text-muted">No lessons yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border-subtle">
                  {section.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-2.5 py-2 text-sm">
                      <Icon
                        name={lessonTypeIcon[lesson.type]}
                        className="size-4 shrink-0 text-text-muted"
                      />
                      <span className="flex-1 text-text-primary">{lesson.title}</span>
                      <span className="text-xs text-text-muted">
                        {lessonTypeLabel[lesson.type]}
                      </span>
                      <span className="text-xs text-text-muted">{lesson.durationMinutes} min</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Knowledge Assessment</h2>
          <Button size="sm" variant="outline" onClick={() => setModal({ type: 'question' })}>
            <Icon name="clipboard" className="size-4" />
            Add Question
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-text-muted">
              Pass threshold: {Math.round(course.assessment.passThreshold * 100)}% ·{' '}
              {questions.length} questions
            </p>
            <ul className="flex flex-col gap-3">
              {questions.map((q, i) => (
                <li key={q.id} className="rounded-xl border border-border-subtle p-3">
                  <p className="text-sm font-medium text-text-primary">
                    {i + 1}. {q.prompt}
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {q.options.map((option, oi) => (
                      <li
                        key={oi}
                        className="flex items-center gap-1.5 text-xs text-text-secondary"
                      >
                        {oi === q.correctIndex && (
                          <Icon name="check" className="size-3 shrink-0 text-status-success-text" />
                        )}
                        {option}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {modal?.type === 'section' && (
        <AddSectionDialog
          onClose={() => setModal(null)}
          onSubmit={(title) => runAndRefresh(addSection(course.id, title))}
        />
      )}
      {modal?.type === 'lesson' && (
        <AddLessonDialog
          sectionTitle={modal.sectionTitle}
          onClose={() => setModal(null)}
          onSubmit={(lesson) => runAndRefresh(addLesson(course.id, modal.sectionId, lesson))}
        />
      )}
      {modal?.type === 'question' && (
        <AddQuestionDialog
          onClose={() => setModal(null)}
          onSubmit={(q) => runAndRefresh(addQuestion(course.id, q))}
        />
      )}
    </div>
  );
}

function AddSectionDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState('');
  return (
    <Drawer
      open
      onClose={onClose}
      title="Add Section"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim()}
            onClick={() => {
              onSubmit(title.trim());
              onClose();
            }}
          >
            Add Section
          </Button>
        </>
      }
    >
      <Field label="Section title" htmlFor="section-title">
        <Input
          id="section-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finishing Techniques"
          autoFocus
        />
      </Field>
    </Drawer>
  );
}

const lessonTypes: LessonType[] = ['video', 'text', 'image', 'resource'];

function AddLessonDialog({
  sectionTitle,
  onClose,
  onSubmit,
}: {
  sectionTitle: string;
  onClose: () => void;
  onSubmit: (lesson: {
    title: string;
    type: LessonType;
    durationMinutes: number;
    body: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LessonType>('text');
  const [duration, setDuration] = useState(5);
  const [body, setBody] = useState('');

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add Lesson"
      description={`Adding to "${sectionTitle}"`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || !body.trim()}
            onClick={() => {
              onSubmit({ title: title.trim(), type, durationMinutes: duration, body: body.trim() });
              onClose();
            }}
          >
            Add Lesson
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Lesson title" htmlFor="lesson-title">
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Baseboard Trim Basics"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="lesson-type">
            <Select
              id="lesson-type"
              value={type}
              onChange={(e) => setType(e.target.value as LessonType)}
            >
              {lessonTypes.map((t) => (
                <option key={t} value={t}>
                  {lessonTypeLabel[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duration (min)" htmlFor="lesson-duration">
            <Input
              id="lesson-duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 1)}
            />
          </Field>
        </div>
        <Field label="Body / description" htmlFor="lesson-body">
          <Textarea
            id="lesson-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Lesson content or description..."
          />
        </Field>
      </div>
    </Drawer>
  );
}

function AddQuestionDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (question: { prompt: string; options: string[]; correctIndex: number }) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);

  const valid = prompt.trim().length > 0 && options.every((o) => o.trim().length > 0);

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add Question"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            onClick={() => {
              onSubmit({
                prompt: prompt.trim(),
                options: options.map((o) => o.trim()),
                correctIndex,
              });
              onClose();
            }}
          >
            Add Question
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Question prompt" htmlFor="question-prompt">
          <Textarea
            id="question-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. What PPE is required before operating a floor grinder?"
            autoFocus
          />
        </Field>
        <Field label="Answer options" hint="Select the radio button next to the correct answer.">
          <div className="flex flex-col gap-2">
            {options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-option"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  className="size-4 shrink-0 text-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  aria-label={`Option ${i + 1} is correct`}
                />
                <Input
                  value={option}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, oi) => (oi === i ? e.target.value : o)))
                  }
                  placeholder={`Option ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </Field>
      </div>
    </Drawer>
  );
}
