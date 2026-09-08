// Fee schedule setup — C4.
//
// Creates `fees` rows. Per SCHEMA_AND_ACCESS_MATRIX.md: tuition is annual,
// not per-term — one fee row covers a whole academic_year unless
// installment_label splits it into a couple of payments. Nothing in the
// schema stops the same student/year/installment combination from being
// created twice, so this file also exposes a way to check for that before
// committing, rather than relying on a DB constraint that doesn't exist.
import { supabase } from './supabase'

export interface NewFeeInput {
  studentId: string
  academicYear: string
  installmentLabel: string | null
  amountDue: number
  dueDate: string // yyyy-mm-dd
  description: string | null
}

/** Creates one fee row per input, in a single insert — Postgres treats a
 * multi-row insert as one statement, so this is naturally all-or-nothing:
 * either every selected student gets the fee, or (e.g. on a bad row) none
 * do. That's the right behavior here — a half-applied "set this year's
 * tuition" run would be more confusing than a clean failure to retry. */
export async function createFees(rows: NewFeeInput[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('fees').insert(
    rows.map((r) => ({
      student_id: r.studentId,
      academic_year: r.academicYear,
      installment_label: r.installmentLabel,
      amount_due: r.amountDue,
      due_date: r.dueDate,
      description: r.description,
    })),
  )
  if (error) throw error
}

export interface ExistingFeeKey {
  studentId: string
  installmentLabel: string | null
}

/** Every fee already on the books for one academic year — just enough
 * (student + installment label) to detect "this student already has this
 * exact fee" before creating a duplicate, not a full fee browser (that's
 * C5's Fees Due Soon dashboard). */
export async function fetchFeeKeysForYear(academicYear: string): Promise<ExistingFeeKey[]> {
  const { data, error } = await supabase
    .from('fees')
    .select('student_id, installment_label')
    .eq('academic_year', academicYear)
  if (error) throw error
  return (data ?? []).map((f) => ({ studentId: f.student_id, installmentLabel: f.installment_label }))
}
