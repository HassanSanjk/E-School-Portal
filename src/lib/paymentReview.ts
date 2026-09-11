// Payment review queue — C7 (list + full-size view only; approve/reject
// is C8, not built here).
//
// Screenshots live in a *private* Storage bucket (payment-screenshots) —
// these can contain real financial/personal information (bank transfer
// confirmations, phone numbers), so this follows the same principle
// AGENTS.md applies to `salaries`: no public bucket, no permanently
// guessable URL. Every view goes through a short-lived signed URL
// generated on demand for an authenticated admin, never getPublicUrl().
import { supabase } from './supabase'
import type { PaymentStatus } from './format'

export interface PaymentRow {
  id: string
  feeId: string
  studentId: string
  studentNumber: string
  fullName: string
  gradeLevel: string
  classSection: string
  academicYear: string
  installmentLabel: string | null
  amountDue: number
  dueDate: string
  screenshotPath: string
  status: PaymentStatus
  submittedAt: string
  reconciledAt: string | null
}

interface RawPaymentRow {
  id: string
  fee_id: string
  student_id: string
  screenshot_path: string
  status: PaymentStatus
  submitted_at: string
  reconciled_at: string | null
  students: {
    student_number: string
    grade_level: string
    class_section: string
    profiles: { full_name: string } | { full_name: string }[] | null
  } | null
  fees: {
    academic_year: string
    installment_label: string | null
    amount_due: number
    due_date: string
  } | null
}

export async function fetchPayments(): Promise<PaymentRow[]> {
  const { data, error } = await supabase.from('payments').select(
    `id, fee_id, student_id, screenshot_path, status, submitted_at, reconciled_at,
     students ( student_number, grade_level, class_section, profiles ( full_name ) ),
     fees ( academic_year, installment_label, amount_due, due_date )`,
  )
  if (error) throw error

  return ((data ?? []) as unknown as RawPaymentRow[]).map((row) => {
    const profile = row.students
      ? Array.isArray(row.students.profiles)
        ? row.students.profiles[0]
        : row.students.profiles
      : null

    return {
      id: row.id,
      feeId: row.fee_id,
      studentId: row.student_id,
      studentNumber: row.students?.student_number ?? '',
      fullName: profile?.full_name ?? '',
      gradeLevel: row.students?.grade_level ?? '',
      classSection: row.students?.class_section ?? '',
      academicYear: row.fees?.academic_year ?? '',
      installmentLabel: row.fees?.installment_label ?? null,
      amountDue: row.fees?.amount_due ?? 0,
      dueDate: row.fees?.due_date ?? '',
      screenshotPath: row.screenshot_path,
      status: row.status,
      submittedAt: row.submitted_at,
      reconciledAt: row.reconciled_at,
    }
  })
}

// Long enough to comfortably cover one review session without re-fetching,
// short enough that a copied/leaked link doesn't stay live indefinitely —
// this is the actual security boundary, not the bucket being private alone
// (a private bucket with an infinite-expiry signed URL would defeat the
// point).
const SIGNED_URL_EXPIRY_SECONDS = 600

/** Returns null (rather than throwing) on failure — a missing/broken image
 * for one row shouldn't take down the whole queue. Caller renders a
 * fallback in that slot. */
export async function createSignedScreenshotUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('payment-screenshots')
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)
  if (error) {
    console.error('createSignedScreenshotUrl failed for', path, error)
    return null
  }
  return data?.signedUrl ?? null
}

// ============================================================
// C8 — approve/reject. Plain direct writes, no Edge Function: unlike C3's
// account creation, this never touches the Auth Admin API — updating
// `payments.status` is something the admin's own session can already do,
// since RLS already grants admin `for all` on this table. RLS is the real
// gate either way, so routing this through a function would add nothing.
// ============================================================

export async function reconcilePayment(
  paymentId: string,
  status: 'confirmed' | 'rejected',
  reconciledBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({ status, reconciled_by: reconciledBy, reconciled_at: new Date().toISOString() })
    .eq('id', paymentId)
  if (error) throw error
}
