# Database Schema & Access-Control Matrix

Status: DRAFT — needs a careful human read-through before anything changes in
Supabase. This is the single most consequential document in the project — a
mistake here is expensive to unwind once real data and RLS policies are built
on top of it.

**Revision note:** this version removes the separate `guardian` role
entirely, per the stakeholder's decision that parents don't need their own
account — a family uses their daughter's own student login to view marks,
tutorial papers, and fees, and to submit payment screenshots. This is a real
architectural simplification, not a cosmetic one: it removes an entire table,
a join table, and four RLS policies that existed solely to link a guardian's
identity to a student's. If your Supabase project already has the old
`guardians`/`guardian_student_links` tables and the old `payments.guardian_id`
column from an earlier version of this schema, see Section 6 for the
migration path — don't just re-run Section 4 from scratch on a live database.

---

## 1. Design decisions

- Every human in the system has exactly one row in `profiles`, keyed to
  Supabase's own `auth.users.id`. `profiles.role` says which of **three**
  roles they are: `student`, `teacher`, or `admin`. Role-specific detail
  tables (`students`, `teachers`, `admins`) hang off `profiles.id` 1:1.
- **There is no separate guardian account.** A student's login (ID + PIN) is
  shared with her family — whoever has the credentials (the student herself,
  a parent, or both) can view marks, tutorial papers, and fees, and can
  submit a payment screenshot. The system has no way to distinguish "the
  student is logged in" from "her mother is logged in using the same
  credentials" — that distinction doesn't exist at the account level, by the
  stakeholder's explicit design.
- Guardian **contact information** (not a login) still needs to live
  somewhere — two plain fields on `students`: `guardian_name` and
  `guardian_phone`. This is just data admin can enter and see, not a second
  identity in the system.
- Auth uses the synthetic-email pattern from AGENTS.md
  (`{id}@school.internal` + PIN). The `id` used for login is stored as
  `profiles.login_id` — a short human-facing ID, separate from the internal
  UUID.
- **Tuition is annual, not per-term.** `fees` is keyed to `academic_year`
  (e.g. `"2026-2027"`), not a term. `installment_label` is nullable and
  optional — leave it null for a school that bills the full year as one fee,
  or use values like `"Installment 1"` / `"Installment 2"` for a school that
  splits annual tuition into a couple of payments across the year.
- **Marks don't use a fixed term structure either.** The school runs 2 or 3
  tests in a given year, and that count isn't consistent year to year. So
  `marks.assessment_label` is a free-text field admin fills in when entering
  scores (e.g. `"Test 1"`, `"Test 2"`, `"Final Exam"`) rather than a fixed
  enum. `academic_year` scopes which year a given assessment belongs to.
- **Keep system-generated values language-neutral in the database**, even
  though display is Arabic-only. `timetables.day_of_week` is a plain integer
  (`0`–`6`), never literal Arabic weekday text — the frontend maps the stored
  value to the Arabic day name for display. Internal enums (`profiles.role`,
  `payments.status`) stay English internally; only user-entered free text
  (`full_name`, `assessment_label`, `installment_label`, `subjects.name`,
  `guardian_name`, `description` fields) is actually Arabic, and Postgres's
  default UTF-8 encoding handles that with no schema changes needed.
- RLS policies below reference helper SQL functions so policies stay readable
  instead of repeating subqueries everywhere:
  - `my_role()` → returns the caller's role as text
  - `is_own_class()` → whether a given grade/section matches the caller's own
    (student) class

---

## 2. Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One row per person, any role | `id` (= auth.users.id), `login_id`, `role`, `full_name`, `created_at` |
| `students` | Student-specific detail, including guardian contact info | `id` (= profiles.id), `student_number`, `grade_level`, `class_section`, `guardian_name`, `guardian_phone` |
| `teachers` | Teacher-specific detail | `id` (= profiles.id), `subject_specialty` |
| `admins` | Admin-specific detail | `id` (= profiles.id) |
| `subjects` | Subject catalog | `id`, `name`, `grade_level` |
| `marks` | A student's score on a subject, for one assessment within a school year | `id`, `student_id`, `subject_id`, `academic_year`, `assessment_label`, `score`, `max_score`, `entered_by` |
| `tutorial_papers` | PDFs per subject | `id`, `subject_id`, `title`, `file_path`, `uploaded_by` |
| `timetables` | A teacher's schedule slot | `id`, `teacher_id`, `grade_level`, `class_section`, `subject_id`, `day_of_week`, `period`, `room` |
| `fees` | A fee owed by a student for a school year (optionally split into installments) | `id`, `student_id`, `academic_year`, `installment_label`, `amount_due`, `due_date`, `description` |
| `payments` | A payment screenshot submitted via a student's account | `id`, `fee_id`, `student_id`, `screenshot_path`, `status`, `submitted_at`, `reconciled_by`, `reconciled_at` |
| `salaries` | A teacher's monthly salary/deductions | `id`, `teacher_id`, `month`, `base_amount`, `deductions`, `net_amount`, `notes` |

**Removed from the earlier draft:** `guardians` and `guardian_student_links`
no longer exist. Guardian contact info moved onto `students` as plain fields;
`payments.guardian_id` became `payments.student_id`.

---

## 3. Access-control matrix

Legend: **R** = read, **W** = write (insert/update), **–** = no access.
"Own" means scoped to rows belonging to the caller — never the whole table.

| Table | student | teacher | admin |
|---|---|---|---|
| `profiles` (own row) | R | R | R/W |
| `profiles` (others) | – | – | R/W |
| `students` (own row) | R | – | R/W |
| `teachers` (own row) | – | R | R/W |
| `admins` | – | – | R/W |
| `subjects` | R | R | R/W |
| `marks` (own) | R | – * | R/W |
| `tutorial_papers` | R | R | R/W |
| `timetables` (own class / own schedule) | R | R | R/W |
| `fees` (own) | R | – | R/W |
| `payments` (own) | R/W (insert only — no edit after submit) | – | R/W (review + reconcile) |
| `salaries` (own) | – | R | R/W |

\* Teacher access to `marks` is **still an open question**, unchanged from
the previous version of this document — flagged in AGENTS.md. Until
confirmed, teachers get no access to `marks` at all, even read.

**The row that matters most for the security review pass:**
- `salaries` — only the owning teacher and admin. A student reaching this
  table under any circumstance is the single worst-case leak in the system.

**What simplified when guardian accounts were removed:** the previous
version of this matrix needed a `guardian_student_links` table, an
`is_linked_guardian()` helper function used in five different places, and a
guardian-specific policy on `profiles` just so a guardian could see her
child's name. All of that is gone — a student's own-row policies now cover
everything a family needs, because there's only one identity per student, not
two. This removes a real class of bugs (a guardian accidentally linked to
the wrong student, or a link a guardian could insert themselves) rather than
just moving the complexity somewhere else.

**One new thing worth a deliberate decision:** with no separate guardian
identity, there's also no way to *restrict* what the logged-in person can do
based on whether it's actually the student or her parent typing — a curious
student now has read access to her own fee balance and can see exactly what
her family owes, and can submit a payment screenshot herself. This was true
implicitly the moment guardian accounts were dropped, but it's worth the
school being aware of explicitly rather than discovering it later.

---

## 4. RLS policy plan (to hand to OpenCode/Big Pickle for implementation)

### Helper functions

```sql
create or replace function my_role() returns text as $$
  select role::text from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_own_class(target_grade text, target_section text) returns boolean as $$
  select exists (
    select 1 from students
    where id = auth.uid()
      and grade_level = target_grade
      and class_section = target_section
  );
$$ language sql stable security definer;
```

### `profiles`

```sql
alter table profiles enable row level security;

create policy "user reads own profile"
  on profiles for select to authenticated
  using (id = auth.uid());

create policy "admin full access to profiles"
  on profiles for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');
```

No cross-student policy is needed anymore — there's no second identity that
needs to read a student's profile from the outside.

### `students`

```sql
alter table students enable row level security;

create policy "student reads own row"
  on students for select to authenticated
  using (id = auth.uid());

create policy "admin full access to students"
  on students for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');
```

### `teachers` / `admins`

Same ownership pattern as `students`: one own-row select policy for the
matching role, one full-access policy for admin, nothing else.

### `salaries` (the strictest table)

```sql
alter table salaries enable row level security;

create policy "teacher reads own salary"
  on salaries for select to authenticated
  using (teacher_id = auth.uid());

create policy "admin full access to salaries"
  on salaries for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');
```

No student policy exists on this table at all — default-deny does the rest.
Do not add one under any circumstances.

### `marks`

```sql
alter table marks enable row level security;

create policy "student reads own marks"
  on marks for select to authenticated
  using (student_id = auth.uid());

create policy "admin full access to marks"
  on marks for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');

-- No teacher policy yet — see the open question flagged in Section 3.
```

### `tutorial_papers` / `subjects`

Both are non-sensitive and readable by any authenticated role:

```sql
alter table subjects enable row level security;

create policy "authenticated users read subjects"
  on subjects for select to authenticated
  using (true);

create policy "admin full access to subjects"
  on subjects for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');

-- Same pattern for tutorial_papers.
```

### `timetables` (class-matching, not simple ownership)

A student's access still depends on matching *class*, not a direct foreign
key — that part is unchanged from before.

```sql
alter table timetables enable row level security;

create policy "teacher reads own timetable"
  on timetables for select to authenticated
  using (teacher_id = auth.uid());

create policy "student reads own class timetable"
  on timetables for select to authenticated
  using (is_own_class(grade_level, class_section));

create policy "admin full access to timetables"
  on timetables for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');
```

(The old `is_linked_guardian_class()` helper is gone — it existed purely for
the guardian role.)

### `fees`

Students now have read access again — this reverses the earlier "students
don't see fees" decision, which was correct *when guardians had their own
account* but no longer applies now that a student's login is the only way a
family can see this information at all.

```sql
alter table fees enable row level security;

create policy "student reads own fees"
  on fees for select to authenticated
  using (student_id = auth.uid());

create policy "admin full access to fees"
  on fees for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');
```

### `payments`

Keyed to `student_id` now, not `guardian_id`. The insert check still confirms
the fee actually belongs to the account submitting it — this defense stays
relevant even with no separate guardian, since it stops one student from
submitting a payment against a different student's fee:

```sql
alter table payments enable row level security;

create policy "student inserts payment for own fee"
  on payments for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from fees
      where fees.id = payments.fee_id
        and fees.student_id = auth.uid()
    )
  );

create policy "student reads own payments"
  on payments for select to authenticated
  using (student_id = auth.uid());

create policy "admin full access to payments"
  on payments for all to authenticated
  using (my_role() = 'admin')
  with check (my_role() = 'admin');

-- No update/delete policy for the student role — once submitted, a payment
-- cannot be edited or withdrawn. Only admin can change `status`.
```

---

## 5. Checklist before this goes into Supabase

- [ ] Every table in Section 2 has a row in Section 3's matrix — none skipped
- [ ] Every "–" cell in the matrix has **no** corresponding RLS policy
- [ ] `salaries` specifically double-checked by a second read-through, given
      it's the highest-risk table
- [ ] Teacher access to `marks` explicitly confirmed one way or the other
      with a human before Stage D
- [ ] `payments.student_id` (not `guardian_id`) is used consistently
      everywhere — check any code, docs, or Figma screens still referencing
      "guardian" haven't survived this change
- [ ] The `payments` insert policy still joins through `fees` to confirm the
      fee actually belongs to the submitting student's own account
- [ ] `timetables` policies use `is_own_class`, not a naive ownership check
- [ ] This file is what Sonnet 5 checks the security review pass against —
      table-by-table, confirm implemented policies match this matrix exactly

---

## 6. If you already ran the old schema in Supabase

If `guardians`, `guardian_student_links`, and the old `payments.guardian_id`
column already exist in your live project (from before this revision), do
**not** just run Section 4 on top of it — you'll get duplicate/orphaned
objects. Migration path:

```sql
-- 1. Add the new columns
alter table students add column guardian_name text;
alter table students add column guardian_phone text;
alter table payments add column student_id uuid references students(id);

-- 2. Backfill payments.student_id from the old guardian link, if any
--    real data already exists (skip if the payments table is still empty)
update payments p
set student_id = f.student_id
from fees f
where f.id = p.fee_id;

-- 3. Make the new column required now that it's backfilled
alter table payments alter column student_id set not null;

-- 4. Drop the old guardian-specific objects
drop policy if exists "guardian inserts payment for linked student's fee" on payments;
drop policy if exists "guardian reads own payments" on payments;
alter table payments drop column guardian_id;

drop policy if exists "guardian reads linked student profile" on profiles;
drop policy if exists "guardian reads linked student row" on students;
drop policy if exists "guardian reads own row" on guardians;
drop policy if exists "guardian reads own links" on guardian_student_links;
drop policy if exists "admin full access to links" on guardian_student_links;
drop policy if exists "guardian reads linked students marks" on marks;
drop policy if exists "guardian reads linked students fees" on fees;
drop policy if exists "guardian reads linked student's class timetable" on timetables;
drop policy if exists "admin full access to guardians" on guardians;

drop function if exists is_linked_guardian(uuid);
drop function if exists is_linked_guardian_class(text, text);

drop table if exists guardian_student_links;
drop table if exists guardians;

-- 5. Add the new fees/payments/marks/timetables/profiles policies from
--    Section 4 above, exactly as written there.
```

Run this in a transaction if your Supabase plan supports it, and back up
first — this is exactly the kind of change worth testing on a copy before
running on the live project.
