'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/icons';
import { lessonTypeIcon, lessonTypeLabel } from '@/components/learner/lesson-type';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/admin-ui/badge';
import { Button } from '@/components/admin-ui/button';
import { Card, CardContent } from '@/components/admin-ui/card';
import { Checkbox } from '@/components/admin-ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/admin-ui/dialog';
import { Input } from '@/components/admin-ui/input';
import { Label } from '@/components/admin-ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin-ui/select';
import { Textarea } from '@/components/admin-ui/textarea';
import {
  addContentBlock,
  addCriterion,
  addLesson,
  addQuestion,
  addSection,
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

type RailSelection =
  | { type: 'general' }
  | { type: 'section'; sectionId: string }
  | { type: 'assessment' }
  | { type: 'criteria' };

type LessonEditorTarget =
  | { mode: 'add'; sectionId: string; sectionTitle: string }
  | { mode: 'edit'; sectionId: string; lessonId: string };

type QuestionEditorTarget = { mode: 'add' } | { mode: 'edit'; question: QuizQuestion };

type CriterionEditorTarget = { mode: 'add' } | { mode: 'edit'; criterion: AssessmentCriterion };

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
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CurriculumBuilderView({
  course,
  criteria,
}: {
  course: Course;
  criteria: AssessmentCriterion[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [railSelection, setRailSelection] = useState<RailSelection>({ type: 'general' });
  const [sectionDialog, setSectionDialog] = useState<SectionDialogTarget | null>(null);
  const [lessonEditor, setLessonEditor] = useState<LessonEditorTarget | null>(null);
  const [questionEditor, setQuestionEditor] = useState<QuestionEditorTarget | null>(null);
  const [criterionEditor, setCriterionEditor] = useState<CriterionEditorTarget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  function runAndRefresh(action: Promise<void>) {
    startTransition(async () => {
      await action;
      router.refresh();
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
              runAndRefresh(deleteSection(course.id, section.id));
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
          <CriteriaPanel
            courseSlug={course.id}
            criteria={criteria}
            runAndRefresh={runAndRefresh}
            onAddCriterion={() => setCriterionEditor({ mode: 'add' })}
            onEditCriterion={(criterion) => setCriterionEditor({ mode: 'edit', criterion })}
            onDeleteCriterion={(criterion) =>
              setConfirmDelete({
                title: 'Delete criterion?',
                description: `"${criterion.title}" will be permanently removed.`,
                onConfirm: () => {
                  runAndRefresh(deleteCriterion(course.id, criterion.id));
                  setConfirmDelete(null);
                },
              })
            }
          />
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
                    runAndRefresh(deleteLesson(course.id, lesson.id));
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
            onEditQuestion={(question) => setQuestionEditor({ mode: 'edit', question })}
            onDeleteQuestion={(question) =>
              setConfirmDelete({
                title: 'Delete question?',
                description: 'This question will be permanently removed from the assessment.',
                onConfirm: () => {
                  runAndRefresh(deleteQuestion(course.id, question.id));
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
          onSubmit={(title) => runAndRefresh(addSection(course.id, title))}
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
            runAndRefresh(updateSection(course.id, editSectionId, title));
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
            )
          }
        />
      )}

      {criterionEditor && (
        <CriterionDialog
          initial={criterionEditor.mode === 'edit' ? criterionEditor.criterion : undefined}
          onClose={() => setCriterionEditor(null)}
          onSubmit={(c) =>
            runAndRefresh(
              criterionEditor.mode === 'edit'
                ? updateCriterion(course.id, criterionEditor.criterion.id, c)
                : addCriterion(course.id, c),
            )
          }
        />
      )}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDelete?.title}</DialogTitle>
            <DialogDescription>{confirmDelete?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete?.onConfirm()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          <Badge variant="outline">{course.category}</Badge>
          {course.access === 'restricted' ? (
            <Badge variant="outline">
              <Icon name="lock" className="size-3" />
              Restricted
            </Badge>
          ) : (
            <Badge variant="outline">Open</Badge>
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
  onEditQuestion,
  onDeleteQuestion,
}: {
  course: Course;
  onAddQuestion: () => void;
  onEditQuestion: (question: QuizQuestion) => void;
  onDeleteQuestion: (question: QuizQuestion) => void;
}) {
  const questions = course.assessment.questions;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Knowledge Assessment</h2>
        <Button size="sm" variant="outline" onClick={onAddQuestion}>
          <Icon name="clipboard" className="size-4" />
          Add Question
        </Button>
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
  courseSlug,
  criteria,
  runAndRefresh,
  onAddCriterion,
  onEditCriterion,
  onDeleteCriterion,
}: {
  courseSlug: string;
  criteria: AssessmentCriterion[];
  runAndRefresh: (action: Promise<void>) => void;
  onAddCriterion: () => void;
  onEditCriterion: (criterion: AssessmentCriterion) => void;
  onDeleteCriterion: (criterion: AssessmentCriterion) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Assessment Criteria</h2>
        <Button size="sm" variant="outline" onClick={onAddCriterion}>
          <Icon name="plus" className="size-4" />
          Add Criterion
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            The specific things a trainee must demonstrate for this course&apos;s evidence
            submission to be certifiable. {criteria.length} criteria.
          </p>
          {criteria.length === 0 ? (
            <p className="text-xs text-muted-foreground">No criteria yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {criteria.map((criterion, i) => (
                <li key={criterion.id} className="group rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {i + 1}. {criterion.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => runAndRefresh(moveCriterion(courseSlug, criterion.id, 'up'))}
                        disabled={i === 0}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        aria-label="Move criterion up"
                      >
                        <Icon name="chevron-up" className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          runAndRefresh(moveCriterion(courseSlug, criterion.id, 'down'))
                        }
                        disabled={i === criteria.length - 1}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        aria-label="Move criterion down"
                      >
                        <Icon name="chevron-down" className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditCriterion(criterion)}
                        className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        aria-label="Edit criterion"
                      >
                        <Icon name="edit" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCriterion(criterion)}
                        className="rounded p-1 text-destructive opacity-0 hover:bg-muted group-hover:opacity-100"
                        aria-label="Delete criterion"
                      >
                        <Icon name="trash" className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{criterion.guidance}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {criterion.photoRequired && <Badge variant="outline">Photo required</Badge>}
                    {criterion.mandatoryForCertification && (
                      <Badge variant="outline">Required for certification</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rename section' : 'Add section'}</DialogTitle>
        </DialogHeader>
        <LabeledField label="Section title" htmlFor="section-title">
          <Input
            id="section-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Finishing Techniques"
            autoFocus
          />
        </LabeledField>
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
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
  runAndRefresh: (action: Promise<void>) => void;
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
      runAndRefresh(deleteContentBlock(id));
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit lesson' : 'Add lesson'}</DialogTitle>
          {!isEdit && (
            <DialogDescription>Adding to &quot;{state.sectionTitle}&quot;</DialogDescription>
          )}
        </DialogHeader>
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
              <Select value={type} onValueChange={(v) => setType(v as LessonType)}>
                <SelectTrigger id="lesson-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lessonTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {lessonTypeLabel[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <DialogFooter>
          {isEdit ? (
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
                  runAndRefresh(submitAddLesson());
                  onClose();
                }}
              >
                Add lesson
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit question' : 'Add question'}</DialogTitle>
        </DialogHeader>
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
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CriterionDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: AssessmentCriterion;
  onClose: () => void;
  onSubmit: (criterion: {
    title: string;
    guidance: string;
    photoRequired: boolean;
    mandatoryForCertification: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [guidance, setGuidance] = useState(initial?.guidance ?? '');
  const [photoRequired, setPhotoRequired] = useState(initial?.photoRequired ?? true);
  const [mandatoryForCertification, setMandatoryForCertification] = useState(
    initial?.mandatoryForCertification ?? true,
  );

  const valid = title.trim().length > 0 && guidance.trim().length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit criterion' : 'Add criterion'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <LabeledField label="Criterion" htmlFor="criterion-title">
            <Input
              id="criterion-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Correct PPE worn"
              autoFocus
            />
          </LabeledField>
          <LabeledField label="Guidance" htmlFor="criterion-guidance">
            <Textarea
              id="criterion-guidance"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="What the trainee's photo or description must show to satisfy this criterion."
            />
          </LabeledField>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={photoRequired}
              onCheckedChange={(checked) => setPhotoRequired(checked === true)}
            />
            Photo required
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={mandatoryForCertification}
              onCheckedChange={(checked) => setMandatoryForCertification(checked === true)}
            />
            Required for certification
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onSubmit({
                title: title.trim(),
                guidance: guidance.trim(),
                photoRequired,
                mandatoryForCertification,
              });
              onClose();
            }}
          >
            {initial ? 'Save' : 'Add criterion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
