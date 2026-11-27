# Executor brief — `NOTIF-0`, `NOTIF-1`

Written 2026-11-27 by the lead session. Plan context:
`docs/plans/notifications-and-upload-cap-kickoff.md` (the local source of truth while Plane is
disconnected). Read its three closed decisions before starting; they are not reopenable.

One branch, two commits, one PR — per the 2026-11-22 decision to bundle into fewer, larger PRs.

```
Branch: feature/notifications-foundation   (off origin/stage)
PR:     one, to stage
```

**No schema change in either ticket.** `NotificationType` already has the values these need, so
none of `CLAUDE.local.md` #8's unapplied-migration risk applies. (`NOTIF-3` *does* need a
migration — not this PR.)

## What already exists — read this before writing anything

The previous belief was "schema and CRUD exist, nothing calls them, no UI." That is **not quite
right**, and the difference changes `NOTIF-1`'s shape:

| Piece | File | State |
| --- | --- | --- |
| `Notification` model | `prisma/schema.prisma:980` | Complete, indexed on `[userId, createdAt]` and `[userId, readAt]` |
| `createNotification` | `src/lib/actions/notifications.ts:19` | Exists, role-gated — the problem `NOTIF-0` fixes |
| `markNotificationRead` / `markAllNotificationsRead` | same file, :44 / :56 | Complete and correctly scoped to the caller |
| `getNotificationsForUser` / `getUnreadNotificationCount` | `src/lib/data/notifications.ts` | Complete. **Zero callers.** |
| A notifications panel | `src/components/layout/NotificationsMenu.tsx` | **Already exists** — and is one shared component |

`NotificationsMenu` is a `'use client'` dropdown that opens and renders a hardcoded
`You're all caught up — nothing new yet.` It fetches nothing. It is consumed by **three** headers
through a `variant` prop:

- `src/components/layout/LearnerHeader.tsx:201` and `:268` — `variant="plain"`, **two call sites**
  (desktop and mobile; do not fix one and miss the other)
- `src/components/admin-shell/AdminHeader.tsx:36` — `variant="ghost"`
- `src/components/layout/Header.tsx:54` — `variant="icon"`

There is no unread badge anywhere — `getUnreadNotificationCount` has no callers, so the
bell-with-red-dot the boards show does not exist yet.

**This is the `CLAUDE.local.md` #1 shape, exactly.** A single component shared across learner and
staff that renders fine for both and is still wrong for one of them. Decision 1 in the kickoff file
settles it: **two panels, not one.** So `NOTIF-1` is a *split*, not a greenfield build, and
`NotificationsMenu` should not survive as a shared component afterwards.

## `NOTIF-0` — split the emit path

**Problem.** `createNotification` is gated to `ADMIN`/`WIOA_COORDINATOR`. That gate is correct and
must stay: it is a `'use server'` export, so it is directly callable by any signed-in user via a
`next-action` POST regardless of what the UI wires up, and without the gate anyone could write
arbitrary content into anyone else's feed. But it makes the function **unusable for
system-generated notifications**, because the acting user is frequently a learner — when a learner
hits the upload cap, `requireUser()` + the role check throws and the coordinator is never told.
Every other notification ticket is blocked on this.

**Build.** An internal `emitNotification` with the same parameters and no caller-role check, for
server-side callers only. `createNotification` keeps its gate and delegates to it, so there is one
write path, not two.

**The trap that matters here:** `src/lib/actions/notifications.ts` begins with `'use server'`, and
in a `'use server'` file **every export becomes a publicly callable server action**. Adding
`emitNotification` to that file would create exactly the un-gated, directly-reachable door the
role check exists to prevent — the opposite of the intent. Put it in a plain module with no
`'use server'` directive, e.g. `src/lib/notifications/emit.ts`, and import it from actions that
need it.

**Acceptance:** a learner-initiated server action can cause a notification row to be written for a
coordinator; `createNotification` still throws for a learner calling it directly; one write path.

## `NOTIF-1` — two notification panels

**Boards:** `ADM18-NotificationsPanel` (staff) and `LRN18-NotificationsPanel` (learner), both drawn
and approved 2026-11-27, both with rows in `docs/MOCKUP-INDEX.md`. Each board carries **list,
empty, read/unread and phone** states — build all four, and check the real route against its own
board rather than against the other role's panel.

**Build.** Replace the shared `NotificationsMenu` with two components:

- a learner panel for `LearnerHeader` (both call sites)
- a staff panel for `AdminHeader` and `Header`

They differ by design, per Decision 1 — the learner reads a few items a week; staff may triage
dozens a day and need to filter, jump to the case, and clear the queue. Match each to its own
board. The `variant` prop exists only because one component served three shells; once split, keep
whatever styling hooks each shell genuinely needs and drop the rest rather than carrying a
three-way switch into both new components.

**Wire the data that already exists** — `getNotificationsForUser`, `getUnreadNotificationCount`,
`markNotificationRead`, `markAllNotificationsRead`. No new data-layer or action code should be
needed; if you find yourself writing some, say why in the handoff.

**Unread badge.** Add it. This is `getUnreadNotificationCount`'s first caller.

**Performance conventions that bite here** (`CLAUDE.md` §Performance conventions):

- The unread count is per-user, so it must be a **dynamic hole under `Suspense`**, not something
  that forces the whole shell dynamic. `cacheComponents` is on. **Do not** add
  `export const dynamic = 'force-dynamic'` — convention #1, and all 15 prior instances were
  removed deliberately.
- Keep `'use client'` at the leaves (#5). The panel needs interactivity; the shell around it
  should not become a client component to accommodate it.
- No new route segment is involved, so no new `loading.tsx` — unless you add one, in which case
  it needs one (#2).

**Seeing real rows while developing.** `NOTIF-2` (the first real emitter) is a *separate* ticket —
do not build it here. Seed notification rows instead so the list, read/unread and empty states can
all be exercised. Do not ship a seed-only code path in the component.

## Out of scope — do not build these here

`NOTIF-2` (the `EVIDENCE_REVIEWED` emitter), `NOTIF-3` (WIOA triggers, needs a migration),
`CAP-3`/`CAP-4`/`CAP-6` (blocked on board amendments that are not drawn), and **email of any
kind** — Decision 2 is in-app only until a verified sending domain exists.

## Verification expected in the handoff

Per `CLAUDE.local.md` #9 and #10, a component that renders is not evidence the thing works:

- Click through with `agent-browser` as **both** a learner and a staff user against `npm run dev`,
  driving the real bell button rather than opening a URL directly.
- Exercise all four board states per panel, including phone width.
- Check **both** `LearnerHeader` call sites (desktop and mobile), not just the one you edited first.
- Confirm marking read updates the badge, and that a notification id belonging to another user
  changes nothing (`markNotificationRead` uses `updateMany` by design, so it should silently match
  zero rows rather than throw).

End the handoff with an explicit **"Not verified"** list. You do not QC your own work — but note
that for `NOTIF-1` you drew the boards you are being checked against, so that list carries more
weight than usual (see the recorded deviation in the kickoff file).

## Before opening the PR

- `gh auth status` — it must be `manjila-tech`. It drifts to `anishb-nepa` on its own, and that
  account has no merge permission here. `gh auth switch --user manjila-tech` if needed.
- Pass `--base stage` and `--head` explicitly to `gh pr create`; a bare invocation infers the head
  from whatever is checked out, and this working tree is shared with other sessions.
- Never `git checkout` or `git stash` in the shared checkout — see `CLAUDE.md`'s
  "Known environment issues". Read other branches with `git show <ref>:<path>`.
- CI green is not merge approval; the lead does a UI check, and Anish approves. Do not merge your
  own PR.
