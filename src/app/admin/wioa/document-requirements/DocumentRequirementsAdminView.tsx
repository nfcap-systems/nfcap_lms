'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createWioaDocumentRequirement,
  updateWioaDocumentRequirement,
} from '@/lib/actions/wioa-document-requirements';
import type { WioaDocumentRequirementAdminRecord } from '@/lib/data/wioa-document-requirements';
import type { WorkforceBoardSummary } from '@/lib/data/wioa-boards';
import { Icon } from '@/components/icons';
import { Badge, StateCard } from '@/components/ui';

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
  const [editing, setEditing] = useState<WioaDocumentRequirementAdminRecord | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Document Requirements</h1>
          <p>The checklist shown to learners during WIOA document upload.</p>
        </div>
      </div>

      {boards.length === 0 ? (
        <StateCard
          icon={<Icon name="file-text" className="h-5 w-5" />}
          title="Add a workforce board first"
          description="Requirements are scoped per board."
        />
      ) : requirements.length === 0 ? (
        <StateCard
          icon={<Icon name="file-text" className="h-5 w-5" />}
          title="No document requirements yet"
          description="Add one below."
        />
      ) : (
        groupByBoard(requirements).map(([boardName, rows]) => (
          <div key={boardName} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--nfcap-border)',
                fontWeight: 600,
                fontSize: 13.5,
              }}
            >
              {boardName}
            </div>
            {rows.map((r) => (
              <div key={r.id} className="reqrow">
                <Icon name="file-text" className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-muted)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{r.description}</div>
                </div>
                <Badge tone={r.conditional ? 'neutral' : 'success'}>
                  {r.conditional ? 'Conditional' : 'Required'}
                </Badge>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(r)}>
                  Edit
                </button>
              </div>
            ))}
          </div>
        ))
      )}

      {boards.length > 0 && (
        <RequirementForm
          key={editing?.id ?? `new-${formResetKey}`}
          boards={boards}
          existing={editing}
          onCancelEdit={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setFormResetKey((k) => k + 1);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RequirementForm({
  boards,
  existing,
  onCancelEdit,
  onSaved,
}: {
  boards: WorkforceBoardSummary[];
  existing: WioaDocumentRequirementAdminRecord | null;
  onCancelEdit: () => void;
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

  const valid =
    workforceBoardId.length > 0 && name.trim().length > 0 && description.trim().length > 0;

  return (
    <div className="panel">
      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 12 }}>
        {existing ? 'Edit requirement' : 'Add / edit requirement'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="req-board">
              Workforce board
            </label>
            <select
              id="req-board"
              className="field-select"
              value={workforceBoardId}
              onChange={(e) => setWorkforceBoardId(e.target.value)}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="req-name">
              Document name
            </label>
            <input
              id="req-name"
              className="field-input"
              placeholder="e.g. Birth certificate"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="req-condition">
              Condition
            </label>
            <select
              id="req-condition"
              className="field-select"
              value={conditional ? 'conditional' : 'required'}
              onChange={(e) => setConditional(e.target.value === 'conditional')}
            >
              <option value="required">Required</option>
              <option value="conditional">Conditional</option>
            </select>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="req-description">
            Description
          </label>
          <textarea
            id="req-description"
            className="field-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {conditional && (
          <div>
            <label className="field-label" htmlFor="req-rule">
              Rule (human-readable, not evaluated)
            </label>
            <input
              id="req-rule"
              className="field-input"
              placeholder="e.g. unemploymentInsuranceStatus is not 'Not applicable'"
              value={applicableRule}
              onChange={(e) => setApplicableRule(e.target.value)}
            />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {existing && (
            <button type="button" className="btn-secondary btn-sm" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="btn-primary btn-sm"
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
              onSaved();
            }}
          >
            {existing ? 'Save changes' : 'Add requirement'}
          </button>
        </div>
      </div>
    </div>
  );
}
