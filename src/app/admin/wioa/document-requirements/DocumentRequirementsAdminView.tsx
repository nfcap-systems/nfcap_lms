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
import { Badge, Dialog, StateCard } from '@/components/ui';

type FormTarget = 'add' | WioaDocumentRequirementAdminRecord;

export function DocumentRequirementsAdminView({
  requirements,
  boards,
}: {
  requirements: WioaDocumentRequirementAdminRecord[];
  boards: WorkforceBoardSummary[];
}) {
  const router = useRouter();
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id ?? '');
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  if (boards.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pagehdr">
          <div>
            <h1>Document Requirements</h1>
            <p>The checklist shown to learners during WIOA document upload.</p>
          </div>
        </div>
        <StateCard
          icon={<Icon name="file-text" className="h-5 w-5" />}
          title="Add a workforce board first"
          description="Requirements are scoped per board."
        />
      </div>
    );
  }

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) ?? boards[0];
  const boardRequirements = requirements.filter((r) => r.workforceBoardId === selectedBoard.id);

  function selectBoard(boardId: string) {
    setSelectedBoardId(boardId);
    setFormTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Document Requirements</h1>
          <p>The checklist shown to learners during WIOA document upload.</p>
        </div>
      </div>

      <div className="splitwrap">
        <div className="splitlist">
          {boards.map((b) => {
            const count = requirements.filter((r) => r.workforceBoardId === b.id).length;
            return (
              <button
                key={b.id}
                type="button"
                className={b.id === selectedBoard.id ? 'splititem on' : 'splititem'}
                onClick={() => selectBoard(b.id)}
              >
                <span className="name">{b.name}</span>
                <span className="meta">
                  {count} requirement{count === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="splitdetail">
          <div className="splitdetailhdr">
            <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedBoard.name}</div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setFormTarget('add')}
            >
              + Add requirement
            </button>
          </div>

          {boardRequirements.length === 0 ? (
            <div style={{ padding: 20 }}>
              <StateCard
                icon={<Icon name="file-text" className="h-5 w-5" />}
                title="No document requirements yet"
                description="Add one below."
              />
            </div>
          ) : (
            boardRequirements.map((r) => (
              <div key={r.id} className="reqrow">
                <Icon
                  name="file-text"
                  className="h-4 w-4 shrink-0"
                  style={{ color: 'var(--ink-muted)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{r.description}</div>
                </div>
                <Badge tone={r.conditional ? 'neutral' : 'success'}>
                  {r.conditional ? 'Conditional' : 'Required'}
                </Badge>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setFormTarget(r)}>
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        title={formTarget === 'add' ? 'Add requirement' : 'Edit requirement'}
        description={selectedBoard.name}
      >
        {formTarget !== null && (
          <RequirementForm
            key={formTarget === 'add' ? 'add' : formTarget.id}
            boardId={selectedBoard.id}
            existing={formTarget === 'add' ? null : formTarget}
            onCancelEdit={() => setFormTarget(null)}
            onSaved={() => {
              setFormTarget(null);
              router.refresh();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function RequirementForm({
  boardId,
  existing,
  onCancelEdit,
  onSaved,
}: {
  boardId: string;
  existing: WioaDocumentRequirementAdminRecord | null;
  onCancelEdit: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [conditional, setConditional] = useState(existing?.conditional ?? false);
  const [applicableRule, setApplicableRule] = useState(existing?.applicableRule ?? '');
  const [submitting, setSubmitting] = useState(false);

  const valid = name.trim().length > 0 && description.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
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
                workforceBoardId: boardId,
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
  );
}
