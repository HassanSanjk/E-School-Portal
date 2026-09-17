import { Card } from '@/components/ui/card'
import { currency, monthYear } from '@/lib/format'
import { parseDateOnly } from '@/lib/fees'
import type { SalaryRow } from '@/lib/salaries'

/** One month's salary breakdown — net amount headlined in a gradient
 * band, then base/deductions/notes below. Used by D7's dashboard (its
 * one, most-recent month) and D9's full history (one of these per month).
 * There's no "paid" status anywhere in the schema (unlike fees/payments),
 * so this never implies one — the row's existence is the record. */
export function SalaryCard({ salary }: { salary: SalaryRow }) {
  return (
    <Card className="overflow-hidden shadow-lg p-0">
      <div className="brand-gradient grain text-white p-4">
        <span className="text-xs font-semibold text-white/85">
          صافي راتب {monthYear(parseDateOnly(salary.month))}
        </span>
        <p className="font-display text-3xl font-extrabold leading-none mt-3">
          {currency(salary.netAmount)}
        </p>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">الراتب الأساسي</span>
          <span className="font-bold">{currency(salary.baseAmount)}</span>
        </div>
        {salary.deductions > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الخصومات</span>
            <span className="font-bold text-overdue">− {currency(salary.deductions)}</span>
          </div>
        )}
        {salary.notes && (
          <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">{salary.notes}</p>
        )}
      </div>
    </Card>
  )
}
