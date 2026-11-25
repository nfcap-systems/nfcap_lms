'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateWioaEmailTemplate } from '@/lib/actions/wioa-email-template';
import type { WioaEmailTemplateRecord } from '@/lib/data/wioa-email-template';
import { fillWioaEmailTemplate } from '@/lib/wioa/email-template';

const TOKENS = ['learnerName', 'city', 'zip', 'courseTitle', 'learnerEmail', 'learnerPhone'];

const PREVIEW_SAMPLE = {
  learnerName: 'Jordan Alvarez',
  city: 'Los Angeles',
  zip: '90012',
  courseTitle: 'Tile Installation',
  learnerEmail: 'jordan.alvarez@example.com',
  learnerPhone: '(213) 555-0148',
};

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
              try {
                await updateWioaEmailTemplate({ subject: subject.trim(), body: body.trim() });
                setJustSaved(true);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not save the template.');
              } finally {
                setSubmitting(false);
              }
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
          <div
            style={{
              marginTop: 16,
              borderTop: '1px solid var(--nfcap-border)',
              paddingTop: 14,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
              Available variables
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TOKENS.map((token) => (
                <span key={token} className="chip2">{`{{${token}}}`}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Email preview</div>
            <div
              style={{
                border: '1px solid var(--nfcap-border)',
                borderRadius: 'var(--nfcap-radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--nfcap-border)',
                  background: 'var(--surface-muted)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 2 }}>
                  Subject
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {fillWioaEmailTemplate(subject, PREVIEW_SAMPLE) || '—'}
                </div>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--ink)',
                }}
              >
                {fillWioaEmailTemplate(body, PREVIEW_SAMPLE) || '—'}
              </pre>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 8 }}>
              Shown with example learner data — not sent.
            </div>
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
