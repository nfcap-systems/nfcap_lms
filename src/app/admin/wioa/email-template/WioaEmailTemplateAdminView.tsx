'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Drawer, Field, Input, Textarea } from '@/components/ui';
import { updateWioaEmailTemplate } from '@/lib/actions/wioa-email-template';
import type { WioaEmailTemplateRecord } from '@/lib/data/wioa-email-template';

const PLACEHOLDER_HINT =
  'Available tokens: {{learnerName}}, {{city}}, {{zip}}, {{courseTitle}}, {{learnerEmail}}, {{learnerPhone}}';

export function WioaEmailTemplateAdminView({
  template,
}: {
  template: WioaEmailTemplateRecord;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditOpen(true)}>
          Edit Template
        </Button>
      </div>

      <Card>
        <div className="border-b border-border-subtle px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Subject</p>
          <p className="mt-1 text-sm font-medium text-text-primary">{template.subject}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Body</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-text-primary">
            {template.body}
          </pre>
        </div>
      </Card>

      <EditDrawer
        template={template}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function EditDrawer({
  template,
  open,
  onClose,
  onSaved,
}: {
  template: WioaEmailTemplateRecord;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const valid = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Edit WIOA Outreach Email"
      description={PLACEHOLDER_HINT}
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
              await updateWioaEmailTemplate({ subject: subject.trim(), body: body.trim() });
              setSubmitting(false);
              onClose();
              onSaved();
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Subject" htmlFor="email-subject">
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Body" htmlFor="email-body" hint={PLACEHOLDER_HINT}>
          <Textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
          />
        </Field>
      </div>
    </Drawer>
  );
}
