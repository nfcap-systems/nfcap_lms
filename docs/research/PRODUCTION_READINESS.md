# Production-Readiness Research — Compliance, Hosting, Data Protection

Third research pass. The first two (`COMPETITOR_LANDSCAPE.md`, `TRADE_AND_WIOA_LANDSCAPE.md`)
answered "what should this product do." This one answers "what does it take to run this for
real NFCAP trainees" — triggered by the decision to plan toward production use, not just a
demo. Findings are from government guidance letters, vendor documentation, and third-party
pricing guides — not official legal advice. Nothing here should be treated as a compliance
sign-off; a real legal/compliance review is still needed before production use.

**Researched:** 2026-10-25

---

## 1. Accessibility — this is a real, non-optional requirement

**Finding:** Because NFCAP LMS touches WIOA-funded training, it almost certainly falls under
**WIOA Section 188** accessibility requirements (29 CFR Part 38), which training providers
("eligible training providers") are explicitly covered by, not just workforce boards themselves.
Section 188 doesn't *mandate* WCAG 2.1 by name, but meeting **WCAG 2.1** is treated as satisfying
it in practice. Section 504 (29 CFR Part 32) is cited alongside it in at least one state's
guidance.

**What this means for us concretely:** our current `PRODUCT_CONTEXT.md` Section 11 (design
direction) and `docs/build/BUILD_WORKFLOW.md` Phase 5 ("UX polish") mention responsive design and
visual consistency, but **nothing currently mentions accessibility** (screen readers, keyboard
navigation, color contrast, alt text, form labeling). This is a gap in the written plan, not just
in the build. If NFCAP LMS is going toward real use, an accessibility pass (ideally WCAG 2.1 AA)
should become its own named phase, not folded silently into general polish.

**Caveat:** sources here are a 2026 training slide deck and older state guidance letters, not the
current regulatory text itself. The exact compliance obligation should be confirmed with NFCAP or
their workforce-board contact before scoping specific work — but "accessibility is probably
required, not optional" is a safe enough signal to plan around now.

---

## 2. Hosting cost reality (Supabase, our current backend)

**Finding:** The free tier (what we're presumably on now) auto-pauses after a week of
inactivity and caps database storage at 500MB — **not viable for real, always-on production use**
regardless of how small NFCAP's trainee count is. The next tier up (Pro) runs roughly
**$25/month base**, but that's a floor, not a real estimate — compute is billed continuously
(no scale-to-zero), and overages apply to database storage (~$0.125/GB over 8GB included),
file storage (~$0.021/GB over 100GB), and egress/bandwidth (~$0.09/GB). Realistic small-scale
production estimates from third parties land around **$35–50/month** before any heavy file
storage use.

**What this means for us concretely:** two things currently marked "not built yet" both add
direct cost here:
- **Real file storage for Practical Evidence** (currently filename-only) — once trainees upload
  actual photos/documents, file storage and egress costs become real, not theoretical.
- **WIOA document storage** already uses a real private Supabase Storage bucket — this cost
  already exists today, just not yet audited against the current Supabase plan/tier.

**Caveat:** all figures are third-party estimates (May–July 2026), not Supabase's own current
pricing page — confirm directly at supabase.com/pricing before budgeting anything real.

---

## 3. Trainee data privacy / PII — this is a real, non-optional requirement

**Finding:** WIOA participant PII is governed by a stack of rules: WIOA Section 188, federal
regulations (20 CFR 677/680), the Privacy Act of 1974, and — importantly — **FERPA** for
education records, which several local California workforce boards explicitly call out
alongside WIOA-specific PII policies. Typical requirements seen across multiple county/state
policies: PII must be protected in handling, transmission, and storage; access must be limited to
authorized staff; and improper disclosure can risk the funding itself (one source: can result in
termination/suspension of grant funds for the responsible agency).

**What this means for us concretely:** `docs/build/WIOA_BUILD_WORKFLOW.md`'s own decisions log is
explicit that the current prototype's posture is **"demo/seeded documents only, no real learner
PII"** — i.e., the team already correctly identified that real PII isn't safe to put in the
prototype yet. Moving toward production directly reopens this: real trainee addresses, SSNs
(potentially), employment status, and uploaded identity documents are all PII that would need
real protections — encryption at rest/in transit, access logging, a retention/deletion policy,
and likely a signed data-sharing/confidentiality agreement with whichever workforce board NFCAP
partners with. None of this is built or planned yet.

**Caveat:** no single current California Workforce Development Board or EDD policy document was
found directly — the findings are from county-level policies (San Luis Obispo, San Francisco,
Santa Ana) and older CDE guidance. NFCAP's actual workforce-board partner will have its own PII
agreement that should be gotten directly rather than inferred from other counties' policies.

---

## 4. What this adds to the "production" picture

Three things that weren't visible before this research, each a candidate for its own phase if
NFCAP LMS really is heading toward real use:

1. **An accessibility phase** (WCAG 2.1 AA pass) — likely a compliance requirement, not just good
   practice, because of WIOA Section 188.
2. **A real file-storage decision** for Practical Evidence, now that cost is a known, non-trivial
   factor — not just a "nice to have eventually."
3. **A PII/security hardening phase** before any real trainee data (WIOA or otherwise) touches the
   system — encryption, access control, retention policy, and likely a formal agreement with
   NFCAP's workforce-board partner.

None of these were in `docs/build/BUILD_WORKFLOW.md` or `docs/build/WIOA_BUILD_WORKFLOW.md`
before now. This is the real gap between "prototype plan" and "production plan" the earlier
question surfaced.

---

## Sources

- [Accessible Digital Services for a Modern Workforce System (slide deck)](https://leadcenter.org/wp-content/uploads/2026/06/AccessibleDigitalServicesForAModernWorkforceSystemPresentation.pdf)
- [TCSG — Guidance Regarding Training Site Accessibility](https://www.tcsg.edu/wp-content/uploads/2020/07/Attachment-D-Workforce-Implementation-Guidance-Letter-Guidance-Regarding-Training-Site-Accessibility.pdf)
- [Texas Workforce Commission — TAB 310](https://twc.texas.gov/sites/default/files/wf/policy-letter/ta/tab-310-twc.pdf)
- [Section508.gov — Training](https://www.section508.gov/training/)
- [Supabase Pricing in 2026 — Makerkit](https://makerkit.dev/blog/md/saas/supabase-pricing)
- [Supabase Pricing 2026 Guide — JetAdmin](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
- [Supabase Pricing Explained — SchematicHQ](https://schematichq.com/blog/supabase-pricing)
- [San Luis Obispo County — WIOA PII Policy](https://slocounty.ca.gov/departments/social-services/workforce-development-board/forms-documents/local-policies/09-19-pii-policy)
- [San Francisco OEWD — PII Policy (WDD 23-46)](https://www.sf.gov/file/23-46-personally-identifiable-information-pii)
- [Kentucky WIOA PII Policy (24-002)](https://kwib.ky.gov/WIOA%20Planning%20and%20Policy/WIOA%20Planning%20and%20Policy%20Documents/24-002_WIOA_PII_Policy.pdf)
- [Santa Ana / SAWDB MOU](https://publicdocs.santa-ana.org/WebLink/1/doc/110825/Page17.aspx)
