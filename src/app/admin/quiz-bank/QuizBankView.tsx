'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { AssessmentSettings, BankQuestion, QuizBankCourse } from '@/lib/data/quiz-bank';
import {
  attachExistingQuestion,
  createDraftQuestion,
  deleteQuestion,
  deleteQuestionEverywhere,
  updateQuestion,
} from '@/lib/actions/curriculum';
import { Button } from '@/components/admin-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/admin-ui/dropdown-menu';
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
import { Badge, StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';

/** Sentinel filter values distinct from any real course slug. */
const ALL = '__all__';
const UNATTACHED = '__unattached__';

/** The schema only models multiple-choice/true-false questions (options[] + correctIndex) — no
 * "short answer" type exists, so unlike ADM09's mockup this never offers one. Inferred purely from
 * the real options, not a separate stored field. */
function inferType(options: string[]): string {
  if (
    options.length === 2 &&
    options.every((o) => ['true', 'false'].includes(o.trim().toLowerCase()))
  ) {
    return 'True/False';
  }
  return 'Multiple choice';
}

function emptyDraft(): { prompt: string; options: string[]; correctIndex: number } {
  return { prompt: '', options: ['', '', '', ''], correctIndex: 0 };
}

export function QuizBankView({
  courses,
  questions,
  settingsByCourse,
}: {
  courses: QuizBankCourse[];
  questions: BankQuestion[];
  settingsByCourse: Record<string, AssessmentSettings>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>(ALL);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (filter === ALL) return questions;
    if (filter === UNATTACHED) return questions.filter((q) => q.attachedCourses.length === 0);
    return questions.filter((q) => q.attachedCourses.some((c) => c.slug === filter));
  }, [questions, filter]);

  const filterCourse =
    filter !== ALL && filter !== UNATTACHED ? courses.find((c) => c.slug === filter) : null;
  const settings = filterCourse ? settingsByCourse[filterCourse.slug] : null;
  const editingQuestion = editingId !== 'new' ? questions.find((q) => q.id === editingId) : null;

  const headerLabel =
    filter === ALL
      ? `All questions (${filtered.length})`
      : filter === UNATTACHED
        ? `Unattached questions (${filtered.length})`
        : `${filterCourse?.title ?? filter} (${filtered.length})`;

  const startEdit = (question: BankQuestion) => {
    setEditingId(question.id);
    setDraft({
      prompt: question.prompt,
      options: [...question.options],
      correctIndex: question.correctIndex,
    });
  };

  const startAdd = () => {
    setEditingId('new');
    setDraft(emptyDraft());
  };

  const valid = draft.prompt.trim().length > 0 && draft.options.every((o) => o.trim().length > 0);

  const attachTargetsFor = (question: BankQuestion) =>
    courses.filter((c) => !question.attachedCourses.some((a) => a.slug === c.slug));

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Quiz Bank</h1>
          <p>
            One shared pool of questions — attach the same question to as many courses as it fits.
          </p>
        </div>
        <Button size="sm" onClick={startAdd}>
          + Create question
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div className="panel" style={{ flex: 1.3 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Question bank — {headerLabel}</div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All questions</SelectItem>
                <SelectItem value={UNATTACHED}>Unattached</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {settings && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>
              Pass threshold: {Math.round(settings.passThreshold * 100)}% · Attempts:{' '}
              {settings.maxAttempts === null ? 'unlimited' : settings.maxAttempts} · Time limit:
              none
            </div>
          )}
          {filtered.length === 0 ? (
            <StateCard
              icon={<Icon name="clipboard" className="h-5 w-5" />}
              title={filter === UNATTACHED ? 'No unattached questions' : 'No questions here yet'}
              description={
                filter === ALL
                  ? 'Create the first question for the bank.'
                  : filter === UNATTACHED
                    ? 'Every question in the bank is attached to at least one course.'
                    : 'Attach an existing question to this course, or create a new one.'
              }
            />
          ) : (
            filtered.map((q) => (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--nfcap-border)',
                  background: editingId === q.id ? 'var(--surface-muted)' : undefined,
                }}
              >
                <div
                  onClick={() => startEdit(q)}
                  style={{ flex: 1, fontSize: 13, cursor: 'pointer' }}
                >
                  {q.prompt}
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>
                    {q.attachedCourses.length > 0
                      ? `Used in: ${q.attachedCourses.map((c) => c.title).join(', ')}`
                      : 'Not attached to any course yet'}
                  </div>
                </div>
                <Badge tone="neutral">{inferType(q.options)}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={attachTargetsFor(q).length === 0}>
                      Attach
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {attachTargetsFor(q).map((c) => (
                      <DropdownMenuItem
                        key={c.slug}
                        onSelect={async () => {
                          try {
                            await attachExistingQuestion(c.slug, q.id);
                            toast.success(`Attached to ${c.title}`);
                            router.refresh();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Could not attach the question.');
                          }
                        }}
                      >
                        {c.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          {editingId === null ? (
            <StateCard
              icon={<Icon name="edit" className="h-5 w-5" />}
              title="Select a question to edit"
              description="Or create a new one — it starts unattached until you attach it to a course."
            />
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>
                {editingId === 'new' ? 'Create question' : 'Edit question'}
              </div>
              {editingQuestion && (
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>
                  {editingQuestion.attachedCourses.length > 0
                    ? "Editing this changes it everywhere it's used."
                    : 'Not attached to any course yet.'}
                </div>
              )}
              <div className="flex flex-col gap-1.5" style={{ marginBottom: 12, marginTop: 8 }}>
                <Label htmlFor="qb-prompt">Question</Label>
                <Textarea
                  id="qb-prompt"
                  style={{ minHeight: 70 }}
                  value={draft.prompt}
                  onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5" style={{ marginBottom: 16 }}>
                <Label>Answer options (select the correct one)</Label>
                {draft.options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="qb-correct"
                      checked={draft.correctIndex === i}
                      onChange={() => setDraft((d) => ({ ...d, correctIndex: i }))}
                      aria-label={`Option ${i + 1} is correct`}
                    />
                    <Input
                      value={option}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          options: d.options.map((o, oi) => (oi === i ? e.target.value : o)),
                        }))
                      }
                      placeholder={`Option ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  disabled={!valid || submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    const payload = {
                      prompt: draft.prompt.trim(),
                      options: draft.options.map((o) => o.trim()),
                      correctIndex: draft.correctIndex,
                    };
                    try {
                      if (editingId === 'new') {
                        await createDraftQuestion(payload);
                        toast.success('Question created');
                      } else {
                        await updateQuestion(editingId, payload);
                        toast.success('Question updated');
                      }
                      setEditingId(null);
                      router.refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Could not save the question.');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  Save
                </Button>
                {editingId !== 'new' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await deleteQuestionEverywhere(editingId);
                        toast.success('Question deleted everywhere');
                        setEditingId(null);
                        router.refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Could not delete the question.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    Delete everywhere
                  </Button>
                )}
              </div>
              {editingQuestion && editingQuestion.attachedCourses.length > 0 && (
                <div style={{ borderTop: '1px solid var(--nfcap-border)', paddingTop: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Attached to</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {editingQuestion.attachedCourses.map((c) => (
                      <div
                        key={c.slug}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: 12.5 }}>{c.title}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={submitting}
                          onClick={async () => {
                            setSubmitting(true);
                            try {
                              await deleteQuestion(c.slug, editingQuestion.id);
                              toast.success(`Removed from ${c.title}`);
                              router.refresh();
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : 'Could not remove the question.',
                              );
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
