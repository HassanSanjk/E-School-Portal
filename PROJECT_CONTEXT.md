# Project Context Handoff — [PASTE THIS ENTIRE FILE INTO THE NEW CHAT]

## What this project is

A cloud-only Progressive Web App for **مدرسة إبن الجراح الثانوية الخاصة بنات**
(a girls' secondary school in Sudan, ~45 students). Arabic-only, RTL. Free-tier
hosting only. Built by a remote developer with no one on-site to run hardware,
against a background of Sudan's periodic national internet blackouts — the
system degrades to cached-read-only during those, it doesn't try to prevent
them.

**Three roles, not four:** student, teacher, admin. There is **no separate
guardian account** — a family uses the student's own login (ID + PIN) to view
marks, tutorial papers, fees, and to submit payment screenshots. This was a
deliberate stakeholder decision partway through the project — if you see any
reference to a "guardian" role, table, or account anywhere, it's stale.

## Canonical documents — attach all of these to this new chat

These are the actual source of truth. Nothing in this handoff summary
overrides them — if this summary and one of these files ever disagree, the
file wins:

1. **`AGENTS.md`** — non-negotiables, tech stack, confirmed design tokens
   (exact hex colors, fonts, radius/shadow scale), and role permissions
   summary. Read this first.
2. **`SCHEMA_AND_ACCESS_MATRIX.md`** — the database schema and access-control
   matrix, with reasoning for every non-obvious decision (annual fees not
   per-term, flexible assessment labels, language-neutral day-of-week storage,
   the guardian-removal migration path).
3. **`schema_and_rls.sql`** — the actual SQL, matching the matrix exactly.
4. **`figma_make_prompt.md`** — the full screen-by-screen design brief (23
   screens across 3 roles + shared).
5. **`IMPLEMENTATION_TASK_LIST.md`** — the atomized, one-task-at-a-time build plan
   for Stage B onward. **Work through this one checkbox at a time, not in
   batches** — that granularity exists specifically to avoid an agent getting
   overwhelmed or producing a half-working sprawl across many files at once.
6. **`reusable_design_export.zip`** — real, usable code extracted from a
   partial Figma Make export: correct RTL/bidi-number formatting helpers,
   logo/nav/icon components (keep as-is), and screens/hand-rolled UI
   components to use as structural reference only (see the zip's own
   `README_FIRST.md` for exactly what to copy versus rebuild).

## ⚠️ First thing to verify before building anything

The schema went through a real architectural change mid-project: guardian
accounts were removed after some SQL had already been run live in Supabase.
**Confirm which state the actual Supabase project is in before Stage B work
starts:**

- If `guardians` / `guardian_student_links` tables still exist, or
  `payments` still has a `guardian_id` column → the migration in
  `SCHEMA_AND_ACCESS_MATRIX.md` Section 6 has **not** been run yet.
- If no real student/fee/payment data has been entered yet (likely, this
  early), the simplest fix is not the piecemeal migration — just drop
  everything and re-run `schema_and_rls.sql` fresh. Only use the Section 6
  migration path if real data already exists that can't be lost.
- Either way, don't proceed to Stage B assuming the schema is in the new
  shape — check first.

## Current status (as of this handoff)

**Done:**
- GitHub repo, Supabase project (Frankfurt region, free tier), Cloudflare
  Pages all created and connected; a scaffolded Vite+React+TS app auto-deploys
  on every push and is live at a real `.pages.dev` URL.
- Database schema and RLS policies fully designed (see above) — **but see the
  verification note above before trusting what's actually live.**
- A bootstrap admin account was created manually via the SQL editor (the
  documented workaround for RLS's chicken-and-egg problem on the very first
  admin row).
- Design tokens are confirmed and locked into `AGENTS.md` — real hex colors
  and font choices extracted from the school's actual logo/poster via a
  partial Figma Make run (login screen + one dashboard per role generated;
  the rest of the 23-screen brief was never generated in Figma and should be
  built directly in code against the brief + tokens, not sent back to Figma).

**Not started:** everything from Stage B (`IMPLEMENTATION_TASK_LIST.md`) onward —
authentication, all admin tools, all remaining portal screens, offline
behavior, accessibility pass, both security review passes, backup/recovery,
staff docs, pilot, launch.

## Division of labor (carry this forward)

The project was originally planned with OpenCode + Big Pickle doing bulk
implementation and Sonnet 5 handling architecture, anything security-sensitive
(RLS logic, the PIN-reset Edge Function, which needs the `service_role` key),
and both security review passes. **That's changed — OpenCode is no longer
part of this project.** Claude (this session, likely via Claude Code) now
handles implementation directly, in addition to architecture and review.

This doesn't relax the rigor that division of labor was protecting —
`IMPLEMENTATION_TASK_LIST.md`'s "one task at a time, test before moving on"
discipline and the two mandatory security review passes still apply exactly
as before. Use the highest available thinking/effort setting for anything
touching the schema, RLS, or the security review passes specifically —
that's where the real bugs in this project got caught so far (a guardian
profile-access gap, a payments table that didn't check the fee actually
belonged to the submitting account, and others), and skipping that rigor
doesn't get safer just because the same tool is now doing both the writing
and the reviewing — if anything, say so explicitly and treat the review step
as a distinct pass, not something folded silently into writing the code.

## Non-negotiables (full list is in AGENTS.md — highlights below)

- No automated outbound messaging of any kind — the Fees Due Soon dashboard
  is the entire notification system.
- No custom backend service — Supabase directly, RLS is the access control.
- Arabic-only, RTL, no i18n library, no English UI text, feminine grammar
  throughout (طالبة / الطالبات) since this is a girls' school.
- Free tier only unless explicitly approved otherwise.
- No guardian account — see above.
- Teacher access to `marks` is **still an open, unresolved question** —
  don't build it either way without asking first.
