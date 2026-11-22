'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { updateWioaEmailTemplate } from '@/lib/actions/wioa-email-template';
import type { WioaEmailTemplateRecord } from '@/lib/data/wioa-email-template';
import { Button } from '@/components/admin-ui/button';
import { Card } from '@/components/admin-ui/card';
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
import { Textarea } from '@/components/admin-ui/textarea';

const PLACEHOLDER_HINT =
  'Available tokens: {{learnerName}}, {{city}}, {{zip}}, {{courseTitle}}, {{learnerEmail}}, {{learnerPhone}}';

export function WioaEmailTemplateAdminView({ template }: { template: WioaEmailTemplateRecord }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditOpen(true)}>Edit template</Button>
      </div>

      <Card className="py-0">
        <div className="border-b px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Subject
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{template.subject}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Body</p>
          <pre className="mt-1 font-sans text-sm whitespace-pre-wrap text-foreground">
            {template.body}
          </pre>
        </div>
      </Card>

      <EditDialog
        template={template}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function EditDialog({
  template,
  open,
  onOpenChange,
  onSaved,
}: {
  template: WioaEmailTemplateRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [submitting, setSubmitting] = useState(false);

  const valid = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit WIOA outreach email</DialogTitle>
          <DialogDescription>{PLACEHOLDER_HINT}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={async () => {
              setSubmitting(true);
              await updateWioaEmailTemplate({ subject: subject.trim(), body: body.trim() });
              setSubmitting(false);
              onOpenChange(false);
              onSaved();
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
