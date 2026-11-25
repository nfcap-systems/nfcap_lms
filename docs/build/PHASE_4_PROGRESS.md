# Phase 4 — Credential Integrity & Portability — execution status

Working log against `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`'s "Phase 4 —
Credential Integrity & Portability" (4 features, 80h). Mirrors `docs/build/PHASE_0_PROGRESS.md`
through `PHASE_3_PROGRESS.md`'s convention.

## Status as of 2026-11-25

Real build output exists, done ahead of phase order as part of the mockup-driven build
(`docs/plans/mockup-complete-build.md`, Layer 1 + 3A). **Already merged to `stage`** via PR #24
("Admin UI parity + design-system migration (Layers 0-2, Learner/Admin/Coordinator/Partner
shells)", merged 2026-11-24, merge commit `66df6d5`), which carries commits `2c59e17`, `df4668c`,
and `ffd9d36` — confirmed via `git merge-base --is-ancestor` against that merge commit, not
inferred from a plan doc. `docs/plans/mockup-complete-build.md`'s scope ledger claiming "Phase 4:
0h shipped" is stale as of this writing — corrected here.

| # | Feature | Hrs | State |
| - | --- | ---: | --- |
| 1 | Downloadable PDF Certificate | 20 | **Built & wired.** `src/lib/pdf/certificate.tsx` (react-pdf), `getCertificatePdfBase64` action, "Download PDF" button in `HomeView.tsx` and `CertificateCard.tsx`. |
| 2 | Public Verification Page + QR Code | 20 | **Built, scope reduced — see decision below.** `Certificate.publicSlug`, `generateCertificatePublicSlug`, real `/verify/[slug]` route, "Copy verify link" button. **QR code image dropped by user decision 2026-11-25** — the link itself is the verification mechanism; no QR graphic will be built. |
| 3 | Expiry & Renewal Reminders | 22 | **Dropped by user decision 2026-11-25 — see below.** Certificates will not expire. |
| 4 | Shareable Verified Portfolio | 18 | **Built & wired.** `LearnerProfile.portfolioShareToken`, `generatePortfolioShareToken`/`revokePortfolioShareToken`, real `/portfolio/[token]` route, `SharePortfolioPanel`. |

## Decision — Expiry & Renewal Reminders dropped, 2026-11-25

User decision: certificates will not expire. Rationale discussed — flooring installation is a
physical skill, not the kind of thing that goes stale the way a CPR/safety-card certification
might, and no NFCAP licensing/compliance requirement for renewal is known. This feature (22h) is
dropped from the build entirely, not deferred.

**Flag for client sign-off:** the client scope doc (`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`
line 115/263/273 and `NFCAP_LMS_Feature_Detail_Client.md` line 115/410) lists "Expiry & Renewal
Reminders" as a scoped feature and names "Do credentials expire?" as an explicit open decision for
NFCAP to answer. This was decided internally in this session, not by NFCAP directly — worth
confirming with the client (or whoever owns client communication) that "no expiry" is the actual
answer, same as the QR flag below, rather than treating it as closed on our own authority.

## Decision — QR code dropped, 2026-11-25

User decision: drop the QR code image from "Public Verification Page + QR Code." The copyable
`/verify/[slug]` link is the verification mechanism; no QR graphic will be built.

**Flag for client sign-off:** the client scope doc (`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`
line 114/262, and the `NFCAP_LMS_Feature_Detail_Client.md` journey table line 38) explicitly names
"a QR code" as part of this feature's contracted description and "Done when" checklist ("Scanning
a certificate's QR code publicly verifies it without a login"). Those client-facing docs have not
been updated to match this decision — they still describe/commit to a QR code. Since those are the
approved scope documents the client signed off on, this should be confirmed with the client (or
whoever owns client communication) before being treated as a closed scope change, not just
corrected silently in internal docs.

## What's open

1. **Client sign-off on dropping Expiry & Renewal Reminders and the QR code** — see decisions
   above. Both were decided in this session, not confirmed with NFCAP directly.

With both decisions above, **Phase 4 is functionally complete** (58h of built work, already on
`stage` via PR #24; the remaining 22h is dropped, not outstanding) — pending client confirmation
only.
