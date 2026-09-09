// Fees Due Soon — C5.
//
// Per AGENTS.md, this is the most important screen in the app — it's the
// entire replacement for automated payment reminders (a non-negotiable:
// no automated outbound messaging of any kind). Read-only: derives status
// from live `fees`/`payments` data, doesn't write anything.
import { supabase } from './supabase'
import { deriveFeeStatus, daysUntil, currency, longDate, type FeeStatus } from './format'
import { SCHOOL_NAME_SHORT } from './constants'

/** Postgres `date` columns come back as a bare "YYYY-MM-DD" string. The
 * built-in Date constructor parses that as UTC midnight, but
 * deriveFeeStatus compares it against a local `new Date()` — for a school
 * in Sudan (UTC+2), that mismatch can shift the overdue boundary by a
 * couple of hours right around midnight. Parsing as *local* midnight
 * instead keeps the boundary aligned with the school's actual calendar
 * day. This is a call-site fix, not a change to format.ts itself — that
 * file stays exactly as carried over from the design export, per AGENTS.md.
 * Exported so C6's reminder text formats the same date the same way. */
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface FeeRow {
  id: string
  studentId: string
  studentNumber: string
  fullName: string
  gradeLevel: string
  classSection: string
  academicYear: string
  installmentLabel: string | null
  amountDue: number
  dueDate: string
  description: string | null
  status: FeeStatus
  /** A payment screenshot was submitted and is awaiting admin review —
   * shown as a separate badge so admin doesn't chase a family that's
   * already paid and just waiting on reconciliation. Never true if
   * status === 'paid' (a confirmed payment takes priority). */
  hasPendingPayment: boolean
  daysUntilDue: number
}

interface RawFeeRow {
  id: string
  student_id: string
  academic_year: string
  installment_label: string | null
  amount_due: number
  due_date: string
  description: string | null
  students: {
    student_number: string
    grade_level: string
    class_section: string
    profiles: { full_name: string } | { full_name: string }[] | null
  } | null
  payments: { status: 'pending' | 'confirmed' | 'rejected' }[] | null
}

export async function fetchFeesWithStatus(): Promise<FeeRow[]> {
  const { data, error } = await supabase.from('fees').select(
    `id, student_id, academic_year, installment_label, amount_due, due_date, description,
     students ( student_number, grade_level, class_section, profiles ( full_name ) ),
     payments ( status )`,
  )
  if (error) throw error

  return ((data ?? []) as unknown as RawFeeRow[]).map((row) => {
    const profile = row.students
      ? Array.isArray(row.students.profiles)
        ? row.students.profiles[0]
        : row.students.profiles
      : null

    const payments = row.payments ?? []
    const isPaid = payments.some((p) => p.status === 'confirmed')
    const hasPendingPayment = !isPaid && payments.some((p) => p.status === 'pending')

    const due = parseDateOnly(row.due_date)
    const status = deriveFeeStatus(due, isPaid)

    return {
      id: row.id,
      studentId: row.student_id,
      studentNumber: row.students?.student_number ?? '',
      fullName: profile?.full_name ?? '',
      gradeLevel: row.students?.grade_level ?? '',
      classSection: row.students?.class_section ?? '',
      academicYear: row.academic_year,
      installmentLabel: row.installment_label,
      amountDue: row.amount_due,
      dueDate: row.due_date,
      description: row.description,
      status,
      hasPendingPayment,
      daysUntilDue: daysUntil(due),
    }
  })
}

// ============================================================
// C6 — "Copy reminder text" helper.
//
// Not automated messaging: AGENTS.md's non-negotiable is no automated
// outbound messaging of any kind, and this doesn't send anything — it
// just fills the clipboard with text an admin reads over, then pastes and
// sends herself through whatever channel she already uses (WhatsApp, a
// phone call, in person). That manual step is deliberate, not a
// limitation to work around.
// ============================================================

/** A ready-to-paste reminder, in Arabic, for one due or overdue fee.
 * Deliberately doesn't cover 'paid' rows — there's nothing to remind
 * anyone about once a fee is paid. */
export function buildReminderMessage(row: FeeRow): string {
  const dueLabel = longDate(parseDateOnly(row.dueDate))
  const feeLabel = row.installmentLabel
    ? `${row.installmentLabel} — ${row.academicYear}`
    : `رسوم العام الدراسي ${row.academicYear}`

  const lines = [
    `تذكير من ${SCHOOL_NAME_SHORT}`,
    '',
    `الطالبة: ${row.fullName}`,
    feeLabel,
    `المبلغ المستحق: ${currency(row.amountDue)}`,
    row.status === 'overdue'
      ? `تاريخ الاستحقاق: ${dueLabel} (متأخر السداد)`
      : `تاريخ الاستحقاق: ${dueLabel}`,
    '',
    'يُرجى السداد في أقرب وقت ممكن. شكرًا لتعاونكم.',
  ]

  return lines.join('\n')
}
