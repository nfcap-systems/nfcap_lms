'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { updateWioaEmailTemplate } from '@/lib/actions/wioa-email-template';
import type { WioaEmailTemplateRecord } from '@/lib/data/wioa-email-template';

const TOKENS = ['learnerName', 'city', 'zip', 'courseTitle', 'learnerEmail', 'learnerPhone'];

export function WioaEmailTemplateAdminView({ template }: { template: WioaEmailTemplateRecord }) {
  const router = useRouter();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const valid = subject.trim().length > 0 && body.trim().length > 0;
  const dirty = subject !== template.subject || body !== template.body;

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Outreach Email Template</h1>
          <p>Pre-fills the message a learner reviews and sends from their Funding page.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
          {justSaved && !dirty && (
            <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Saved</span>
          )}
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!valid || !dirty || submitting}
            onClick={async () => {
              setSubmitting(true);
              await updateWioaEmailTemplate({ subject: subject.trim(), body: body.trim() });
              setSubmitting(false);
              setJustSaved(true);
              router.refresh();
            }}
          >
            Save template
          </button>
        </div>
      </div>

      <div className="wioa-cols">
        <div className="panel" style={{ flex: 1.2 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 12 }}>Template</div>
          <label className="field-label" htmlFor="email-subject">
            Subject
          </label>
          <input
            id="email-subject"
            className="field-input"
            style={{ marginBottom: 12 }}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setJustSaved(false);
            }}
          />
          <label className="field-label" htmlFor="email-body">
            Body
          </label>
          <textarea
            id="email-body"
            className="field-textarea"
            style={{ minHeight: 280 }}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setJustSaved(false);
            }}
          />
        </div>

        <div className="panel">
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>
            Available variables
          </div>
          <div style={{ fontSize: 13, lineHeight: 2.1 }}>
            {TOKENS.map((token) => (
              <div key={token}>
                <span className="chip2">{`{{${token}}}`}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 16,
              borderTop: '1px solid var(--nfcap-border)',
              paddingTop: 14,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Delivery</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
              Learner reviews and confirms before sending — this template is never sent
              automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
