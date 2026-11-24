import { Icon } from '@/components/icons';
import { StateCard } from '@/components/ui';
import { LearnerFooter } from '@/components/layout/LearnerFooter';
import { PublicEvidenceThumbnail } from '@/components/learner/PublicEvidenceThumbnail';
import type { Credential } from '@/lib/data/credentials';

export type PublicPortfolio = { learnerName: string; credentials: Credential[]; token: string };

/** Shareable Verified Portfolio's public, no-login view (docs/client's Phase 4 "genuinely novel
 * asset for a tradesperson to carry to an employer"). Reuses `/verify/[slug]`'s minimal public
 * top bar rather than the authenticated Learner shell, and the same "not found" `StateCard` for
 * an unknown or revoked token — no distinguishing the two (minimal-disclosure). No board exists
 * for this screen; it's `/learner/portfolio`'s own evidence grid stripped to what's safe to show
 * a stranger (no Share panel, no "Awaiting review" count, no mentor stub). */
export function PublicPortfolioView({ portfolio }: { portfolio: PublicPortfolio | null }) {
  const courseGroups = new Map<string, { title: string; items: Credential[] }>();
  if (portfolio) {
    for (const credential of portfolio.credentials) {
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
  }

  return (
    <div
      data-system="learner"
      style={{ minHeight: '100vh', background: 'var(--surface-muted)', display: 'flex' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 64,
            borderBottom: '1px solid var(--nfcap-border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            gap: 10,
            background: '#fff',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: '#1f2328',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="shield" className="h-4 w-4" stroke="#fff" />
          </div>
          <span
            style={{
              fontFamily: 'Geist, sans-serif',
              fontWeight: 700,
              fontSize: 16.5,
              letterSpacing: '-0.01em',
              color: '#1f2328',
            }}
          >
            NFCAP
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            Shared portfolio — no sign-in required
          </span>
        </div>

        <div
          style={{
            maxWidth: 880,
            margin: '0 auto',
            padding: '40px 24px 64px',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {portfolio ? (
            <>
              <div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--ink)',
                  }}
                >
                  {portfolio.learnerName}&apos;s Verified Portfolio
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 4 }}>
                  Evidence reviewed and verified by NFCAP, grouped by course — every piece below
                  earned a &ldquo;Met&rdquo; from a reviewer.
                </div>
              </div>

              {portfolio.credentials.length === 0 ? (
                <StateCard
                  icon={<Icon name="briefcase" className="h-6 w-6" />}
                  title="No verified work yet"
                  description="This learner hasn't earned any verified credentials yet."
                />
              ) : (
                Array.from(courseGroups.values()).map((group) => {
                  const pieces = group.items.flatMap((credential) =>
                    credential.criteria.length > 0
                      ? credential.criteria.map((criterion) => ({
                          key: criterion.criterionAssessmentId,
                          title: criterion.title,
                          hasFile: criterion.hasFile,
                          criterionAssessmentId: criterion.criterionAssessmentId as
                            string | undefined,
                          evidenceSubmissionId: undefined as string | undefined,
                        }))
                      : [
                          {
                            key: credential.evidence.id,
                            title: credential.evidence.description,
                            hasFile: credential.evidence.hasSubmissionFile,
                            criterionAssessmentId: undefined as string | undefined,
                            evidenceSubmissionId: credential.evidence.id as string | undefined,
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
                              <PublicEvidenceThumbnail
                                token={portfolio.token}
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
                              <span
                                className="badge-complete"
                                style={{ width: 'fit-content', fontSize: 11.5 }}
                              >
                                ✓ Met
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}

              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: 'var(--ink-muted)',
                  textAlign: 'center',
                  maxWidth: 560,
                  alignSelf: 'center',
                }}
              >
                This link was shared directly by {portfolio.learnerName}. Every item shown was
                reviewed and marked Met by an NFCAP reviewer — nothing here is self-reported.
              </p>
            </>
          ) : (
            <StateCard
              icon={<Icon name="alert-circle" className="h-6 w-6" />}
              title="Portfolio not found"
              description="This link is invalid or the learner has stopped sharing their portfolio."
              tone="problem"
            />
          )}
        </div>

        <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px', width: '100%' }}>
          <LearnerFooter maxWidth={880} nested />
        </div>
      </div>
    </div>
  );
}
