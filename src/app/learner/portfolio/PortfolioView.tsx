import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { EvidenceThumbnail } from '@/components/learner/EvidenceThumbnail';
import { SharePortfolioPanel } from '@/components/learner/SharePortfolioPanel';
import type { Credential } from '@/lib/data/credentials';

export function PortfolioView({
  credentials,
  awaitingReview,
  shareToken,
}: {
  credentials: Credential[];
  awaitingReview: number;
  shareToken: string | null;
}) {
  const courseGroups = new Map<string, { title: string; items: Credential[] }>();
  for (const credential of credentials) {
    const group = courseGroups.get(credential.course.id);
    if (group) {
      group.items.push(credential);
    } else {
      courseGroups.set(credential.course.id, {
        title: credential.course.title,
        items: [credential],
      });
    }
  }
  const coursesCovered = courseGroups.size;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--ink)',
          }}
        >
          Portfolio
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 4 }}>
          Every piece of evidence you&apos;ve submitted, grouped by course — kept for apprenticeship
          records and future employers.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <div className="lrn-stat">
          <span
            className="lrn-stat-icon"
            style={{ background: '#eff6ff', color: 'var(--nfcap-accent)' }}
          >
            <Icon name="clipboard" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">{credentials.length}</span>
            <span className="l">Evidence pieces</span>
          </div>
        </div>
        <div className="lrn-stat">
          <span className="lrn-stat-icon" style={{ background: '#f0fdf4', color: '#166534' }}>
            <Icon name="check" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">
              {credentials.length} / {credentials.length}
            </span>
            <span className="l">Met, no resubmits</span>
          </div>
        </div>
        <div className="lrn-stat">
          <span className="lrn-stat-icon" style={{ background: '#f3eefe', color: '#7c3aed' }}>
            <Icon name="book" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">{coursesCovered}</span>
            <span className="l">Courses covered</span>
          </div>
        </div>
        <div className="lrn-stat">
          <span className="lrn-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Icon name="clock" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">{awaitingReview}</span>
            <span className="l">Awaiting review</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          {credentials.length === 0 ? (
            <>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--nfcap-border)',
                  borderRadius: 'var(--nfcap-radius-lg)',
                  boxShadow: 'var(--nfcap-shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 18,
                  padding: '88px 24px',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--surface-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-muted)',
                  }}
                >
                  <Icon name="briefcase" className="h-7 w-7" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 430 }}>
                  <b
                    style={{ fontSize: 19, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}
                  >
                    No evidence submitted yet
                  </b>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                    Once you submit practical evidence from a lesson, it&apos;s kept here
                    automatically — organized by course, ready for review and your apprenticeship
                    records.
                  </div>
                </div>
                <Link href="/learner/my-learning">
                  <Button>Go to My Learning</Button>
                </Link>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: 'var(--nfcap-radius-lg)',
                  padding: '16px 20px',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--nfcap-radius-md)',
                    background: '#dbeafe',
                    color: 'var(--nfcap-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="alert-circle" className="h-4 w-4" />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                  Each module has a practical evidence submission once you reach it — your reviewer
                  sees it as <b>Met</b> or <b>Not Met</b> with a note, right here in your portfolio.
                </div>
              </div>
            </>
          ) : (
            Array.from(courseGroups.values()).map((group) => {
              // The board's evidence card is one per evidence piece (one per criterion for a
              // guided submission, one per legacy submission), not one per credential/certificate
              // — flatten to match (same pattern HomeView's evidencePieces shelf already uses).
              const pieces = group.items.flatMap((credential) =>
                credential.criteria.length > 0
                  ? credential.criteria.map((criterion) => ({
                      key: criterion.criterionAssessmentId,
                      title: criterion.title,
                      hasFile: criterion.hasFile,
                      criterionAssessmentId: criterion.criterionAssessmentId as string | undefined,
                      evidenceSubmissionId: undefined as string | undefined,
                      fileName: criterion.fileName,
                    }))
                  : [
                      {
                        key: credential.evidence.id,
                        title: credential.evidence.description,
                        hasFile: credential.evidence.hasSubmissionFile,
                        criterionAssessmentId: undefined as string | undefined,
                        evidenceSubmissionId: credential.evidence.id as string | undefined,
                        fileName: credential.evidence.fileName,
                      },
                    ],
              );

              return (
                <div
                  key={group.title}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                    {group.title}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 16,
                    }}
                  >
                    {pieces.map((piece) => (
                      <div key={piece.key} className="port-pcard">
                        {piece.hasFile ? (
                          <EvidenceThumbnail
                            variant="cover"
                            criterionAssessmentId={piece.criterionAssessmentId}
                            evidenceSubmissionId={piece.evidenceSubmissionId}
                          />
                        ) : (
                          <div
                            className="thumb"
                            style={{
                              background: 'var(--surface-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--ink-faint)',
                            }}
                          >
                            <Icon name="image" className="h-6 w-6" />
                          </div>
                        )}
                        <div className="body">
                          <div className="t">{piece.title}</div>
                          <Badge tone="success" style={{ width: 'fit-content' }}>
                            <Icon name="check" className="h-3 w-3" />
                            Met
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SharePortfolioPanel initialToken={shareToken} />
          <div className="lrn-side-panel">
            <div className="lrn-side-title">
              <h3>How review works</h3>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                fontSize: 12.5,
                color: 'var(--ink-muted)',
                lineHeight: 1.5,
              }}
            >
              <Icon
                name="check"
                className="h-3.5 w-3.5"
                style={{ color: 'var(--nfcap-accent)', flexShrink: 0, marginTop: 2 }}
              />
              Submit evidence from any practical lesson — it lands here automatically once reviewed.
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                fontSize: 12.5,
                color: 'var(--ink-muted)',
                lineHeight: 1.5,
              }}
            >
              <Icon
                name="check"
                className="h-3.5 w-3.5"
                style={{ color: 'var(--nfcap-accent)', flexShrink: 0, marginTop: 2 }}
              />
              <span>
                <strong style={{ color: 'var(--ink)' }}>Met</strong> or{' '}
                <strong style={{ color: 'var(--ink)' }}>Not Met</strong>, with a reviewer note
                either way — never left pending silently.
              </span>
            </div>
          </div>

          <div className="lrn-side-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--surface-muted)',
                  color: 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="user" className="h-5 w-5" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                  Your mentor
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Not yet assigned</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
