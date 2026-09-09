# NFCAP LMS

A prototype learning management system for NFCAP's flooring apprenticeship program. See
`docs/product/PRODUCT_CONTEXT.md` for full product context — it's the source of truth for scope and
decisions.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Prisma](https://www.prisma.io) ORM against a [Supabase](https://supabase.com)-hosted
  PostgreSQL database
- [Supabase Auth](https://supabase.com/auth) (`@supabase/ssr` + `@supabase/supabase-js`) — email/
  password, two roles (`LEARNER` self-signup, `ADMIN` promoted manually)
- [Zod](https://zod.dev) for schema validation
- Tailwind CSS
- ESLint + Prettier

## Getting started

Install dependencies:

```bash
npm install
```

Copy the environment variable template and fill in your own Supabase project's values (see
"Database & Auth setup" below for where to find each one):

```bash
cp .env.example .env
```

Generate the Prisma client and run migrations against your database:

```bash
npm run prisma:generate
npx prisma migrate dev
```

Seed the course catalog:

```bash
npm run prisma:seed
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on `/login`. Sign up a learner
account at `/signup`, or use one of the demo accounts below.

## Scripts

| Command                            | Description                                                          |
| ---------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                      | Start the Next.js development server                                 |
| `npm run build`                    | Create a production build                                            |
| `npm run start`                    | Run the production build                                             |
| `npm run lint`                     | Lint the codebase with ESLint                                        |
| `npm run format`                   | Format the codebase with Prettier                                    |
| `npm run format:check`             | Check formatting without writing changes                             |
| `npm run prisma:generate`          | Generate the Prisma client from `prisma/schema.prisma`               |
| `npm run prisma:seed`              | Seed the 4-course apprenticeship pathway (`prisma/seed.ts`)          |
| `npm run promote-role -- <email> <role>` | Flip a signed-up account to ADMIN/PARTNER_STAFF/WIOA_COORDINATOR |
| `npm run seed-demo-learners`       | Seed 5 demo learner accounts at different journey stages (see below) |

## Database & Auth setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Click **Connect** on the project dashboard (or Project Settings → Database) and copy:
   - **Transaction pooler** connection string → `DATABASE_URL`
   - **Session pooler** connection string → `DIRECT_URL` (used for both Prisma migrations and the
     runtime client — see `src/lib/prisma.ts`; a true Direct connection requires IPv6, which most
     networks don't have, so the session pooler is the safer default)
3. Go to Project Settings → API and copy the **Project URL**, **anon public** key, and
   **service_role** key into `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY`.
4. In Authentication → Sign In / Providers → Email, turn **off** "Confirm email" — this prototype
   doesn't have transactional email configured, and Supabase's default sender has a very low rate
   limit.
5. Run `npx prisma migrate dev` to create the tables, then `npm run prisma:seed` for the course
   catalog.
6. Sign up your own account at `/signup`, then run `npm run promote-role -- your@email.com ADMIN`
   to make it an Admin.

### Demo learner accounts

`npm run seed-demo-learners` creates 5 fixed demo accounts reproducing different points in the
apprenticeship journey, so Admin's dashboard/roster have realistic content beyond your own test
account:

| Email                           | Journey stage                                        |
| ------------------------------- | ---------------------------------------------------- |
| `priya.shah@demo.nfcap.test`    | Fully certified — verified evidence on all 4 courses |
| `casey.nguyen@demo.nfcap.test`  | Evidence submitted, awaiting Admin review            |
| `diego.alvarez@demo.nfcap.test` | Evidence rejected, needs resubmission                |
| `marcus.webb@demo.nfcap.test`   | Just enrolled, one lesson in                         |

Password for all demo accounts: `Demo1234!`. These are prototype/local-dev credentials only — do
not reuse this pattern anywhere real users could reach.

## Project structure

```
src/
  app/                     Next.js App Router routes (learner/*, admin/*, login, signup)
  components/              UI components (ui/, layout/, learner/, admin/)
  lib/
    data/                  Server-only read queries (Prisma) — courses, progress, credentials, learners
    actions/               Server Actions (mutations) — courses, curriculum, progress, auth
    supabase/              Supabase client helpers (browser, server, middleware, admin/service-role)
    prisma.ts              App-wide Prisma client (pg pool + adapter)
    types.ts               Shared Course/Section/Lesson/Assessment types
  proxy.ts                 Route protection (Next.js 16's renamed middleware.ts)
  generated/               Generated Prisma client (git-ignored)
prisma/
  schema.prisma            Prisma schema (Course/Section/Lesson/Assessment/QuizQuestion,
                            Enrollment/CompletedLesson/QuizAttempt/EvidenceSubmission/Certificate)
  seed.ts                  Seeds the 4-course apprenticeship pathway
scripts/
  promote-role.ts          One-time script to promote a signed-up account to a given role
  seed-demo-learners.ts    Seeds the 5 demo learner accounts described above
docs/
  PRODUCT_CONTEXT.md        Source of truth for product scope and decisions
.env.example                Template for required environment variables
```
