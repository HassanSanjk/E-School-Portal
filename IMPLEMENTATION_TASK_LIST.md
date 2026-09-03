# Implementation task list — one task per session

**How to use this:** work through exactly **one unchecked task at a time**,
not a batch. After each task: review the diff, run the app, actually click
through the thing that was built, then check the box and move to the next
one. Don't paste this whole file as one prompt — that's precisely the
"overwhelmed" failure mode this file exists to avoid. A task that fails or
comes back wrong should be fixed or re-prompted before moving on, not left
half-working while you proceed.

Each task assumes everything above it is done and merged.

---

## Stage B — Identity & Trust

- [ ] **B1. Supabase client + providers.** Create the single Supabase client
      instance from env vars, wrap the app in a TanStack Query
      `QueryClientProvider`, and set up the IndexedDB persister so cached
      queries survive a reload with no network.
- [ ] **B2. Auth hook.** A `useAuth()` hook: `login(loginId, pin)` (builds
      `{loginId}@school.internal`, calls Supabase Auth), `logout()`, and a
      `session`/`role`/`profile` value derived from the current session +
      the caller's own `profiles` row.
- [ ] **B3. Protected routing.** A route wrapper that redirects to `/login`
      if unauthenticated, and to the correct role's home if a
      logged-in user hits a route that isn't theirs.
- [ ] **B4. Wire the real Login screen.** Rebuild `Login.tsx` on real
      shadcn/ui components, call `useAuth().login()` on submit, show the
      real error state on failure (not the mocked one).
- [ ] **B5. Splash/loading + Offline screens, wired for real.** Splash shows
      while the initial session check resolves. Offline screen appears when
      `navigator.onLine` is false AND a query has no cached data to fall
      back on — not just whenever the network blips.
- [ ] **B6. Admin PIN-reset flow.** This needs a Supabase Edge Function
      using the `service_role` key — a client can't reset another user's
      password directly. Build: an admin-only screen to search by
      `login_id`, an Edge Function that takes an admin-authenticated request
      and calls the Supabase Admin API to set a new password, wired
      end-to-end.
- [ ] **B7. Manual test pass.** Log in as your bootstrap admin, confirm
      logout works, confirm hitting a random non-admin route as admin still
      works (admin should reach everything), confirm an unauthenticated
      visit redirects to login. **This one's yours to do, not the implementer's.**
- [ ] **B8. Security review pass #1.** Hand SCHEMA_AND_ACCESS_MATRIX.md and
      the actual deployed policies to a Sonnet 5 session (see the effort-level
      note below) for the adversarial table-by-table review. **This is
      Sonnet's task specifically — don't skip it or let whichever session did the implementation "review
      its own work."**

## Stage C — Admin Data Tools

- [ ] **C1. Excel import — parse.** Upload + parse the school's Excel file
      client-side with SheetJS. Just get rows into memory and console-log
      them correctly first — no database writes yet.
- [ ] **C2. Excel import — preview screen.** Show detected new/changed
      records versus what's already in Supabase, before anything commits.
- [ ] **C3. Excel import — commit.** Insert new records, update existing
      ones by matching on `student_number`, without duplicating on a
      re-import.
- [ ] **C4. Fee schedule setup.** Admin screen to create a `fees` row per
      student/academic year/installment.
- [ ] **C5. Fees Due Soon dashboard.** The color-coded, sortable list —
      this is the most important screen in the app, per AGENTS.md. Build it
      carefully: query all fees, derive status client-side (paid/due/overdue)
      using the same logic as `format.ts`'s `deriveFeeStatus`.
- [ ] **C6. "Copy reminder text" button.** Next to an overdue row, pre-fills
      a message template (name, amount, due date) to clipboard — no message
      actually sent by the system.
- [ ] **C7. Payment review queue — list + full-size view.** Pending
      payments, each screenshot viewable full-size.
- [ ] **C8. Payment review queue — approve/reject.** Updates `status`,
      `reconciled_by`, `reconciled_at`.
- [ ] **C9. Student management — list/search.**
- [ ] **C10. Student management — add/edit form**, including
      `guardian_name`/`guardian_phone` as plain fields on the same form.
- [ ] **C11. Teacher management — list/add/edit.**
- [ ] **C12. Marks entry.** Student + subject + academic year + free-text
      assessment label + score/max_score. Pull existing labels for that
      year/subject into a dropdown-with-freeform-option, per the earlier
      note about assessment_label consistency.
- [ ] **C13. Timetable entry.** Teacher + subject + grade/section + day +
      period + room.
- [ ] **C14. Salary entry.** Base amount + deductions per teacher/month.
      Confirm `net_amount` really does compute itself and isn't editable.
- [ ] **C15. Subjects & tutorial papers management.** Subject CRUD, PDF
      upload to Supabase Storage against a subject.

## Stage D — Portals (remaining screens)

- [ ] **D1. Student Dashboard — wire to real data**, replacing every
      `mock.ts` import with a real Supabase query via TanStack Query.
- [ ] **D2. Student Marks screen**, filterable by academic year.
- [ ] **D3. Student Tutorial Papers screen**, PDFs viewable in-browser.
- [ ] **D4. Student Fees screen**, full list with color coding.
- [ ] **D5. Student Submit Payment screen.** Compress the image client-side
      before uploading to Supabase Storage.
- [ ] **D6. Student Payment History screen.**
- [ ] **D7. Teacher Dashboard — wire to real data.**
- [ ] **D8. Teacher Timetable screen.**
- [ ] **D9. Teacher Salary screen.**

## Stage E — Cross-Cutting Quality Passes

- [ ] **E1. Offline read caching**, confirmed on every screen built above —
      not just configured once and assumed to propagate. Actually test with
      the network tab set to offline after each screen has loaded once.
- [ ] **E2. Offline write-queue** for payment upload and admin data entry —
      queue locally on a failed write, retry automatically on reconnect.
- [ ] **E3. PWA manifest + service worker** via `vite-plugin-pwa`. Test
      "add to home screen" actually works on a real Android phone.
- [ ] **E4. Accessibility pass.** WCAG AA contrast check against the real
      purple, a screen-reader pass in Arabic on the core flows, and a real
      low-end-Android-over-throttled-connection test — not just desktop
      responsive mode.
- [ ] **E5. Security review pass #2 (adversarial).** Sonnet's task, not
      the implementer's own — actively try to break access control as each role.
- [ ] **E6. Backup & recovery.** A scheduled GitHub Action hitting Supabase
      on a schedule, and one actual test restore from a backup.

## Stage F — Handover & Launch

- [ ] **F1. Staff documentation** — plain-language, non-technical, covering
      Excel import, payment review, PIN reset, the deadline dashboard, and
      what to do during an outage.
- [ ] **F2. Pilot with real data** — a few staff, guardians, students, one
      real fee cycle, before opening to everyone.
- [ ] **F3. Launch.**
