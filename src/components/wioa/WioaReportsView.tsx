import Link from 'next/link';
import { Badge, Card, CardContent } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { WioaReportingSummary } from '@/lib/data/wioa';
import { WIOA_STATUS_LABEL } from '@/lib/wioa/status';

/** Renders spec §16's Partner/Staff Dashboard metrics (cohort pipeline, document readiness,
 * follow-up queue, board performance) over whatever WIOA cases already exist. Numbers reflect
 * seed/demo data until real cases accumulate — that's expected, not a bug: the queries are real,
 * the volume behind them isn't yet. `boardPerformance` is only passed for the Coordinator report
 * (Partner Staff has no funding visibility, per WIOA_INTEGRATION_PLAN.md Section 5a). */
export function WioaReportsView({
  summary,
  basePath,
}: {
  summary: WioaReportingSummary;
  /** Follow-up queue rows link to `${basePath}/[caseId]` — omit for the Admin report, which has
   * no case-detail route (case detail lives only under /coordinator and /partner). */
  basePath?: '/coordinator' | '/partner';
}) {
  const { totalCases, phaseCounts, documentReadiness, followUpQueue, boardPerformance } = summary;

  if (totalCases === 0) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-text-secondary">
          No WIOA cases yet — reports will populate once cases open.
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Cohort Pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(phaseCounts).map(([phase, count]) => (
            <Card key={phase}>
              <CardContent className="text-center">
                <p className="text-2xl font-semibold text-brand-heading">{count}</p>
                <p className="text-xs text-text-muted">{phase}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Document Readiness</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Accepted" value={documentReadiness.accepted} icon="check" />
          <Stat label="Under Review" value={documentReadiness.underReview} icon="clock" />
          <Stat label="Missing" value={documentReadiness.missing} icon="upload" />
          <Stat label="Rejected" value={documentReadiness.rejected} icon="paperclip" />
        </div>
      </section>

      {boardPerformance && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Board Performance</h2>
          <Card>
            <div className="divide-y divide-border-subtle">
              {boardPerformance.map((b) => (
                <div key={b.boardName} className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{b.boardName}</p>
                    <p className="text-xs text-text-muted">{b.totalCases} cases</p>
                  </div>
                  <Metric
                    label="Approval Rate"
                    value={b.approvalRate !== null ? `${Math.round(b.approvalRate * 100)}%` : '—'}
                  />
                  <Metric
                    label="Avg. Days to Eligibility"
                    value={
                      b.avgDaysToEligibility !== null ? b.avgDaysToEligibility.toFixed(1) : '—'
                    }
                  />
                  <Metric
                    label="Funding Conversion"
                    value={
                      b.fundingConversionRate !== null
                        ? `${Math.round(b.fundingConversionRate * 100)}%`
                        : '—'
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Follow-Up Queue ({followUpQueue.length})
        </h2>
        {followUpQueue.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-text-secondary">
              No cases need follow-up right now.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border-subtle">
              {followUpQueue.map((item) => {
                const content = (
                  <>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{item.learnerName}</p>
                      <p className="text-xs text-text-muted">
                        {item.courseTitle} · {item.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone="pending">{WIOA_STATUS_LABEL[item.status]}</Badge>
                      {basePath && <Icon name="chevron-right" className="size-4 text-text-muted" />}
                    </div>
                  </>
                );
                return basePath ? (
                  <Link
                    key={item.caseId}
                    href={`${basePath}/${item.caseId}`}
                    className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-bg-subtle"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={item.caseId} className="flex items-center justify-between gap-4 p-5">
                    {content}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: Parameters<typeof Icon>[0]['name'];
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
          <Icon name={icon} className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-brand-heading">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
