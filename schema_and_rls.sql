-- ============================================================
-- School Management System — Full Schema + RLS
-- Generated directly from SCHEMA_AND_ACCESS_MATRIX.md (post
-- guardian-removal revision). Do not diverge from this without
-- updating that file first — it is the source of truth this
-- script implements.
--
-- If you already ran an earlier version of this script against a
-- live Supabase project (the one with `guardians` and
-- `guardian_student_links`), do NOT run this file again — use
-- Section 6 of SCHEMA_AND_ACCESS_MATRIX.md instead, which migrates
-- your existing data safely. This file is for a fresh project only.
-- ============================================================

create extension if not exists "uuid-ossp";

create type user_role as enum ('student', 'teacher', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login_id text unique not null,
  role user_role not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key references profiles(id) on delete cascade,
  student_number text unique not null,
  grade_level text not null,
  class_section text not null,
  guardian_name text,
  guardian_phone text
);

create table teachers (
  id uuid primary key references profiles(id) on delete cascade,
  subject_specialty text
);

create table admins (
  id uuid primary key references profiles(id) on delete cascade
);

create table subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  grade_level text not null
);

create table marks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete restrict,
  academic_year text not null,
  assessment_label text not null,
  score numeric not null,
  max_score numeric not null,
  entered_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table tutorial_papers (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  file_path text not null,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table timetables (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  grade_level text not null,
  class_section text not null,
  subject_id uuid not null references subjects(id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  period smallint not null,
  room text
);

create table fees (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  academic_year text not null,
  installment_label text,
  amount_due numeric not null,
  due_date date not null,
  description text
);

create type payment_status as enum ('pending', 'confirmed', 'rejected');

create table payments (
  id uuid primary key default uuid_generate_v4(),
  fee_id uuid not null references fees(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  screenshot_path text not null,
  status payment_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reconciled_by uuid references profiles(id),
  reconciled_at timestamptz
);

create table salaries (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  month date not null,
  base_amount numeric not null,
  deductions numeric not null default 0,
  net_amount numeric generated always as (base_amount - deductions) stored,
  notes text
);

-- ============================================================
-- Helper functions
-- ============================================================
-- SET search_path is explicit and mandatory on every SECURITY DEFINER
-- function below — without it, a SECURITY DEFINER function is vulnerable to
-- search_path hijacking (a caller could create an object in a schema ahead
-- of the default search_path to shadow a trusted table/function the
-- definer relies on). The live project already had this protection when
-- checked during the B8 security review — Supabase's SQL editor appears to
-- add it automatically — but that shouldn't be relied on implicitly: a
-- fresh run of this file via a plain psql connection or another migration
-- tool might not get the same treatment, so it's spelled out here.

create or replace function my_role() returns text as $$
  select role::text from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function is_own_class(target_grade text, target_section text) returns boolean as $$
  select exists (
    select 1 from students
    where id = auth.uid()
      and grade_level = target_grade
      and class_section = target_section
  );
$$ language sql stable security definer set search_path = public;

-- Neither function has a legitimate reason to be callable directly via
-- PostgREST RPC (/rest/v1/rpc/my_role, /rest/v1/rpc/is_own_class) or by an
-- unauthenticated caller — both are only ever meant to be evaluated
-- implicitly inside RLS policies for an authenticated request. Confirmed
-- via Supabase's security advisor during B8 that both were callable by
-- `anon` by default; revoked accordingly. Neither function currently
-- returns anything exploitable to an anon caller anyway (auth.uid() is
-- null for anon, so both just return null/false), but least-privilege
-- doesn't depend on that remaining true if either function is ever
-- modified later.
revoke execute on function my_role() from public, anon;
revoke execute on function is_own_class(text, text) from public, anon;
grant execute on function my_role() to authenticated;
grant execute on function is_own_class(text, text) to authenticated;

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table profiles enable row level security;
create policy "user reads own profile" on profiles for select to authenticated using (id = auth.uid());
create policy "admin full access to profiles" on profiles for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table students enable row level security;
create policy "student reads own row" on students for select to authenticated using (id = auth.uid());
create policy "admin full access to students" on students for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table teachers enable row level security;
create policy "teacher reads own row" on teachers for select to authenticated using (id = auth.uid());
create policy "admin full access to teachers" on teachers for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table admins enable row level security;
create policy "admin full access to admins" on admins for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table subjects enable row level security;
create policy "authenticated users read subjects" on subjects for select to authenticated using (true);
create policy "admin full access to subjects" on subjects for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

-- NOTE: teacher access to marks is still an open question. No teacher
-- policy exists below on purpose — do not add one without confirming
-- against SCHEMA_AND_ACCESS_MATRIX.md first.
alter table marks enable row level security;
create policy "student reads own marks" on marks for select to authenticated using (student_id = auth.uid());
create policy "admin full access to marks" on marks for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table tutorial_papers enable row level security;
create policy "authenticated users read tutorial papers" on tutorial_papers for select to authenticated using (true);
create policy "admin full access to tutorial papers" on tutorial_papers for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table timetables enable row level security;
create policy "teacher reads own timetable" on timetables for select to authenticated using (teacher_id = auth.uid());
create policy "student reads own class timetable" on timetables for select to authenticated using (is_own_class(grade_level, class_section));
create policy "admin full access to timetables" on timetables for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table fees enable row level security;
create policy "student reads own fees" on fees for select to authenticated using (student_id = auth.uid());
create policy "admin full access to fees" on fees for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

alter table payments enable row level security;
create policy "student inserts payment for own fee" on payments for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (select 1 from fees where fees.id = payments.fee_id and fees.student_id = auth.uid())
  );
create policy "student reads own payments" on payments for select to authenticated using (student_id = auth.uid());
create policy "admin full access to payments" on payments for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
-- No update/delete policy for student — once submitted, a payment cannot
-- be edited or withdrawn. Only admin can change `status`.

-- The strictest table. No student policy exists at all — default-deny
-- does the rest. Do not add one under any circumstances.
alter table salaries enable row level security;
create policy "teacher reads own salary" on salaries for select to authenticated using (teacher_id = auth.uid());
create policy "admin full access to salaries" on salaries for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

-- ============================================================
-- Base table grants
-- ============================================================
-- RLS policies control *which rows* a role may touch, but Postgres still
-- requires the underlying SQL-level GRANT before a role may touch a table
-- *at all* — RLS is consulted only after that check passes. Supabase's own
-- dashboard/CLI table-creation path applies this automatically; running
-- this script directly via the SQL editor does not, and the two tables
-- looking equally "protected by RLS" either way makes the gap easy to miss.
-- Confirmed live on this project on 2026-09-02: every table had TRUNCATE/
-- TRIGGER/REFERENCES granted but no SELECT/INSERT/UPDATE/DELETE, which
-- made every table 403 for every role, RLS policies notwithstanding.
--
-- Granting to anon here is deliberate, not an oversight: no policy in this
-- file grants anon anything (every policy above is `to authenticated`), so
-- an anon request against any table returns zero rows regardless of this
-- grant — matching Supabase's own default pattern of granting broadly and
-- relying on RLS, not table grants, as the actual boundary. Verified
-- directly (impersonating a random authenticated, non-admin identity):
-- salaries/profiles/payments all return zero rows, subjects (the one
-- intentionally-open-to-any-authenticated-user table) returns every row.
-- service_role normally bypasses RLS and grants automatically in a
-- standard Supabase-bootstrapped project. It does NOT here, for the same
-- reason anon/authenticated didn't above — confirmed live on 2026-09-04
-- when the PIN-reset Edge Function's service_role client was rejected with
-- `permission denied for table profiles` (Postgres error 42501) despite
-- the caller genuinely being an admin. Grant it explicitly rather than
-- relying on the usual automatic behavior.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
-- Applies the same grants automatically to any table created later in this
-- schema, so this can't quietly reappear as new tables get added.
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- ============================================================
-- Storage — payment screenshots (added for C7)
-- ============================================================
-- Private bucket, not public: a payment screenshot can contain real
-- financial/personal information (bank transfer confirmations, phone
-- numbers) — the same principle AGENTS.md applies to `salaries` applies
-- here. No getPublicUrl(), ever. Every view goes through a short-lived
-- signed URL generated on demand for an authenticated admin (see
-- createSignedScreenshotUrl in src/lib/paymentReview.ts).
--
-- storage.objects ships with RLS already enabled by default on every
-- Supabase project and zero policies (default-deny) — unlike the base
-- table grants gap above, there's nothing to separately grant here, only
-- the policy itself.
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "admin reads payment screenshots" on storage.objects;
create policy "admin reads payment screenshots"
on storage.objects for select
to authenticated
using (
  bucket_id = 'payment-screenshots'
  and my_role() = 'admin'
);

-- NOTE: deliberately no student-facing insert policy yet. That's D5's job
-- (Submit Payment screen) — the upload path/naming convention a student's
-- own policy would check against (e.g. scoping by a folder prefix matching
-- her own id) should be decided alongside that screen, not guessed at here
-- ahead of it. Do not add a student policy to this bucket without designing
-- that upload flow first.

-- ============================================================
-- Storage — tutorial papers (added for C15)
-- ============================================================
-- Also private, unlike payment-screenshots' access pattern though: this
-- is ordinary study material, openly readable by any authenticated user
-- (mirrors the `tutorial_papers` table's own "authenticated users read"
-- policy), not sensitive personal data restricted to admin. Kept private
-- rather than public anyway — every other piece of data access in this
-- app requires authentication, and a public bucket would be the one
-- silent exception to that for no real benefit.
insert into storage.buckets (id, name, public)
values ('tutorial-papers', 'tutorial-papers', false)
on conflict (id) do nothing;

drop policy if exists "authenticated users read tutorial papers" on storage.objects;
create policy "authenticated users read tutorial papers"
on storage.objects for select
to authenticated
using (bucket_id = 'tutorial-papers');

drop policy if exists "admin manages tutorial papers" on storage.objects;
create policy "admin manages tutorial papers"
on storage.objects for all
to authenticated
using (bucket_id = 'tutorial-papers' and my_role() = 'admin')
with check (bucket_id = 'tutorial-papers' and my_role() = 'admin');

-- ============================================================
-- End of script.
-- ============================================================
