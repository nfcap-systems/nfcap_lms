'use client';

import { useRef, useState } from 'react';
import {
  bulkEnrollLearners,
  exportEvidenceReviewHistoryCsv,
  exportLearnersCsv,
  exportWioaCasesCsv,
  type BulkEnrollResult,
} from '@/lib/actions/data-io';
import { Button } from '@/components/admin-ui/button';
import { Icon } from '@/components/icons';

const TEMPLATE_CSV = 'name,email\nJane Trainee,jane@example.com\n';

function downloadText(filename: string, content: string, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal CSV parser for the shape our own template produces — no quoted-comma fields, no
 * multi-line cells. Good enough for the "name,email" bulk-enroll upload; a real CSV library would
 * be overkill for one fixed two-column shape. */
function parseCsv(text: string): { name: string; email: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const [header, ...dataLines] = lines;
  const cols = header.split(',').map((c) => c.trim().toLowerCase());
  const nameIdx = cols.indexOf('name');
  const emailIdx = cols.indexOf('email');
  if (emailIdx === -1) return [];

  return dataLines.map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return { name: nameIdx === -1 ? '' : (cells[nameIdx] ?? ''), email: cells[emailIdx] ?? '' };
  });
}

const EXPORTS = [
  {
    key: 'learners',
    title: 'All learners (CSV)',
    description: 'Name, email, pathway, status',
    run: exportLearnersCsv,
    filename: 'learners.csv',
  },
  {
    key: 'evidence',
    title: 'Evidence review history (CSV)',
    description: 'All approve/reject decisions',
    run: exportEvidenceReviewHistoryCsv,
    filename: 'evidence-review-history.csv',
  },
  {
    key: 'wioa',
    title: 'WIOA funding cases (CSV)',
    description: 'Case status, board, dates',
    run: exportWioaCasesCsv,
    filename: 'wioa-funding-cases.csv',
  },
] as const;

export function DataIoView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<{ name: string; email: string }[]>([]);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setFileName(file.name);
    setRows(parseCsv(text));
    setResult(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Data Import / Export</h1>
          <p>Bulk-enroll learners and export data snapshots.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div className="panel" style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>
            Bulk-enroll learners
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 14 }}>
            Upload a CSV of name and email to enroll existing learner accounts into the
            pathway&apos;s open courses. Rows with no matching account are flagged — this
            doesn&apos;t create new accounts.
          </div>
          <div
            className="dropzone"
            style={{ marginBottom: 14, cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Icon
              name="upload"
              className="h-7 w-7"
              style={{ marginBottom: 8, color: 'var(--ink-muted)' }}
            />
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
              {fileName ? fileName : 'Drop a CSV here, or click to browse'}
            </div>
            <div style={{ fontSize: 12 }}>Max 500 rows · .csv only</div>
          </div>
          <a
            style={{ fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => downloadText('learner-import-template.csv', TEMPLATE_CSV)}
          >
            Download CSV template →
          </a>

          {rows.length > 0 && !result && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 10 }}>
                {rows.length} row{rows.length === 1 ? '' : 's'} parsed from {fileName}.
              </div>
              <Button
                size="sm"
                disabled={enrolling}
                onClick={async () => {
                  setEnrolling(true);
                  const outcome = await bulkEnrollLearners(rows);
                  setResult(outcome);
                  setEnrolling(false);
                }}
              >
                Enroll {rows.length} learner{rows.length === 1 ? '' : 's'}
              </Button>
            </div>
          )}

          {result && (
            <div
              style={{
                marginTop: 18,
                borderTop: '1px solid var(--nfcap-border)',
                paddingTop: 14,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Last import</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                {fileName} · {result.enrolledCount} enrolled
                {result.notFoundCount > 0
                  ? ` · ${result.notFoundCount} flagged (no matching account)`
                  : ''}
              </div>
              {result.notFoundCount > 0 && (
                <ul
                  style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-muted)', paddingLeft: 18 }}
                >
                  {result.outcomes
                    .filter((o) => o.status === 'not-found')
                    .map((o) => (
                      <li key={o.email}>
                        {o.email} — no existing account; they need to sign up first.
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>Export data</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 14 }}>
            Download a snapshot for reporting or backup.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {EXPORTS.map((exp) => (
              <div
                key={exp.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--nfcap-border)',
                  borderRadius: 'var(--nfcap-radius-md)',
                  padding: '12px 14px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{exp.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{exp.description}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingKey === exp.key}
                  onClick={async () => {
                    setExportingKey(exp.key);
                    const csv = await exp.run();
                    downloadText(exp.filename, csv);
                    setExportingKey(null);
                  }}
                >
                  {exportingKey === exp.key ? 'Exporting…' : 'Export'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
