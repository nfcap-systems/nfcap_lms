# UI references — supplied by the client, 2026-11-27

Reference screenshots supplied by Sadin after the 2026-11-27 client demo, for the DEMO-track
design work (`docs/plans/demo-feedback-2026-11-27.md`). Copied into the repo because the
originals were screenshots in a user's `Pictures` folder and would not survive.

**Four are Salesforce** (a Starter-trial org, so the data is empty — read these for *pattern*,
never for content or density). **`05` is a different product entirely** — a chat/CRM tool, not
Salesforce — which is why this folder isn't named after one vendor.

The client's framing: *"this is from Salesforce that we can copy and reuse so that UI is more
cleaner."* These are pattern references, not a visual identity to adopt — NFCAP's own design
system (`docs/design/NFCAP_DESIGN_SYSTEM.md`) still governs colour, type and spacing.

| File | What it shows | What it is good for |
| --- | --- | --- |
| `ui-patterns/01-lead-record-path.png` | Lead record page: **Path component** (New → Contacted → Nurturing → Unqualified → Converted) with the advance button docked at its end; left column of collapsible field groups with per-field inline edit; record header with object-type label above the name | **DEMO-1 / DEMO-2, the primary reference.** The step path, and the advance control living *on* the path |
| `ui-patterns/02-home-dashboard.png` | Home: list cards ("My Leads", "My Opportunities") each with its own New button; illustrated empty states with one line of guidance; "View Report" + as-of timestamp per card | Coordinator dashboard shape; **empty-state treatment** |
| `ui-patterns/03-contacts-list-view.png` | List view: saved-view picker ("All Contacts ▾"), per-column header dropdowns, a `0 items • Sorted by • Filtered by • Updated` meta line, list-scoped search, bulk actions top-right | `CRD01-CaseList` refinements. Note our data-table pattern is **already locked** to `ADM03-Learners`; take only the view-picker and meta line |
| `ui-patterns/04-new-contact-modal.png` | Create form in a modal: grouped sections, `* = Required Information` legend, **inline validation** (red border + icon + "Complete this field."), structured address with Country/State as selects and a separate Zip, Cancel / Save & New / Save | **DEMO-5 and DEMO-6**, not DEMO-1/2 — this is the signup-form reference, and the closest thing we have to an answer for "dropdowns where the answer is from a known set" |
| `ui-patterns/05-crisp-contact-record.png` | Contact record in a non-Salesforce tool: panels with a count badge in the header (`Conversations [0]`), icon + label + inline-editable value rows with "Enter Phone…" placeholders, everything collapsible, right rail of small panels | The **attribute-row** pattern for presenting the 12 ETPL/authorization fields under their step (plan §A4) — lighter than Salesforce's pencil-per-field |

## What these references do *not* answer

**None of them shows a parent record whose child records each carry their own status path.** That
is the actual hard problem of Ticket B (`DEMO-2`): one master WIOA case with N course-funding
cases, each independently advanceable. Salesforce's own answer would be an Opportunity or Account
page with related lists — not among what was supplied. The design for that part is proposed in
`docs/plans/demo-1-2-3-coordinator-wioa-plan.md` §4 and is **not** copied from a reference.

## One pattern to deliberately *not* copy

`01` places `Unqualified` — a failure outcome — inline in the path, between `Nurturing` and
`Converted`, as though it were a positional step toward success. That is the same defect QC found
in our own build on 2026-11-27, where `FUNDING_DECLINED` renders as "Step 5 of 5", further along
than completion (finding Q-2 in the plan's §7). Take the path; treat a terminal failure as a state
that **replaces** the path, not a step within it.
