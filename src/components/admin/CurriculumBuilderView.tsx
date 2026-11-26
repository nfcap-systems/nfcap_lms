'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Icon, type IconName } from '@/components/icons';
import { lessonTypeIcon, lessonTypeLabel } from '@/components/learner/lesson-type';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardContent, Dialog, Input, Textarea } from '@/components/ui';
import {
  addContentBlock,
  addCriterion,
  addLesson,
  addQuestion,
  addSection,
  attachExistingQuestion,
  deleteContentBlock,
  deleteCriterion,
  deleteLesson,
  deleteQuestion,
  deleteSection,
  moveContentBlock,
  moveCriterion,
  updateContentBlock,
  updateCriterion,
  updateLesson,
  updateQuestion,
  updateSection,
} from '@/lib/actions/curriculum';
import type {
  AssessmentCriterion,
  Course,
  ContentBlockType,
  Lesson,
  LessonType,
  QuizQuestion,
  Section,
} from '@/lib/types';
import type { BankQuestion } from '@/lib/data/quiz-bank';

type RailSelection =
  | { type: 'general' }
  | { type: 'section'; sectionId: string }
  | { type: 'assessment' }
  | { type: 'criteria' };

type LessonEditorTarget =
  | { mode: 'add'; sectionId: string; sectionTitle: string }
  | { mode: 'edit'; sectionId: string; lessonId: string };

type QuestionEditorTarget = { mode: 'add' } | { mode: 'edit'; question: QuizQuestion };

type SectionDialogTarget = 'add' | { editSectionId: string };

type ConfirmDeleteState = {
  title: string;
  description: string;
  onConfirm: () => void;
};

function LabeledField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CurriculumBuilderView({
  course,
  criteria,
  bankQuestions,
}: {
  course: Course;
  criteria: AssessmentCriterion[];
  bankQuestions: BankQuestion[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [railSelection, setRailSelection] = useState<RailSelection>({ type: 'general' });
  const [sectionDialog, setSectionDialog] = useState<SectionDialogTarget | null>(null);
  const [lessonEditor, setLessonEditor] = useState<LessonEditorTarget | null>(null);
  const [questionEditor, setQuestionEditor] = useState<QuestionEditorTarget | null>(null);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  function runAndRefresh(action: Promise<void>, successMessage?: string) {
    startTransition(async () => {
      try {
        await action;
        if (successMessage) toast.success(successMessage);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  const selectedSection =
    railSelection.type === 'section'
      ? course.sections.find((s) => s.id === railSelection.sectionId)
      : undefined;

  const editingLesson =
    lessonEditor?.mode === 'edit'
      ? course.sections
          .find((s) => s.id === lessonEditor.sectionId)
          ?.lessons.find((l) => l.id === lessonEditor.lessonId)
      : undefined;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <LeftRail
        course={course}
        selection={railSelection}
        onSelect={setRailSelection}
        onAddSection={() => setSectionDialog('add')}
        onEditSection={(sectionId) => setSectionDialog({ editSectionId: sectionId })}
        onDeleteSection={(section) =>
          setConfirmDelete({
            title: 'Delete section?',
            description: `"${section.title}" and its ${section.lessons.length} lesson(s) will be permanently removed.`,
            onConfirm: () => {
              runAndRefresh(deleteSection(course.id, section.id), 'Section deleted');
              if (railSelection.type === 'section' && railSelection.sectionId === section.id) {
                setRailSelection({ type: 'general' });
              }
              setConfirmDelete(null);
            },
          })
        }
      />

      <div className="min-w-0 flex-1">
        {railSelection.type === 'general' && <GeneralInfoPanel course={course} />}

        {railSelection.type === 'criteria' && (
          <CriteriaPanel courseId={course.id} criteria={criteria} />
        )}

        {railSelection.type === 'section' &&
          (selectedSection ? (
            <SectionDetailPanel
              section={selectedSection}
              onRenameSection={() => setSectionDialog({ editSectionId: selectedSection.id })}
              onAddLesson={() =>
                setLessonEditor({
                  mode: 'add',
                  sectionId: selectedSection.id,
                  sectionTitle: selectedSection.title,
                })
              }
              onEditLesson={(lessonId) =>
                setLessonEditor({ mode: 'edit', sectionId: selectedSection.id, lessonId })
              }
              onDeleteLesson={(lesson) =>
                setConfirmDelete({
                  title: 'Delete lesson?',
                  description: `"${lesson.title}" will be permanently removed.`,
                  onConfirm: () => {
                    runAndRefresh(deleteLesson(course.id, lesson.id), 'Lesson deleted');
                    setConfirmDelete(null);
                  },
                })
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">Section not found.</p>
          ))}

        {railSelection.type === 'assessment' && (
          <AssessmentPanel
            course={course}
            onAddQuestion={() => setQuestionEditor({ mode: 'add' })}
            onImportFromBank={() => setBankPickerOpen(true)}
            onEditQuestion={(question) => setQuestionEditor({ mode: 'edit', question })}
            onDeleteQuestion={(question) =>
              setConfirmDelete({
                title: 'Delete question?',
                description: 'This question will be permanently removed from the assessment.',
                onConfirm: () => {
                  runAndRefresh(deleteQuestion(course.id, question.id), 'Question deleted');
                  setConfirmDelete(null);
                },
              })
            }
          />
        )}
      </div>

      {sectionDialog === 'add' && (
        <SectionDialog
          onClose={() => setSectionDialog(null)}
          onSubmit={(title) => runAndRefresh(addSection(course.id, title), 'Section added')}
        />
      )}
      {sectionDialog !== null && sectionDialog !== 'add' && (
        <SectionDialog
          initialTitle={
            course.sections.find((s) => s.id === sectionDialog.editSectionId)?.title ?? ''
          }
          onClose={() => setSectionDialog(null)}
          onSubmit={(title) => {
            const { editSectionId } = sectionDialog;
            runAndRefresh(updateSection(course.id, editSectionId, title), 'Section updated');
          }}
        />
      )}

      {lessonEditor?.mode === 'add' && (
        <LessonEditorDialog
          key={`add-${lessonEditor.sectionId}`}
          state={lessonEditor}
          courseSlug={course.id}
          onClose={() => setLessonEditor(null)}
          runAndRefresh={runAndRefresh}
        />
      )}
      {lessonEditor?.mode === 'edit' && editingLesson && (
        <LessonEditorDialog
          key={editingLesson.id}
          state={{ mode: 'edit', sectionId: lessonEditor.sectionId, lesson: editingLesson }}
          courseSlug={course.id}
          onClose={() => setLessonEditor(null)}
          runAndRefresh={runAndRefresh}
        />
      )}

      {questionEditor && (
        <QuestionDialog
          initial={questionEditor.mode === 'edit' ? questionEditor.question : undefined}
          onClose={() => setQuestionEditor(null)}
          onSubmit={(q) =>
            runAndRefresh(
              questionEditor.mode === 'edit'
                ? updateQuestion(questionEditor.question.id, q)
                : addQuestion(course.id, q),
              questionEditor.mode === 'edit' ? 'Question updated' : 'Question added',
            )
          }
        />
      )}

      {bankPickerOpen && (
        <QuestionBankPickerDialog
          bankQuestions={bankQuestions}
          attachedQuestionIds={new Set(course.assessment.questions.map((q) => q.id))}
          onClose={() => setBankPickerOpen(false)}
          onAttach={(questionId) => {
            runAndRefresh(
              attachExistingQuestion(course.id, questionId),
              'Question added from bank',
            );
            setBankPickerOpen(false);
          }}
        />
      )}

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.title}
        description={confirmDelete?.description}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => confirmDelete?.onConfirm()}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

function RailButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconName;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      <Icon name={icon} className="size-4" />
      {label}
    </button>
  );
}

function LeftRail({
  course,
  selection,
  onSelect,
  onAddSection,
  onEditSection,
  onDeleteSection,
}: {
  course: Course;
  selection: RailSelection;
  onSelect: (selection: RailSelection) => void;
  onAddSection: () => void;
  onEditSection: (sectionId: string) => void;
  onDeleteSection: (section: Section) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
      <Card>
        <CardContent>
          <RailButton
            active={selection.type === 'general'}
            onClick={() => onSelect({ type: 'general' })}
            icon="file-text"
            label="General Information"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Sections
            </span>
            <button
              type="button"
              onClick={onAddSection}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Add section"
            >
              <Icon name="plus" className="size-4" />
            </button>
          </div>
          {course.sections.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No sections yet.</p>
          ) : (
            course.sections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  'group flex items-center gap-1 rounded-md px-2 py-1.5',
                  selection.type === 'section' && selection.sectionId === section.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect({ type: 'section', sectionId: section.id })}
                  className="flex-1 truncate text-left text-sm"
                >
                  {section.title}
                </button>
                <button
                  type="button"
                  onClick={() => onEditSection(section.id)}
                  className="rounded p-1 opacity-0 hover:bg-card group-hover:opacity-100"
                  aria-label={`Edit ${section.title}`}
                >
                  <Icon name="edit" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSection(section)}
                  className="rounded p-1 text-destructive opacity-0 hover:bg-card group-hover:opacity-100"
                  aria-label={`Delete ${section.title}`}
                >
                  <Icon name="trash" className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <RailButton
            active={selection.type === 'criteria'}
            onClick={() => onSelect({ type: 'criteria' })}
            icon="list"
            label="Assessment Criteria"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <RailButton
            active={selection.type === 'assessment'}
            onClick={() => onSelect({ type: 'assessment' })}
            icon="clipboard"
            label="Knowledge Assessment"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function GeneralInfoPanel({ course }: { course: Course }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{course.category}</Badge>
          {course.access === 'restricted' ? (
            <Badge tone="neutral">
              <Icon name="lock" className="size-3" />
              Restricted
            </Badge>
          ) : (
            <Badge tone="neutral">Open</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{course.description}</p>
      </CardContent>
    </Card>
  );
}

function SectionDetailPanel({
  section,
  onRenameSection,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: {
  section: Section;
  onRenameSection: () => void;
  onAddLesson: () => void;
  onEditLesson: (lessonId: string) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <button
              type="button"
              onClick={onRenameSection}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Rename section"
            >
              <Icon name="edit" className="size-3.5" />
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={onAddLesson}>
            <Icon name="book" className="size-4" />
            Add Lesson
          </Button>
        </div>

        {section.lessons.length === 0 ? (
          <p className="text-xs text-muted-foreground">No lessons yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {section.lessons.map((lesson) => (
              <li key={lesson.id} className="group flex items-center gap-2.5 py-2 text-sm">
                <Icon
                  name={lessonTypeIcon[lesson.type]}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="flex-1 truncate text-foreground">{lesson.title}</span>
                <span className="text-xs text-muted-foreground">
                  {lessonTypeLabel[lesson.type]}
                </span>
                <span className="text-xs text-muted-foreground">{lesson.durationMinutes} min</span>
                <button
                  type="button"
                  onClick={() => onEditLesson(lesson.id)}
                  className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  aria-label={`Edit ${lesson.title}`}
                >
                  <Icon name="edit" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteLesson(lesson)}
                  className="rounded p-1 text-destructive opacity-0 hover:bg-muted group-hover:opacity-100"
                  aria-label={`Delete ${lesson.title}`}
                >
                  <Icon name="trash" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentPanel({
  course,
  onAddQuestion,
  onImportFromBank,
  onEditQuestion,
  onDeleteQuestion,
}: {
  course: Course;
  onAddQuestion: () => void;
  onImportFromBank: () => void;
  onEditQuestion: (question: QuizQuestion) => void;
  onDeleteQuestion: (question: QuizQuestion) => void;
}) {
  const questions = course.assessment.questions;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Knowledge Assessment</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onImportFromBank}>
            <Icon name="list" className="size-4" />
            Choose from Quiz Bank
          </Button>
          <Button size="sm" variant="outline" onClick={onAddQuestion}>
            <Icon name="clipboard" className="size-4" />
            Add Question
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Pass threshold: {Math.round(course.assessment.passThreshold * 100)}% ·{' '}
            {questions.length} questions
          </p>
          <ul className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <li key={q.id} className="group rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onEditQuestion(q)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Edit question"
                    >
                      <Icon name="edit" className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteQuestion(q)}
                      className="rounded p-1 text-destructive hover:bg-muted"
                      aria-label="Delete question"
                    >
                      <Icon name="trash" className="size-3.5" />
                    </button>
                  </div>
                </div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {q.options.map((option, oi) => (
                    <li
                      key={oi}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      {oi === q.correctIndex && (
                        <Icon name="check" className="size-3 shrink-0 text-green-600" />
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
  );
}

function CriteriaPanel({
  courseId,
  criteria,
}: {
  courseId: string;
  criteria: AssessmentCriterion[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);

  function runAndRefresh(action: Promise<void>, successMessage?: string) {
    startTransition(async () => {
      try {
        await action;
        if (successMessage) toast.success(successMessage);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  const editing = criteria.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4" style={{ flex: 1.4 }}>
        <div className="panel">
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>Evidence criteria</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 14 }}>
            Each learner must show met evidence against every criterion marked &quot;required for
            certification&quot; before the course counts as complete.
          </div>
          {criteria.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              No criteria yet — add one on the right.
            </p>
          ) : (
            criteria.map((criterion, i) => (
              <div
                key={criterion.id}
                className="crit"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedId(criterion.id)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={
                    criterion.mandatoryForCertification
                      ? 'var(--nfcap-accent)'
                      : 'var(--nfcap-border)'
                  }
                  strokeWidth="2"
                  style={{ marginTop: 1, flex: 'none' }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{criterion.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    {criterion.guidance}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2, flex: 'none' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={i === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      runAndRefresh(moveCriterion(courseId, criterion.id, 'up'));
                    }}
                    aria-label="Move criterion up"
                  >
                    <Icon name="chevron-up" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={i === criteria.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      runAndRefresh(moveCriterion(courseId, criterion.id, 'down'));
                    }}
                    aria-label="Move criterion down"
                  >
                    <Icon name="chevron-down" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedId === criterion.id) setSelectedId(null);
                      runAndRefresh(deleteCriterion(courseId, criterion.id), 'Criterion deleted');
                    }}
                    aria-label="Delete criterion"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex justify-end">
          <button type="button" className="btn-primary btn-sm" onClick={() => setSelectedId(null)}>
            + Add criterion
          </button>
        </div>
        <CriterionForm
          key={editing?.id ?? `new-${formResetKey}`}
          courseId={courseId}
          existing={editing}
          onSaved={(id) => {
            setSelectedId(id);
            setFormResetKey((k) => k + 1);
            toast.success('Criterion saved');
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}

function CriterionForm({
  courseId,
  existing,
  onSaved,
}: {
  courseId: string;
  existing: AssessmentCriterion | null;
  onSaved: (id: string | null) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [guidance, setGuidance] = useState(existing?.guidance ?? '');
  const [photoRequired, setPhotoRequired] = useState(existing?.photoRequired ?? true);
  const [mandatoryForCertification, setMandatoryForCertification] = useState(
    existing?.mandatoryForCertification ?? true,
  );
  const [submitting, setSubmitting] = useState(false);

  const valid = title.trim().length > 0 && guidance.trim().length > 0;

  return (
    <div className="panel">
      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>
        {existing ? 'Edit criterion' : 'Add criterion'}
      </div>
      <label className="field-label" htmlFor="criterion-title">
        Criterion name
      </label>
      <input
        id="criterion-title"
        className="field-input"
        style={{ marginBottom: 12 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Correct PPE worn"
      />
      <label className="field-label" htmlFor="criterion-guidance">
        Instructions to learner
      </label>
      <textarea
        id="criterion-guidance"
        className="field-textarea"
        style={{ marginBottom: 12 }}
        value={guidance}
        onChange={(e) => setGuidance(e.target.value)}
        placeholder="What the trainee's photo or description must show to satisfy this criterion."
      />
      <label className="field-label" htmlFor="criterion-evidence-type">
        Evidence type
      </label>
      <select
        id="criterion-evidence-type"
        className="field-select"
        style={{ marginBottom: 12 }}
        value={photoRequired ? 'photo' : 'description'}
        onChange={(e) => setPhotoRequired(e.target.value === 'photo')}
      >
        <option value="photo">Photo</option>
        <option value="description">Description only</option>
      </select>
      <label
        className="flex items-center gap-2 text-sm"
        style={{ color: 'var(--ink-muted)', marginBottom: 16 }}
      >
        <input
          type="checkbox"
          className="field-checkbox"
          checked={mandatoryForCertification}
          onChange={(e) => setMandatoryForCertification(e.target.checked)}
        />
        Required for certification
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={!valid || submitting}
          onClick={async () => {
            setSubmitting(true);
            const fields = {
              title: title.trim(),
              guidance: guidance.trim(),
              photoRequired,
              mandatoryForCertification,
            };
            if (existing) {
              await updateCriterion(courseId, existing.id, fields);
              onSaved(existing.id);
            } else {
              await addCriterion(courseId, fields);
              onSaved(null);
            }
            setSubmitting(false);
          }}
        >
          Save
        </button>
        {existing && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => onSaved(null)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function SectionDialog({
  initialTitle,
  onClose,
  onSubmit,
}: {
  initialTitle?: string;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const isEdit = initialTitle !== undefined;
  const [title, setTitle] = useState(initialTitle ?? '');
  return (
    <Dialog
      open
      onClose={onClose}
      title={isEdit ? 'Rename section' : 'Add section'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              onSubmit(title.trim());
              onClose();
            }}
          >
            {isEdit ? 'Save' : 'Add section'}
          </Button>
        </>
      }
    >
      <LabeledField label="Section title" htmlFor="section-title">
        <Input
          id="section-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finishing Techniques"
          autoFocus
        />
      </LabeledField>
    </Dialog>
  );
}

const lessonTypes: LessonType[] = ['video', 'text', 'image', 'resource'];

const blockTypeMeta: Record<ContentBlockType, { label: string; icon: IconName }> = {
  text: { label: 'Text', icon: 'file-text' },
  'bullet-list': { label: 'Bullet List', icon: 'list' },
  'numbered-list': { label: 'Numbered List', icon: 'numbered-list' },
  'header-1': { label: 'Header 1', icon: 'header' },
  'header-2': { label: 'Header 2', icon: 'header' },
  'header-3': { label: 'Header 3', icon: 'header' },
  image: { label: 'Image', icon: 'image' },
  video: { label: 'Video', icon: 'play' },
};

const blockTypeOrder: ContentBlockType[] = [
  'text',
  'bullet-list',
  'numbered-list',
  'header-1',
  'header-2',
  'header-3',
  'image',
  'video',
];

type EditableBlock = {
  id: string;
  type: ContentBlockType;
  content: string;
  items: string[];
  url: string;
};

type LessonEditorState =
  | { mode: 'add'; sectionId: string; sectionTitle: string }
  | { mode: 'edit'; sectionId: string; lesson: Lesson };

function LessonEditorDialog({
  state,
  courseSlug,
  onClose,
  runAndRefresh,
}: {
  state: LessonEditorState;
  courseSlug: string;
  onClose: () => void;
  runAndRefresh: (action: Promise<void>, successMessage?: string) => void;
}) {
  const isEdit = state.mode === 'edit';
  const [title, setTitle] = useState(isEdit ? state.lesson.title : '');
  const [type, setType] = useState<LessonType>(isEdit ? state.lesson.type : 'text');
  const [duration, setDuration] = useState(isEdit ? state.lesson.durationMinutes : 5);
  const [localBlocks, setLocalBlocks] = useState<EditableBlock[]>([]);

  const blocks: EditableBlock[] = isEdit
    ? state.lesson.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
        items: b.items,
        url: b.url ?? '',
      }))
    : localBlocks;

  function addBlock(blockType: ContentBlockType) {
    if (isEdit) {
      runAndRefresh(
        addContentBlock(state.lesson.id, {
          type: blockType,
          content: '',
          items: [],
          url: undefined,
        }),
      );
    } else {
      setLocalBlocks((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: blockType, content: '', items: [], url: '' },
      ]);
    }
  }

  function updateBlock(
    id: string,
    patch: Partial<Pick<EditableBlock, 'content' | 'items' | 'url'>>,
  ) {
    if (isEdit) {
      const current = blocks.find((b) => b.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      runAndRefresh(
        updateContentBlock(id, {
          type: next.type,
          content: next.content,
          items: next.items,
          url: next.url || undefined,
        }),
      );
    } else {
      setLocalBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    }
  }

  function deleteBlock(id: string) {
    if (isEdit) {
      runAndRefresh(deleteContentBlock(id), 'Block deleted');
    } else {
      setLocalBlocks((prev) => prev.filter((b) => b.id !== id));
    }
  }

  function moveBlock(id: string, direction: 'up' | 'down') {
    if (isEdit) {
      runAndRefresh(moveContentBlock(state.lesson.id, id, direction));
    } else {
      setLocalBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        const neighborIndex = direction === 'up' ? index - 1 : index + 1;
        if (index === -1 || neighborIndex < 0 || neighborIndex >= prev.length) return prev;
        const next = prev.slice();
        [next[index], next[neighborIndex]] = [next[neighborIndex], next[index]];
        return next;
      });
    }
  }

  function submitAddLesson() {
    return addLesson(courseSlug, state.sectionId, {
      title: title.trim(),
      type,
      durationMinutes: duration,
      blocks: localBlocks.map((b) => ({
        type: b.type,
        content: b.content,
        items: b.items,
        url: b.url || undefined,
      })),
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      className="sm:max-w-2xl"
      title={isEdit ? 'Edit lesson' : 'Add lesson'}
      description={!isEdit ? `Adding to "${state.sectionTitle}"` : undefined}
      footer={
        isEdit ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              disabled={!title.trim()}
              onClick={() =>
                runAndRefresh(
                  updateLesson(courseSlug, state.lesson.id, {
                    title: title.trim(),
                    type,
                    durationMinutes: duration,
                  }),
                  'Lesson updated',
                )
              }
            >
              Save details
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim()}
              onClick={() => {
                runAndRefresh(submitAddLesson(), 'Lesson added');
                onClose();
              }}
            >
              Add lesson
            </Button>
          </>
        )
      }
    >
      <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
        <LabeledField label="Lesson title" htmlFor="lesson-title">
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Baseboard Trim Basics"
            autoFocus={!isEdit}
          />
        </LabeledField>
        <div className="grid grid-cols-2 gap-3">
          <LabeledField label="Type" htmlFor="lesson-type">
            <select
              id="lesson-type"
              className="field-select"
              value={type}
              onChange={(e) => setType(e.target.value as LessonType)}
            >
              {lessonTypes.map((t) => (
                <option key={t} value={t}>
                  {lessonTypeLabel[t]}
                </option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="Duration (min)" htmlFor="lesson-duration">
            <Input
              id="lesson-duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 1)}
            />
          </LabeledField>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Content</h3>
            <AddContentPicker onPick={addBlock} />
          </div>
          {blocks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No content blocks yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {blocks.map((block, i) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                  onDelete={() => deleteBlock(block.id)}
                  onMove={(direction) => moveBlock(block.id, direction)}
                  canMoveUp={i > 0}
                  canMoveDown={i < blocks.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function AddContentPicker({ onPick }: { onPick: (type: ContentBlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
        <Icon name="plus" className="size-4" />
        Content
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border bg-card p-1 shadow-md">
            {blockTypeOrder.map((t) => {
              const meta = blockTypeMeta[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onPick(t);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                >
                  <Icon name={meta.icon} className="size-4 text-muted-foreground" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function BlockRow({
  block,
  onUpdate,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  block: EditableBlock;
  onUpdate: (patch: Partial<Pick<EditableBlock, 'content' | 'items' | 'url'>>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [content, setContent] = useState(block.content);
  const [url, setUrl] = useState(block.url);
  const [items, setItems] = useState<string[]>(block.items.length > 0 ? block.items : ['']);

  const meta = blockTypeMeta[block.type];
  const isListType = block.type === 'bullet-list' || block.type === 'numbered-list';
  const isMediaType = block.type === 'image' || block.type === 'video';

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon name={meta.icon} className="size-3.5" />
          {meta.label}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={!canMoveUp}
            className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="Move block up"
          >
            <Icon name="chevron-up" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={!canMoveDown}
            className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="Move block down"
          >
            <Icon name="chevron-down" className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-destructive hover:bg-muted"
            aria-label="Delete block"
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      </div>

      {isMediaType && (
        <>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => onUpdate({ url })}
            placeholder={block.type === 'image' ? 'Image URL' : 'Video URL'}
          />
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => onUpdate({ content })}
            placeholder="Caption (optional)"
          />
        </>
      )}

      {isListType && (
        <div className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={item}
                onChange={(e) =>
                  setItems((prev) => prev.map((v, vi) => (vi === i ? e.target.value : v)))
                }
                onBlur={() => onUpdate({ items })}
                placeholder={`Item ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => {
                  const next = items.filter((_, vi) => vi !== i);
                  setItems(next);
                  onUpdate({ items: next });
                }}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Remove item"
              >
                <Icon name="x" className="size-3.5" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = [...items, ''];
              setItems(next);
              onUpdate({ items: next });
            }}
          >
            <Icon name="plus" className="size-3.5" />
            Add item
          </Button>
        </div>
      )}

      {!isMediaType && !isListType && (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => onUpdate({ content })}
          placeholder={meta.label}
        />
      )}
    </div>
  );
}

function QuestionDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: QuizQuestion;
  onClose: () => void;
  onSubmit: (question: { prompt: string; options: string[]; correctIndex: number }) => void;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(initial?.correctIndex ?? 0);

  const valid = prompt.trim().length > 0 && options.every((o) => o.trim().length > 0);

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial ? 'Edit question' : 'Add question'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
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
            {initial ? 'Save' : 'Add question'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <LabeledField label="Question prompt" htmlFor="question-prompt">
          <Textarea
            id="question-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. What PPE is required before operating a floor grinder?"
            autoFocus
          />
        </LabeledField>
        <LabeledField
          label="Answer options"
          hint="Select the radio button next to the correct answer."
        >
          <div className="flex flex-col gap-2">
            {options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-option"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  className="size-4 shrink-0 text-primary focus:ring-2 focus:ring-primary/20"
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
        </LabeledField>
      </div>
    </Dialog>
  );
}

/** Reuse-across-courses entry point into the shared question bank (Quiz Bank, `/admin/quiz-bank`)
 * — previously the only way to attach an existing question to a course was to go there and use
 * its own "Attach" dropdown; this lets an admin do it straight from the course's own Knowledge
 * Assessment screen instead, via the same `attachExistingQuestion` action. */
function QuestionBankPickerDialog({
  bankQuestions,
  attachedQuestionIds,
  onClose,
  onAttach,
}: {
  bankQuestions: BankQuestion[];
  attachedQuestionIds: Set<string>;
  onClose: () => void;
  onAttach: (questionId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const available = bankQuestions.filter((q) => !attachedQuestionIds.has(q.id));
  const q = search.trim().toLowerCase();
  const filtered = q
    ? available.filter((item) => item.prompt.toLowerCase().includes(q))
    : available;

  return (
    <Dialog open onClose={onClose} title="Choose from Quiz Bank">
      <div className="flex flex-col gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions..."
          aria-label="Search quiz bank"
          autoFocus
        />
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every bank question is already attached to this course.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions match that search.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{item.prompt}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.attachedCourses.length > 0
                      ? `Used in: ${item.attachedCourses.map((c) => c.title).join(', ')}`
                      : 'Not attached to any course yet'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onAttach(item.id)}>
                  Attach
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
