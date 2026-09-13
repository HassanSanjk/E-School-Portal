// Salary entry — C14.
//
// `net_amount` is a generated column (`base_amount - deductions`, STORED).
// Verified live against this exact project before building this screen,
// not just assumed from the schema text: a temp table with the identical
// generated-column definition was created, an insert omitting net_amount
// computed it correctly (5000 - 750 = 4250), and both an INSERT and an
// UPDATE that tried to set it explicitly were rejected outright by
// Postgres (error 428C9, "column is a generated column"). So this file
// never sends net_amount in either direction — there would be nothing to
// send it to.
import { supabase } from './supabase'

export interface NewSalaryInput {
  teacherId: string
  month: string // yyyy-mm-01 — first of the month, see AdminSalaryEntry.tsx
  baseAmount: number
  deductions: number
  notes: string
}

export interface ExistingSalary {
  baseAmount: number
  deductions: number
  netAmount: number
}

/** Nothing in the schema stops the same teacher getting two salary rows
 * for the same month — checked before every submit, same pattern as
 * C4/C12's duplicate checks. */
export async function findExistingSalary(teacherId: string, month: string): Promise<ExistingSalary | null> {
  const { data, error } = await supabase
    .from('salaries')
    .select('base_amount, deductions, net_amount')
    .eq('teacher_id', teacherId)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data ? { baseAmount: data.base_amount, deductions: data.deductions, netAmount: data.net_amount } : null
}

/** Returns the server-computed net_amount — reading it back after insert,
 * rather than trusting the client's own arithmetic, is the actual proof
 * (every time this runs, not just in the one-off test above) that the
 * database computed it, not the client. */
export async function createSalary(input: NewSalaryInput): Promise<number> {
  const { data, error } = await supabase
    .from('salaries')
    .insert({
      teacher_id: input.teacherId,
      month: input.month,
      base_amount: input.baseAmount,
      deductions: input.deductions,
      notes: input.notes || null,
    })
    .select('net_amount')
    .single()
  if (error) throw error
  return data.net_amount
}
