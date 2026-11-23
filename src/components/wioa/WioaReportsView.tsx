import Link from 'next/link';
import { Badge, StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { WioaReportingSummary } from '@/lib/data/wioa';
import { WIOA_STATUS_LABEL } from '@/lib/wioa/status';

function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function formatDays(days: number | null): string {
  return days !== null ? `${Math.round(days)} days` : '—';
}

function formatPercent(rate: number | null): string {
  return rate !== null ? `${Math.round(rate * 100)}%` : '—';
}

/** Renders spec §16's Partner/Staff Dashboard metrics (cohort pipeline, document readiness,
 * follow-up queue, board performance, funding impact) over whatever WIOA cases already exist.
 * Numbers reflect seed/demo data until real cases accumulate — that's expected, not a bug: the
 * queries are real, the volume behind them isn't yet. `boardPerformance`/`fundingImpact` are only
 * passed for the Coordinator report (Partner Staff has no funding visibility, per
 * WIOA_INTEGRATION_PLAN.md Section 5a). Matches RPT01/RPT02's `.pagehdr`/`.mcard`/`.panel`
 * pattern, with one real deviation from RPT02-FundingImpact: that board compares a "requested"
 * dollar figure against "approved" — no such figure exists anywhere in the schema (only
 * FundingAuthorization.approvedAmount does), so this shows approved amounts only, never a
 * fabricated requested-vs-approved comparison. The role-aware segmented tabs on that board
 * (Coordinator/Admin/Partner view) are also not reproduced as a client toggle — the real
 * visibility boundary is enforced server-side via `includeFunding`, not a UI control a viewer
 * could flip between roles they don't have. */
export function WioaReportsView({
  summary,
  basePath,
}: {
  summary: WioaReportingSummary;
  /** Follow-up queue rows link to `${basePath}/[caseId]` — omit for the Admin report, which has
   * no case-detail route (case detail lives only under /coordinator and /partner). */
  basePath?: '/coordinator' | '/partner';
}) {
  const {
    totalCases,
    phaseCounts,
    documentReadiness,
    followUpQueue,
    boardPerformance,
    fundingImpact,
  } = summary;

  return (
    <div className="flex flex-col gap-6">
      <div className="pagehdr">
        <div>
          <h1>Reports</h1>
          <p>
            Pipeline, document readiness{boardPerformance ? ', funding impact,' : ''} and follow-up
            queue across {basePath === '/partner' ? 'your assigned cases' : 'every WIOA case'}.
          </p>
        </div>
      </div>

      {totalCases === 0 ? (
        <StateCard
          icon={<Icon name="bar-chart" className="h-5 w-5" />}
          title="No WIOA cases yet"
          description="Reports will populate once cases open."
        />
      ) : (
        <>
          <section>
            <div className="ov-h">Cohort Pipeline</div>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 12 }}
            >
              {Object.entries(phaseCounts).map(([phase, count]) => (
                <div className="mcard" key={phase}>
                  <span className="n">{count}</span>
                  <span className="l">{phase}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="ov-h">Document Readiness</div>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}
            >
              <div className="mcard">
                <div
                  className="ic"
                  style={{
                    background: 'var(--status-complete-bg)',
                    color: 'var(--status-complete)',
                  }}
                >
                  <Icon name="check" className="h-4 w-4" />
                </div>
                <span className="n">{documentReadiness.accepted}</span>
                <span className="l">Accepted</span>
              </div>
              <div className="mcard">
                <div
                  className="ic"
                  style={{ background: 'var(--status-pending-bg)', color: 'var(--status-pending)' }}
                >
                  <Icon name="clock" className="h-4 w-4" />
                </div>
                <span className="n">{documentReadiness.underReview}</span>
                <span className="l">Under Review</span>
              </div>
              <div className="mcard">
                <div className="ic">
                  <Icon name="upload" className="h-4 w-4" />
                </div>
                <span className="n">{documentReadiness.missing}</span>
                <span className="l">Missing</span>
              </div>
              <div className="mcard">
                <div
                  className="ic"
                  style={{ background: 'var(--status-problem-bg)', color: 'var(--status-problem)' }}
                >
                  <Icon name="paperclip" className="h-4 w-4" />
                </div>
                <span className="n">{documentReadiness.rejected}</span>
                <span className="l">Rejected</span>
              </div>
            </div>
          </section>

          {fundingImpact && boardPerformance && (
            <section>
              <div className="ov-h">Funding Impact</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div className="mcard">
                  <div className="ic">
                    <Icon name="award" className="h-4 w-4" />
                  </div>
                  <span className="n">{formatCurrency(fundingImpact.totalApprovedAmount)}</span>
                  <span className="l">Total funding approved</span>
                </div>
                <div className="mcard">
                  <div className="ic">
                    <Icon name="check" className="h-4 w-4" />
                  </div>
                  <span className="n">{formatPercent(fundingImpact.approvalRate)}</span>
                  <span className="l">Approval rate</span>
                </div>
                <div className="mcard">
                  <div className="ic">
                    <Icon name="clock" className="h-4 w-4" />
                  </div>
                  <span className="n">{formatDays(fundingImpact.avgDaysToApproval)}</span>
                  <span className="l">Avg time to approval</span>
                </div>
                <div className="mcard">
                  <div className="ic">
                    <Icon name="briefcase" className="h-4 w-4" />
                  </div>
                  <span className="n">{fundingImpact.fundedCases}</span>
                  <span className="l">Cases funded</span>
                </div>
              </div>

              {fundingImpact.totalApprovedAmount > 0 && (
                <div className="panel" style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14.5,
                      marginBottom: 12,
                      color: 'var(--ink)',
                    }}
                  >
                    Approved funding by workforce board
                  </div>
                  {boardPerformance
                    .filter((b) => b.totalApprovedAmount > 0)
                    .sort((a, b) => b.totalApprovedAmount - a.totalApprovedAmount)
                    .map((b) => {
                      const max = Math.max(...boardPerformance.map((x) => x.totalApprovedAmount));
                      return (
                        <div className="barlist-row" key={b.boardName}>
                          <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{b.boardName}</span>
                          <div className="barlist-track">
                            <div
                              className="barlist-fill"
                              style={{
                                width: `${max > 0 ? (b.totalApprovedAmount / max) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 12.5,
                              color: 'var(--ink-muted)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(b.totalApprovedAmount)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="dtcard">
                <div className="dtcard-head">
                  <div className="dtcard-title">By workforce board</div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Workforce board</th>
                      <th>Cases funded</th>
                      <th>Approval rate</th>
                      <th>Avg time to approval</th>
                      <th>Total approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardPerformance.map((b) => (
                      <tr key={b.boardName}>
                        <td>{b.boardName}</td>
                        <td>{b.fundedCases}</td>
                        <td>{formatPercent(b.fundingConversionRate)}</td>
                        <td>{formatDays(b.avgDaysToApproval)}</td>
                        <td>{formatCurrency(b.totalApprovedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <div className="ov-h">Follow-Up Queue ({followUpQueue.length})</div>
            {followUpQueue.length === 0 ? (
              <div
                className="panel"
                style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13.5 }}
              >
                No cases need follow-up right now.
              </div>
            ) : (
              <div className="dtcard">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {followUpQueue.map((item, i) => {
                    const content = (
                      <>
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 13.5,
                              fontWeight: 500,
                              color: 'var(--ink)',
                              margin: 0,
                            }}
                          >
                            {item.learnerName}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '2px 0 0' }}>
                            {item.courseTitle} · {item.reason}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Badge tone="pending">{WIOA_STATUS_LABEL[item.status]}</Badge>
                          {basePath && (
                            <Icon
                              name="chevron-right"
                              className="h-4 w-4"
                              style={{ color: 'var(--ink-muted)' }}
                            />
                          )}
                        </div>
                      </>
                    );
                    const rowStyle = {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '14px 20px',
                      borderBottom:
                        i < followUpQueue.length - 1 ? '1px solid var(--nfcap-border)' : 'none',
                      textDecoration: 'none',
                    } as const;
                    return basePath ? (
                      <Link key={item.caseId} href={`${basePath}/${item.caseId}`} style={rowStyle}>
                        {content}
                      </Link>
                    ) : (
                      <div key={item.caseId} style={rowStyle}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
