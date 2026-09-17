import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { AppBar, BottomNav } from '@/components/shell'
import { STUDENT_NAV_ITEMS } from '@/lib/studentNav'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Wallet } from '@/components/icons'
import { FeeStatusPill } from '@/components/feeStatus'
import { currency, shortDate, type FeeStatus } from '@/lib/format'
import { fetchFeesWithStatus, parseDateOnly, type FeeRow } from '@/lib/fees'

/** Same calm-vs-real-error distinction as every other D-stage screen. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

const STATUS_ORDER: Record<FeeStatus, number> = { overdue: 0, due: 1, paid: 2 }

export function StudentFees() {
  const { profile } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const studentId = profile?.id

  // fetchFeesWithStatus() is C5's admin query, unmodified — RLS's "student
  // reads own fees" (student_id = auth.uid()) already narrows it to her
  // own rows when a student session calls it, so there's no separate
  // student-scoped fees query to maintain here.
  const feesQuery = useQuery({
    queryKey: ['fees', studentId],
    queryFn: fetchFeesWithStatus,
    enabled: !!studentId,
  })

  const sorted = useMemo(() => {
    const rows = feesQuery.data ?? []
    return [...rows].sort((a, b) => {
      const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (orderDiff !== 0) return orderDiff
      return a.status === 'paid' ? b.daysUntilDue - a.daysUntilDue : a.daysUntilDue - b.daysUntilDue
    })
  }, [feesQuery.data])

  const counts = useMemo(() => {
    const rows = feesQuery.data ?? []
    return {
      overdue: rows.filter((r) => r.status === 'overdue').length,
      due: rows.filter((r) => r.status === 'due').length,
      paid: rows.filter((r) => r.status === 'paid').length,
    }
  }, [feesQuery.data])

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <AppBar
        title="الرسوم"
        onBack={() => navigate('/student')}
        trailing={
          <Link
            to="/student/payments"
            className="text-xs font-semibold text-white/85 hover:text-white hover:underline shrink-0"
          >
            سجلّ المدفوعات
          </Link>
        }
      />

      <main className="flex-1 p-4 space-y-3 pb-24 max-w-xl w-full mx-auto">
        {feesQuery.isPending ? (
          <>
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </>
        ) : feesQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadFailureMessage(isOnline, 'تعذّر تحميل الرسوم.')}</AlertDescription>
          </Alert>
        ) : sorted.length === 0 ? (
          <Card className="p-6 flex flex-col items-center gap-2 text-center">
            <Wallet width={24} height={24} className="text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">لا توجد رسوم مسجَّلة بعد.</p>
          </Card>
        ) : (
          <>
            {/* "Fees Due Soon" indicator — same status categories and
                color-coding as the admin dashboard's own C5 screen, just
                summarized to three counts instead of a sortable table. */}
            <div className="flex gap-2 text-xs font-semibold">
              <span className="flex-1 rounded-xl bg-overdue-bg text-overdue px-3 py-2 text-center">
                متأخرة: {counts.overdue}
              </span>
              <span className="flex-1 rounded-xl bg-due-bg text-due px-3 py-2 text-center">
                مستحقة قريبًا: {counts.due}
              </span>
              <span className="flex-1 rounded-xl bg-paid-bg text-paid px-3 py-2 text-center">
                مدفوعة: {counts.paid}
              </span>
            </div>

            {sorted.map((fee: FeeRow) => (
              <Card key={fee.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[15px] truncate">
                      {fee.installmentLabel ?? `رسوم العام ${fee.academicYear}`}
                    </p>
                    {fee.installmentLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5">{fee.academicYear}</p>
                    )}
                  </div>
                  <FeeStatusPill status={fee.status} />
                </div>

                <p className="font-display text-2xl font-extrabold mt-3">{currency(fee.amountDue)}</p>

                <p className="text-[13px] text-muted-foreground mt-1">
                  تاريخ الاستحقاق {shortDate(parseDateOnly(fee.dueDate))}
                  {fee.hasPendingPayment ? ' · بانتظار مراجعة الدفع' : ''}
                </p>

                {fee.description && (
                  <p className="text-[13px] text-muted-foreground mt-1">{fee.description}</p>
                )}

                {fee.status !== 'paid' && !fee.hasPendingPayment && (
                  <Link
                    to={`/student/pay?feeId=${fee.id}`}
                    className="inline-flex items-center justify-center mt-3 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    ادفعي الآن
                  </Link>
                )}
              </Card>
            ))}
          </>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  )
}
