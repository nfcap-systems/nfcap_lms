# Trade/Apprenticeship & WIOA Platform Landscape — Reference for Planning

Second research pass (first was `docs/research/COMPETITOR_LANDSCAPE.md`, general LMS platforms).
This one covers the two categories that are actually closer to NFCAP LMS: trade/apprenticeship
training tools, and WIOA/workforce case-management systems. Findings are from vendor sites,
public-agency documentation, and review aggregators — not hands-on testing. Verify anything
load-bearing before committing to it.

**Researched:** 2026-10-25

---

## 1. Trade/apprenticeship training & management platforms

| Platform | What it actually is | Relevant takeaway |
| --- | --- | --- |
| **Interplay Learning (SkillMill)** | Skilled-trades training: expert videos + hands-on 3D simulations + knowledge checks, with an "Apprenticeship Services" add-on that handles admin work and can cover Related Technical Instruction (RTI) hour requirements. | This is the closest real competitor in spirit. One concrete gap it exposes: it explicitly tracks **RTI/OJT hours** — something our own `PRODUCT_CONTEXT.md` Section 8 marks "out of scope for the prototype." Worth flagging to NFCAP as a real question, not re-deciding ourselves. |
| **myOneFlow / ApprentiScope / Craft Connect / GoSprout / WorkHands** | A cluster of "apprenticeship management" tools — not training content, but the *paperwork* side: OJT/RTI hour tracking, DOL reporting (RAPIDS/WIPS), multi-employer program administration. | These solve a problem we've explicitly deferred (apprenticeship hour tracking) and one we haven't discussed at all (federal DOL reporting for Registered Apprenticeship Programs). If NFCAP's program is itself DOL-registered (separate from the WIOA funding question), this category may be directly relevant — this needs a question to NFCAP, not an assumption. |
| **NCCER** | Industry-standard trade credentialing body (not NFCAP-specific) with a national credential registry — a credential earned once is portable and verifiable anywhere. | Different model from ours: our certificates currently exist *inside* NFCAP LMS only, not in any outside registry. Worth asking whether NFCAP certifications need to be portable/verifiable the way an NCCER credential is, or whether they're meant to be NFCAP-specific. |

---

## 2. WIOA / workforce case-management systems

| Platform | What it actually is | Relevant takeaway |
| --- | --- | --- |
| **CalJOBS (Geographic Solutions)** | California's *official, legally required* system of record for WIOA Title I case data — this is not a competitor, it's the system our WIOA module sits beside. | **Important finding:** a 2018 state directive required all California WIOA recipients to become direct key-entry users of CalJOBS, specifically because third-party case-management systems were seen as adding cost without replacing the need for CalJOBS. This directly validates a decision already baked into our product (`PRODUCT_CONTEXT.md` Section 16, `WIOA_INTEGRATION_PLAN.md`): **no system-to-system integration with any government system** — the connection to the workforce board stays human (email/phone). We're not competing with CalJOBS or trying to replace it; we're a front-end helper for the *student's* side of a process whose system of record is elsewhere. This is good validation, not a gap. |
| **America's JobLink ServiceLink, Indiana Career Connect** | State-level public case-management systems for WIOA and related programs. | Same category as CalJOBS — official systems of record, not something NFCAP LMS should try to replicate or integrate with directly. |
| **MonsterWorks, Geographic Solutions' WIOA module, myOneFlow** | Commercial case-management software sold *to workforce boards themselves* (not to training providers like NFCAP) — common intake across multiple federal programs, braided-funding tracking, PIRL reporting. | These are built for the **workforce board's** side of the relationship, not the training provider's side. NFCAP LMS's WIOA module is scoped to the training-provider/student side (match → outreach → documents → funding gate) — a genuinely different slice of the problem, not a smaller version of these tools. Good confirmation our scope is coherent, not missing something major. |

---

## 3. What this changes for planning

1. **Validates an existing decision** — "no direct government system integration" lines up with
   how real WIOA recipients actually operate (required to use the state's own system). No action
   needed, just confidence this wasn't a shortcut, it's correct.
2. **Surfaces two real open questions for NFCAP** (not decisions we should make ourselves):
   - Does NFCAP need **RTI/OJT apprenticeship-hour tracking** for DOL reporting, separately from
     the WIOA funding question? (Interplay Learning's apprenticeship services, and the whole
     myOneFlow/ApprentiScope cluster, exist because other programs need exactly this.)
   - Should NFCAP certificates be **portable/externally verifiable** (NCCER-style), or are they
     meant to stay internal to NFCAP LMS only?
3. **No evidence of a direct, like-for-like competitor** — nothing found combines "trade training
   LMS" + "WIOA funding assistance" in one product the way NFCAP LMS does. That's either a real
   gap in the market we're filling, or a sign this combination hasn't been validated elsewhere —
   worth being aware of either way, not something more searching will resolve.

---

## Sources

- [Interplay Learning — SkillMill](https://www.interplaylearning.com/news/all/)
- [Interplay Learning Apprenticeship Services](https://mechanical-hub.com/interplay-learning-apprenticeship-services/)
- [myOneFlow — WIOA Management Software](https://www.myoneflow.com/wioa-management-software?hsLang=en)
- [myOneFlow — Apprenticeship Tracking Solution](https://myoneflow.com/apprenticeship-tracking-solution)
- [ApprentiScope](https://softwarefinder.com/hr/apprentiscope)
- [NCCER Credentials & Certifications](https://www.nccer.org/credentials-certifications/)
- [Geographic Solutions — WIOA](https://www.geographicsolutions.com/WIOA)
- [America's JobLink ServiceLink](https://www.ajla.net/servicelink.html)
- [Indiana WIOA Case Management Policy, 2025](https://www.in.gov/dwd/workonesoutheast/files/WIOA-Case-Management-Policy-Rev-2-2025.pdf)
- [Monster Government Solutions — MonsterWorks Case Management](https://www.monstergovernmentsolutions.com/docs/case-management/monster-works-case-management.pdf)
- [EDD — CalJOBS Modernization Project](https://edd.ca.gov/en/jobs_and_training/Information_Notices/wsin26-01/)
- [CWDB — AB1111 CalJOBS Part 1](https://cwdb.ca.gov/wp-content/uploads/sites/43/2020/04/AB1111-CalJOBS-Part-1-Accessible.pdf)
