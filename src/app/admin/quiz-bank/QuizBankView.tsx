'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { QuizBankCourse, QuizBankDetail, QuizBankQuestion } from '@/lib/data/quiz-bank';
import { addQuestion, deleteQuestion, updateQuestion } from '@/lib/actions/curriculum';
import { Button } from '@/components/admin-ui/button';
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
  selectedSlug,
  bank,
}: {
  courses: QuizBankCourse[];
  selectedSlug: string | null;
  bank: QuizBankDetail | null;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [submitting, setSubmitting] = useState(false);

  const startEdit = (question: QuizBankQuestion) => {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Quiz Bank</h1>
          <p>
            {bank
              ? `${bank.courseTitle} — manage questions and settings`
              : 'Manage questions and settings for a course assessment'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none', alignItems: 'center' }}>
          {courses.length > 0 && (
            <Select
              value={selectedSlug ?? undefined}
              onValueChange={(slug) => router.push(`/admin/quiz-bank?course=${slug}`)}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" disabled={!bank} onClick={startAdd}>
            + Add question
          </Button>
        </div>
      </div>

      {!bank ? (
        <StateCard
          icon={<Icon name="clipboard" className="h-5 w-5" />}
          title="No assessment to manage yet"
          description="Every course needs an assessment before it can have quiz questions — add one from the course's curriculum builder."
        />
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="panel" style={{ flex: 1.3 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 12 }}>
              Question bank ({bank.questions.length} question
              {bank.questions.length === 1 ? '' : 's'})
            </div>
            {bank.questions.length === 0 ? (
              <StateCard
                icon={<Icon name="clipboard" className="h-5 w-5" />}
                title="No questions yet"
                description="Add the first question for this course's knowledge assessment."
              />
            ) : (
              bank.questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => startEdit(q)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--nfcap-border)',
                    cursor: 'pointer',
                    background: editingId === q.id ? 'var(--surface-muted)' : undefined,
                  }}
                >
                  <Icon name="check" className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{q.prompt}</div>
                  <Badge tone="neutral">{inferType(q.options)}</Badge>
                </div>
              ))
            )}
          </div>

          <div className="panel" style={{ flex: 1 }}>
            {editingId === null ? (
              <StateCard
                icon={<Icon name="edit" className="h-5 w-5" />}
                title="Select a question to edit"
                description="Or add a new one for this course's assessment."
              />
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 12 }}>
                  {editingId === 'new' ? 'Add question' : 'Edit question'}
                </div>
                <div className="flex flex-col gap-1.5" style={{ marginBottom: 12 }}>
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
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <Button
                    size="sm"
                    disabled={!valid || submitting || !selectedSlug}
                    onClick={async () => {
                      if (!selectedSlug) return;
                      setSubmitting(true);
                      const payload = {
                        prompt: draft.prompt.trim(),
                        options: draft.options.map((o) => o.trim()),
                        correctIndex: draft.correctIndex,
                      };
                      if (editingId === 'new') {
                        await addQuestion(selectedSlug, payload);
                      } else {
                        await updateQuestion(selectedSlug, editingId, payload);
                      }
                      setSubmitting(false);
                      setEditingId(null);
                      router.refresh();
                    }}
                  >
                    Save
                  </Button>
                  {editingId !== 'new' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting}
                      onClick={async () => {
                        if (!selectedSlug) return;
                        setSubmitting(true);
                        await deleteQuestion(selectedSlug, editingId);
                        setSubmitting(false);
                        setEditingId(null);
                        router.refresh();
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div style={{ borderTop: '1px solid var(--nfcap-border)', paddingTop: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                    Quiz settings
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <span>Pass threshold: {Math.round(bank.passThreshold * 100)}%</span>
                    <span>
                      Attempts: {bank.maxAttempts === null ? 'unlimited' : bank.maxAttempts}
                    </span>
                    <span>Time limit: none</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
