# UI Design Brief — مدرسة إبن الجراح الثانوية الخاصة بنات — Management Portal

## Context

This is a UI design system for a school management web app (a Progressive
Web App, used primarily on phones) serving a Sudanese high school with
roughly 45 students. Three user roles use it: **student**, **teacher**,
**admin**. There is no separate guardian/parent account — a family accesses
marks, tutorial papers, fees, and payment submission through the student's
own login. I've attached two reference images:

1. **The school's logo** — use this as the source of truth for brand color,
   not a generic "purple." Extract the actual purple(s) used in the logo
   (there may be more than one shade) and build the palette from that,
   rather than picking an unrelated purple that merely looks similar. **This
   is a hard requirement, not a suggestion.** If the attached logo image
   isn't visible, readable, or processable for any reason, stop and say so
   explicitly rather than substituting an approximate purple — do not
   silently fall back to a generic palette.
2. **A poster from the school** — use this to sanity-check the palette and
   pick up on any secondary colors, textures, or typographic personality the
   school already uses in its own materials, so the app doesn't feel like a
   generic template dropped on top of their identity.

## Language & direction (non-negotiable)

- **Arabic-only. No English UI text anywhere**, and no language toggle —
  this is not a bilingual product.
- **Full RTL layout** — not just RTL text with LTR layout bolted on. Navigation,
  icons that imply direction (back/forward arrows, chevrons), and reading
  order all mirror correctly.
- Use an Arabic-first web font (Cairo, Tajawal, or Noto Sans Arabic — pick
  whichever reads best against the extracted logo palette) rather than a
  Latin font with Arabic as an afterthought.
- **Numbers**: use Western numerals (0–9), not Eastern Arabic-Indic
  numerals (٠١٢٣...) — this is the more common convention in Sudan. Numbers
  embedded inside Arabic sentences (fee amounts, dates, ID numbers, phone
  numbers) must render left-to-right within the right-to-left sentence, the
  way they actually do in real Arabic text — check this specifically in any
  mockup showing a sentence with a number in it, since it's an easy thing to
  get subtly wrong.
- **This is a girls' school** (بنات). Arabic marks grammatical gender on
  nouns, adjectives, and verbs, so all copy referring to a student should
  consistently use the feminine form (طالبة singular / الطالبات plural), not
  the generic masculine default (طالب / الطلاب). Apply this everywhere a
  student is referenced — page titles, empty states, form labels, button
  text — including admin screens that talk about students. Teacher wording
  can stay gender-neutral where the person's gender isn't established.

## Device & accessibility constraints

- **Mobile-first** for the student and teacher roles — design at a
  baseline phone viewport (~360×800, common low-end Android size), not
  desktop-first with mobile as an afterthought.
- **Admin is the exception**: admin does data-heavy work (reviewing payment
  screenshots, running Excel imports, entering timetables/salaries) that's
  genuinely easier on a larger screen. Design admin screens at **both** a
  mobile width and a wider desktop/tablet width — admin still needs a phone
  fallback, but shouldn't be forced into it.
- **WCAG AA contrast**, checked against the actual extracted purple, not
  assumed — a saturated purple can fail contrast requirements for text more
  easily than it looks like it should.
- **44px+ tap targets** throughout — this app will be used on cheap phones by
  people with a wide range of smartphone comfort, including some accessing
  it for the first time.
- Every screen listed below needs **three states**: normal (populated with
  realistic sample data), **empty** (e.g. a student with no marks entered
  yet, or no tutorial papers uploaded for her subjects yet), and **loading**.

## Visual style guidance

- Clean, modern, componentized — cards, clear section headers, generous
  whitespace. This will be implemented in code using shadcn/ui (Radix-based
  components) and Tailwind, so a design language that translates naturally
  into simple rectangular cards, clear buttons, and standard form inputs will
  hand off more smoothly than anything highly custom or illustrative.
- **Status color-coding is functional, not decorative**, and needs to work
  independently of the purple brand palette: fee status uses green (paid),
  amber (due soon), red (overdue) — pick shades of each that read clearly
  against the purple UI and still pass contrast requirements next to it.
- Avoid dense data-table-only screens on mobile widths — prefer card-based
  lists that stack cleanly on a narrow screen, reserving true tables for the
  admin desktop views where there's room.

---

## Screens to design, by role

### Shared (all roles pass through these)
1. **Login** — ID + PIN fields only (no email field, no "forgot password"
   link — PIN resets are admin-assisted, not self-service). Include an error
   state for wrong credentials.
2. **Loading/splash** — shown briefly on app open.
3. **Offline/no-connection state** — shown when a page has no cached data and
   the network is unreachable. This should read as calm and expected, not
   like a crash — connectivity gaps are a normal, anticipated condition here,
   not an error state to alarm the user with.

### Student portal
This account is shared with the student's family — a parent may be the one
actually using it. Design it as one portal, not two separate experiences.
4. **Dashboard** — at-a-glance summary: recent marks, current fee status,
   quick links to tutorial papers.
5. **Marks** — scores by subject, filterable by academic year, showing each
   assessment (the number of assessments per year varies — 2 or 3 — so the
   layout shouldn't assume a fixed count like "midterm/final").
6. **Tutorial papers** — list of subjects, each expanding to available PDFs,
   viewable in-browser.
7. **Fees** — fee status, due dates, color-coded, plus a "Fees Due Soon"
   indicator consistent with the admin dashboard's version. If a family has
   more than one daughter enrolled, each daughter has her own separate
   login — there is no combined multi-child view or child-switcher.
8. **Submit payment** — upload a screenshot against a specific fee/
   installment, with a confirmation state after submitting.
9. **Payment history** — past submissions and their status (pending /
   confirmed / rejected) — viewable but not editable or withdrawable once
   sent.

### Teacher portal
10. **Dashboard** — quick view of today's timetable and salary status.
11. **Timetable** — own weekly schedule, day and period based (do not include
    a marks-entry screen here — teacher access to marks is still an open
    decision and not yet approved for this build).
12. **Salary & deductions** — own monthly breakdown, base amount, deductions,
    net amount, read-only.

### Admin portal (mobile + desktop widths)
13. **Dashboard** — overview cards: fees due soon count, pending payment
    reviews count, quick links.
14. **Excel import** — upload, preview detected changes before committing,
    confirm.
15. **Fees Due Soon** — the color-coded, sortable list of every student by
    proximity to their due date. This is the core replacement for automated
    reminders, so it should be the most scannable screen in the whole admin
    portal, not a buried tab.
16. **Payment review queue** — list of submitted screenshots awaiting
    reconciliation, each viewable full-size, with approve/reject actions.
17. **Student management** — list/search, add/edit a student record,
    including her guardian's name and phone number as plain fields on the
    same record (there's no separate guardian entity to manage).
18. **Teacher management** — list/add/edit teacher records.
19. **Marks entry** — enter/edit a student's score for a subject and
    assessment (admin enters marks in this build, not teachers).
20. **Timetable entry** — assign a teacher, subject, day, period, and room
    per class.
21. **Salary entry** — enter a teacher's base amount and deductions per month
    (net amount calculates automatically, not typed in).
22. **Subjects & tutorial papers** — manage the subject list and upload PDFs
    against a subject.
23. **PIN reset** — admin-side flow to reset any user's login PIN.

---

## Explicitly out of scope — do not design these

- Any language toggle or English-language version of any screen
- Automated messaging / notification composer beyond the "copy reminder
  text" helper button on the Fees Due Soon screen
- Native app install screens beyond a simple "add to home screen" PWA prompt
- A marks-entry screen for the teacher role
- A separate guardian portal, guardian login screen, or child-switcher for
  multiple children under one account — families use the student's own
  single login
