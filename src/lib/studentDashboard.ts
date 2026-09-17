// Student Dashboard — D1. Read-only: recent marks, a headline fee status,
// and a tutorial-papers-by-subject quick list, all scoped to the signed-in
// student. RLS (schema_and_rls.sql) already restricts fees/marks/payments
// to `student_id = auth.uid()`, so these queries don't need to filter by
// student id themselves beyond what's needed to shape the request — the
// database would refuse to return anyone else's rows even if they tried.
import { supabase } from './supabase'
import { parseDateOnly } from './fees'
import { deriveFeeStatus, daysUntil, type FeeStatus } from './format'

export interface MyStudentInfo {
  fullName: string
  studentNumber: string
  gradeLevel: string
  classSection: string
}

export async function fetchMyStudentInfo(studentId: string): Promise<MyStudentInfo> {
  const { data, error } = await supabase
    .from('students')
    .select('student_number, grade_level, class_section, profiles(full_name)')
    .eq('id', studentId)
    .single()
  if (error) throw error

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  return {
    fullName: profile?.full_name ?? '',
    studentNumber: data.student_number ?? '',
    gradeLevel: data.grade_level ?? '',
    classSection: data.class_section ?? '',
  }
}

export interface RecentMark {
  id: string
  subjectName: string
  academicYear: string
  assessmentLabel: string
  score: number
  maxScore: number
  createdAt: string
}

/** Most recently entered marks, not the highest-scoring or most-recently-
 * assessed — `created_at` is when admin entered the row (C12), which is
 * the closest proxy this schema has to "what's new for her to see." */
export async function fetchMyRecentMarks(studentId: string, limit = 3): Promise<RecentMark[]> {
  const { data, error } = await supabase
    .from('marks')
    .select('id, academic_year, assessment_label, score, max_score, created_at, subjects(name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return (data ?? []).map((m) => {
    const subject = Array.isArray(m.subjects) ? m.subjects[0] : m.subjects
    return {
      id: m.id,
      subjectName: subject?.name ?? '',
      academicYear: m.academic_year,
      assessmentLabel: m.assessment_label,
      score: m.score,
      maxScore: m.max_score,
      createdAt: m.created_at,
    }
  })
}

export interface MyFeeHeadline {
  id: string
  installmentLabel: string | null
  academicYear: string
  amountDue: number
  dueDate: string
  status: FeeStatus
  daysUntilDue: number
  hasPendingPayment: boolean
}

/** Picks the single fee to headline the dashboard: the most urgent unpaid
 * one (overdue first, then soonest due), or — once everything is settled —
 * the most recently due paid fee, so the card isn't just empty. Mirrors
 * fetchFeesWithStatus()'s status-derivation logic from fees.ts (C5), just
 * scoped to one student and reduced to a single row instead of the full
 * admin list. Deliberately not calling fetchFeesWithStatus() directly here:
 * that query joins students→profiles for every fee, which a student's own
 * RLS happens to allow (it's her own row) but isn't data this screen needs
 * — this stays a narrower, purpose-built read. */
export async function fetchMyFeeHeadline(studentId: string): Promise<MyFeeHeadline | null> {
  const { data, error } = await supabase
    .from('fees')
    .select('id, installment_label, academic_year, amount_due, due_date, payments(status)')
    .eq('student_id', studentId)
  if (error) throw error
  if (!data || data.length === 0) return null

  const rows: MyFeeHeadline[] = data.map((row) => {
    const payments = row.payments ?? []
    const isPaid = payments.some((p) => p.status === 'confirmed')
    const hasPendingPayment = !isPaid && payments.some((p) => p.status === 'pending')
    const due = parseDateOnly(row.due_date)
    return {
      id: row.id,
      installmentLabel: row.installment_label,
      academicYear: row.academic_year,
      amountDue: row.amount_due,
      dueDate: row.due_date,
      status: deriveFeeStatus(due, isPaid),
      daysUntilDue: daysUntil(due),
      hasPendingPayment,
    }
  })

  const overdue = rows
    .filter((r) => r.status === 'overdue')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0]
  if (overdue) return overdue

  const dueSoon = rows.filter((r) => r.status === 'due').sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0]
  if (dueSoon) return dueSoon

  // Everything's paid — headline the most recently due one rather than
  // showing nothing.
  return [...rows].sort((a, b) => b.daysUntilDue - a.daysUntilDue)[0] ?? null
}

export { fetchSubjectsWithPaperCounts as fetchMyTutorialSubjects } from './tutorialPapers'
