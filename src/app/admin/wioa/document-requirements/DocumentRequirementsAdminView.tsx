'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Checkbox, Drawer, Field, Input, Select, Textarea } from '@/components/ui';
import { Icon } from '@/components/icons';
import {
  createWioaDocumentRequirement,
  updateWioaDocumentRequirement,
} from '@/lib/actions/wioa-document-requirements';
import type { WioaDocumentRequirementAdminRecord } from '@/lib/data/wioa-document-requirements';
import type { WorkforceBoardSummary } from '@/lib/data/wioa-boards';

function groupByBoard(
  requirements: WioaDocumentRequirementAdminRecord[],
): [string, WioaDocumentRequirementAdminRecord[]][] {
  const groups = new Map<string, WioaDocumentRequirementAdminRecord[]>();
  for (const r of requirements) {
    const existing = groups.get(r.boardName);
    if (existing) existing.push(r);
    else groups.set(r.boardName, [r]);
  }
  return [...groups.entries()];
}

export function DocumentRequirementsAdminView({
  requirements,
  boards,
}: {
  requirements: WioaDocumentRequirementAdminRecord[];
  boards: WorkforceBoardSummary[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WioaDocumentRequirementAdminRecord | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={boards.length === 0}>
          <Icon name="plus" className="size-4" />
          Add Requirement
        </Button>
      </div>

      {boards.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm text-text-secondary">
            Add a workforce board first — requirements are scoped per board.
          </div>
        </Card>
      ) : requirements.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm text-text-secondary">
            No document requirements yet.
          </div>
        </Card>
      ) : (
        groupByBoard(requirements).map(([boardName, rows]) => (
          <Card key={boardName}>
            <p className="border-b border-border-subtle px-4 py-3 text-sm font-semibold text-brand-heading">
              {boardName}
            </p>
            <div className="divide-y divide-border-subtle">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{r.name}</p>
                    <p className="text-xs text-text-muted">{r.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.conditional && <Badge tone="pending">Conditional</Badge>}
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <RequirementDrawer
        key={editing?.id ?? 'new'}
        boards={boards}
        open={addOpen || editing !== null}
        existing={editing}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function RequirementDrawer({
  boards,
  open,
  existing,
  onClose,
  onSaved,
}: {
  boards: WorkforceBoardSummary[];
  open: boolean;
  existing: WioaDocumentRequirementAdminRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [workforceBoardId, setWorkforceBoardId] = useState(
    existing?.workforceBoardId ?? boards[0]?.id ?? '',
  );
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [conditional, setConditional] = useState(existing?.conditional ?? false);
  const [applicableRule, setApplicableRule] = useState(existing?.applicableRule ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const valid =
    workforceBoardId.length > 0 && name.trim().length > 0 && description.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={existing ? 'Edit Document Requirement' : 'Add Document Requirement'}
      description="A conditional requirement only actually applies at case creation for the one hardcoded rule (EDD Award Letter) — a custom conditional name always generates, same as non-conditional."
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
              const fields = {
                workforceBoardId,
                name: name.trim(),
                description: description.trim(),
                conditional,
                applicableRule: conditional ? applicableRule.trim() || null : null,
              };
              if (existing) {
                await updateWioaDocumentRequirement(existing.id, fields);
              } else {
                await createWioaDocumentRequirement(fields);
              }
              setSubmitting(false);
              onClose();
              onSaved();
            }}
          >
            {existing ? 'Save changes' : 'Add Requirement'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Workforce board" htmlFor="req-board">
          <Select
            id="req-board"
            value={workforceBoardId}
            onChange={(e) => setWorkforceBoardId(e.target.value)}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" htmlFor="req-name">
          <Input id="req-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Description" htmlFor="req-description">
          <Textarea
            id="req-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <Checkbox checked={conditional} onChange={(e) => setConditional(e.target.checked)} />
          Conditional — only applies to some learners
        </label>
        {conditional && (
          <Field label="Rule (human-readable, not evaluated)" htmlFor="req-rule">
            <Input
              id="req-rule"
              value={applicableRule}
              onChange={(e) => setApplicableRule(e.target.value)}
              placeholder="e.g. unemploymentInsuranceStatus is not 'Not applicable'"
            />
          </Field>
        )}
      </div>
    </Drawer>
  );
}
