# Reusable output from the Figma Make export

Source: the design-system-foundation Figma Make run (login + one dashboard
per role). This folder sorts what came out of that export into what to keep,
what to rebuild, and what to treat as reference only. Give this whole folder
to OpenCode alongside AGENTS.md, SCHEMA_AND_ACCESS_MATRIX.md, and
figma_make_prompt.md — not instead of them.

## `keep-as-is/` — copy these straight into the real repo

- **`index.css`** — the full design-token `@theme` block (colors, radii,
  shadows), with the font import fixed to self-hosted `@fontsource-variable`
  packages instead of the Google Fonts CDN the original export used. Run
  `npm install @fontsource-variable/cairo @fontsource-variable/tajawal` and
  add `import "@fontsource-variable/cairo"; import "@fontsource-variable/tajawal";`
  near the top of `main.tsx`.
- **`format.ts`** — the bidi-isolation and Western-numeral formatting helpers
  (currency, dates, scores). This is correct as written and is exactly the
  logic AGENTS.md's Arabic-only rule calls for. Use it everywhere a number or
  date appears inside Arabic text.
- **`brand.tsx`**, **`shell.tsx`**, **`icons.tsx`** — logo/crest components,
  the app bar / bottom nav / admin sidebar chrome, and the icon set. These use
  real semantic `<button>` elements with `aria-label`/`aria-current` already
  — genuinely fine as-is, no rebuild needed.
- **`logo.png`** — the actual school logo asset.

## `rebuild-on-shadcn/` — reference the styling, don't import the file

- **`ui.tsx`** — Button, Card, Input, Badge, Tabs, Avatar, Progress,
  EmptyState, Skeleton. Visually correct (colors, radius, spacing all match
  the tokens above) but hand-rolled rather than built on Radix — the `Tabs`
  component here, for example, has no `role="tablist"`, no `aria-selected`,
  no arrow-key navigation. That's exactly the accessibility work shadcn/ui +
  Radix exists to give us for free per AGENTS.md.
  **What to do:** install the real shadcn/ui components (`npx shadcn add
  button card input label badge tabs avatar progress`), then restyle them to
  match the classes/variants in this file. Same look, real accessibility
  underneath.

## `screens-as-reference/` — structural reference only, do not copy verbatim

- **`Login.tsx`**, **`student-Dashboard.tsx`**, **`teacher-Dashboard.tsx`**,
  **`admin-Dashboard.tsx`** — these import from the old `ui.tsx`, so they
  won't run once that's replaced. Use them to see the intended layout,
  copy (feminine grammar, exact wording), and data shape — then rebuild each
  against real shadcn/ui components and real Supabase queries.
- **`mock.ts`** — shows the shape of the data each screen expects
  (`studentMarks`, `studentFees`, `studentProfile`, etc.). Useful for wiring
  up TanStack Query hooks with the right return shape, but this file itself
  should not ship — replace every import from it with a real Supabase query
  as each screen gets rebuilt.

## What's still missing entirely (not in this export, build fresh)

Marks / Tutorial Papers / Fees / Submit Payment / Payment History screens for
student, Timetable / Salary screens for teacher, and the entire admin portal
beyond the one dashboard screen — build these directly against
`figma_make_prompt.md`'s screen list and the tokens in `index.css`, following
OPENCODE_TASK_LIST.md.
