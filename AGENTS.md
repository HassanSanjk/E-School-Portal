# AGENTS.md — School Management System

This file is the shared source of truth for any AI tool working on this codebase
(Claude Sonnet 5, Claude Code, or anyone else). If something here conflicts with
an instruction given in a chat session, this file wins unless a human explicitly
overrides it in writing, in which case update this file too.

## Project summary

A cloud-only Progressive Web App for a 45-student Sudanese high school. No native
apps, no custom backend server, no automated outbound messaging, and no separate
guardian account — a family uses the student's own login. Three roles: student,
teacher, admin. Core value: works reliably on cheap Android phones over bad
connections, degrades gracefully (read-only from cache) during Sudan's periodic
national internet blackouts, and costs $0–$15/year to run.

## Non-negotiables (do not deviate without asking a human)

1. **No automated outbound messaging of any kind.** No WhatsApp API, no SMS, no
   email sending to students/teachers. The "Fees Due Soon" dashboard is
   the entire notification system. If you find yourself about to add a `sendEmail`
   or `sendWhatsApp` call, stop and ask.
2. **No custom backend service.** All data access goes through Supabase directly
   from the frontend (Postgres + Auth + Storage + Row-Level Security). Do not
   introduce Express/Fastify/a serverless API layer "just for this one endpoint."
   If logic truly can't live in RLS or the client, use a Supabase Edge Function,
   and flag it — these should be rare.
3. **Row-Level Security is the access control system, not a backup to
   client-side checks.** Every table must have RLS enabled with explicit
   policies. Never mark a table as publicly readable/writable "temporarily" —
   that temporary state is how salary data leaks.
4. **Salary/deduction data gets the strictest policies in the schema.** Only the
   owning teacher and admin roles may read it. No exceptions, no debugging
   shortcuts that widen access "just to test."
5. **Everything must degrade to offline-read gracefully.** Any new page/query
   should go through TanStack Query with IndexedDB persistence, so a
   previously-loaded page keeps working with no network.
6. **Free tier only, unless a human explicitly approves a paid service.**
7. **Arabic-only, RTL. No language toggle, no i18n library, no English UI
   copy anywhere.** Set `dir="rtl"` once, globally, on the HTML root — not
   per-component. Write UI text directly in Arabic during development, not as
   English placeholders "to translate later." If you find yourself reaching
   for `react-i18next` or a locale-switcher, stop — it's explicitly not needed
   and adds complexity this project doesn't want.
8. **There is no guardian role or guardian account.** A family accesses
   marks, tutorial papers, fees, and payment submission entirely through the
   student's own login. Do not build a second account type, a "family
   member" concept, or a way to link multiple logins to one student — that
   was explicitly removed by stakeholder decision. Guardian contact info
   (name, phone) is just two plain fields on the `students` table, not a
   separate identity.

## Tech stack (do not substitute without asking)

- Frontend: React + TypeScript + Vite (SPA, no SSR)
- Styling: **Tailwind CSS v4**, CSS-first config via `@theme` in `src/index.css`
  — no `tailwind.config.ts`, no PostCSS config file needed. See the design
  tokens block below for the exact values to use; do not invent new ones.
- UI components: **real shadcn/ui (Radix primitives)**, not a hand-rolled
  clone. If a component set already exists in the repo that merely *looks*
  like shadcn/ui but isn't built on `@radix-ui/*` packages, replace it — this
  matters specifically because Radix gives correct ARIA roles and keyboard
  navigation (tabs, dialogs, menus) for free, which a visual clone won't have
  even if the styling matches exactly. Restyle real shadcn/ui components with
  the CSS tokens below rather than keeping a custom component library that
  merely resembles them.
- Data fetching/cache: TanStack Query, persisted to IndexedDB
- PWA: vite-plugin-pwa
- Backend: Supabase (Postgres, Auth, Storage, RLS, optional Edge Functions)
- Auth: Supabase Auth via synthetic email pattern — `{id}@school.internal` +
  PIN as password. Users only ever see "ID + PIN" in the UI, never an email
  field.
- Excel import: SheetJS, client-side only, in the admin's browser
- File storage: Supabase Storage (tutorial PDFs, payment screenshots) —
  compress images client-side before upload
- Hosting: Cloudflare Pages (frontend, git-based auto-deploy), Supabase free
  tier (everything else)
- Testing: Vitest — scoped specifically to fee-balance calculations and
  role-based access scenarios, not full coverage everywhere
- Language & direction: Arabic-only, RTL (`dir="rtl"` set globally, no
  language toggle). No i18n library — UI copy is written directly in Arabic.
  Fonts: **Cairo** (display/headings) + **Tajawal** (body) — install via
  `@fontsource-variable/cairo` and `@fontsource-variable/tajawal` (npm
  packages that ship the actual font files into the build) and import them in
  `src/index.css`. **Do not load fonts from `fonts.googleapis.com` or any
  external CDN at runtime** — an early Figma Make export did this and it
  breaks offline-first: a phone opening the app during a connectivity gap
  before the font is cached could fail to render Arabic text correctly.

## Design tokens (confirmed — extracted from the school's actual logo/poster
via Figma Make, verified against the real hex/font values in the export)

These are final, not placeholders. Put them in `src/index.css` under
`@theme` exactly as below (adjust only the font `@import`/`@font-face`
mechanism per the self-hosting note above):

```css
--font-sans: 'Tajawal', system-ui, sans-serif;
--font-display: 'Cairo', system-ui, sans-serif;

--color-background: #f8f4fc;
--color-foreground: #1c1030;
--color-card: #ffffff;
--color-card-foreground: #1c1030;

--color-primary: #441967;
--color-primary-foreground: #ffffff;
--color-primary-deep: #2b0a46;
--color-primary-soft: #7a3fae;

--color-secondary: #ece0f6;
--color-secondary-foreground: #38155e;
--color-muted: #f1e8f9;
--color-muted-foreground: #695a7c;

--color-accent: #c79a2e;
--color-accent-foreground: #2a2005;
--color-accent-soft: #f6edd4;

--color-border: #e6dcf1;
--color-ring: #441967;

--color-paid: #167045;
--color-paid-bg: #e6f4ec;
--color-due: #8a5606;
--color-due-bg: #fbf0d9;
--color-overdue: #b5342a;
--color-overdue-bg: #fbe7e4;

--radius-sm: 0.625rem;
--radius-md: 0.875rem;
--radius-lg: 1.25rem;
--radius-xl: 1.75rem;
```

Also carry over from the export as-is, since both are correct and
well-built: `src/lib/format.ts` (the bidi-isolation + Western-numeral
formatting helpers — this is the exact logic AGENTS.md's Arabic-only
non-negotiable calls for, already done right) and the general layout
patterns from the Login/Dashboard screens (branded gradient header, card-based
mobile lists, status pills pairing an icon with color, not color alone).

## Roles and what each may do (summary — full detail lives in
SCHEMA_AND_ACCESS_MATRIX.md, which is authoritative)

- **student**: read own marks, own tutorial papers, own timetable, own fee
  status. Write: submit a payment screenshot against their own fee. This
  account is shared with the student's family — a parent may be the one
  actually logging in, and the system has no way to distinguish that. No
  other write access, and no editing/withdrawing a payment once submitted.
- **teacher**: read own timetable, own salary/deduction record. Write: nothing
  to their own salary data (admin-only write). May have write access to marks
  for their assigned subjects if/when that feature is scoped — not yet approved,
  confirm before building.
- **admin**: full read/write across all tables. This is the only role that may
  reach every table.

## Build order

Follow Section 8 of the feasibility study, in this order. Do not start a later
stage's UI work before the stage before it is actually done and reviewed —
especially do not build portal screens (Stage D) before the schema and RLS
(Stage A/B) are reviewed and confirmed.

A. Foundation: design system → scaffolding/deploy → schema & access matrix
B. Identity & trust: auth → security review pass #1
C. Admin data tools: Excel import → fee/payment management → teacher/timetable entry
D. Portals: student (now includes fees & payment submission) → teacher
E. Cross-cutting: offline behavior → accessibility/low-end device pass →
   security review pass #2 (adversarial) → backup & recovery
F. Handover: staff docs → pilot → launch

## Division of labor

**OpenCode + Big Pickle are no longer part of this project's implementation.**
Claude (Sonnet 5, via Claude Code or an equivalent session) handles both
architecture decisions and direct implementation now. Apply the same rigor to
both: treat schema/RLS work and both security review passes as mandatory
gates regardless of who or what is writing the code, since that's where this
project's real bugs got caught historically (a guardian profile-access gap, a
payments table that didn't check the fee actually belonged to the submitting
account, among others) — moving implementation in-house doesn't relax that,
if anything it removes the excuse of "the other tool wrote it."

## Conventions

- Commit small, working increments. Every push to `main` auto-deploys to
  Cloudflare Pages — do not push broken builds.
- No hardcoded credentials anywhere in the repo. Supabase URL/anon key go in
  environment variables, documented in `.env.example`, never in `.env` itself.
- Every new table added to the schema must come with its RLS policies in the
  same change — a table without RLS is a bug, not a TODO.
- When in doubt about scope (a feature not explicitly in Section 4 of the
  feasibility study or in this file), ask a human before building it. This
  project has a deliberately small, fixed feature set — resist scope creep.

## What is explicitly out of scope (do not build unless a human asks)

- Native mobile apps
- Any form of automated messaging (WhatsApp, SMS, email, push notifications)
- Automated payment verification / bank API integration
- Multi-school / multi-tenant support
- A custom backend server separate from Supabase
- A language toggle, a second language, or any i18n infrastructure — this is
  an Arabic-only, RTL system by design, not a translatable one
- A separate guardian/parent account, login, or any multi-user-per-student
  linking mechanism — families share the student's own login
