'use client';

import { Button, Card } from '@/components/ui';
import type { AuditLogEntry } from '@/lib/actions/audit';

function toCsv(entries: AuditLogEntry[]): string {
  const header = ['createdAt', 'actorId', 'actorRole', 'action', 'targetType', 'targetId', 'metadata'];
  const rows = entries.map((e) =>
    [
      e.createdAt.toISOString?.() ?? String(e.createdAt),
      e.actorId,
      e.actorRole,
      e.action,
      e.targetType,
      e.targetId ?? '',
      e.metadata ? JSON.stringify(e.metadata) : '',
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

function downloadCsv(entries: AuditLogEntry[]) {
  const csv = toCsv(entries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AuditLogView({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle p-4">
        <p className="text-sm text-text-secondary">{entries.length} most recent entries</p>
        <Button variant="secondary" onClick={() => downloadCsv(entries)}>
          Export CSV
        </Button>
      </div>
      <div className="divide-y divide-border-subtle">
        {entries.length === 0 && <p className="p-5 text-sm text-text-secondary">No activity yet.</p>}
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-1 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-brand-heading">{entry.action}</span>
              <span className="text-text-secondary">{entry.createdAt.toLocaleString()}</span>
            </div>
            <p className="text-text-secondary">
              {entry.actorRole} ({entry.actorId}) · {entry.targetType}
              {entry.targetId ? ` #${entry.targetId}` : ''}
            </p>
            {entry.metadata != null && (
              <pre className="mt-1 overflow-x-auto rounded bg-bg-subtle p-2 text-xs text-text-secondary">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
