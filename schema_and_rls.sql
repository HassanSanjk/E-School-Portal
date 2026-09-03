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
-- End of script.
-- ============================================================
