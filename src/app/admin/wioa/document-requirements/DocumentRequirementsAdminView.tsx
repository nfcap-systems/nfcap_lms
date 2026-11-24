'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';

import {
  createWioaDocumentRequirement,
  updateWioaDocumentRequirement,
} from '@/lib/actions/wioa-document-requirements';
import type { WioaDocumentRequirementAdminRecord } from '@/lib/data/wioa-document-requirements';
import type { WorkforceBoardSummary } from '@/lib/data/wioa-boards';
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
        <Button onClick={() => setAddOpen(true)} disabled={boards.length === 0}>
          <Plus className="size-4" />
          Add requirement
        </Button>
      </div>

      {boards.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Add a workforce board first — requirements are scoped per board.
          </CardContent>
        </Card>
      ) : requirements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No document requirements yet.
          </CardContent>
        </Card>
      ) : (
        groupByBoard(requirements).map(([boardName, rows]) => (
          <Card key={boardName} className="py-0">
            <p className="border-b px-4 py-3 text-sm font-semibold text-foreground">{boardName}</p>
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.conditional ? (
                      <Badge variant="warning">Conditional</Badge>
                    ) : (
                      <Badge variant="outline">Required</Badge>
                    )}
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

      <RequirementDialog
        key={editing?.id ?? 'new'}
        boards={boards}
        open={addOpen || editing !== null}
        existing={editing}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function RequirementDialog({
  boards,
  open,
  existing,
  onOpenChange,
  onSaved,
}: {
  boards: WorkforceBoardSummary[];
  open: boolean;
  existing: WioaDocumentRequirementAdminRecord | null;
  onOpenChange: (open: boolean) => void;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing ? 'Edit document requirement' : 'Add document requirement'}
          </DialogTitle>
          <DialogDescription>
            A conditional requirement only actually applies at case creation for the one hardcoded
            rule (EDD Award Letter) — a custom conditional name always generates, same as
            non-conditional.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-board">Workforce board</Label>
            <Select value={workforceBoardId} onValueChange={setWorkforceBoardId}>
              <SelectTrigger id="req-board" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-name">Name</Label>
            <Input id="req-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-description">Description</Label>
            <Textarea
              id="req-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={conditional}
              onCheckedChange={(checked) => setConditional(checked === true)}
            />
            Conditional — only applies to some learners
          </label>
          {conditional && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="req-rule">Rule (human-readable, not evaluated)</Label>
              <Input
                id="req-rule"
                value={applicableRule}
                onChange={(e) => setApplicableRule(e.target.value)}
                placeholder="e.g. unemploymentInsuranceStatus is not 'Not applicable'"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
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
              onOpenChange(false);
              onSaved();
            }}
          >
            {existing ? 'Save changes' : 'Add requirement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
