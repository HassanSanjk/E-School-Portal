import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { AppBar, BottomNav } from '@/components/shell'
import { STUDENT_NAV_ITEMS } from '@/lib/studentNav'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Wallet } from '@/components/icons'
import { PaymentStatusPill } from '@/components/paymentStatus'
import { currency, longDate } from '@/lib/format'
import { fetchPayments, type PaymentRow } from '@/lib/paymentReview'

/** Same calm-vs-real-error distinction as every other D-stage screen. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function StudentPaymentHistory() {
  const { profile } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const studentId = profile?.id

  // fetchPayments() is C7's admin query, unmodified — RLS's "student reads
  // own payments" (student_id = auth.uid()) already narrows it to her own
  // rows when a student session calls it. Same reuse as StudentFees.tsx's
  // fetchFeesWithStatus(). Deliberately not offering a way to re-view the
  // screenshot itself here — there's no student-facing read policy on the
  // payment-screenshots bucket (see schema_and_rls.sql's note from D5),
  // and the brief's "viewable" reads as "see your submission history and
  // its status," not "re-open the image." Add that read policy + a viewer
  // here later if that turns out to actually be wanted.
  const paymentsQuery = useQuery({
    queryKey: ['myPayments', studentId],
    queryFn: fetchPayments,
    enabled: !!studentId,
  })

  const sorted = useMemo(
    () =>
      [...(paymentsQuery.data ?? [])].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      ),
    [paymentsQuery.data],
  )

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <AppBar title="سجلّ المدفوعات" onBack={() => navigate('/student/fees')} />

      <main className="flex-1 p-4 space-y-3 pb-24 max-w-xl w-full mx-auto">
        {paymentsQuery.isPending ? (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </>
        ) : paymentsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>
              {loadFailureMessage(isOnline, 'تعذّر تحميل سجلّ المدفوعات.')}
            </AlertDescription>
          </Alert>
        ) : sorted.length === 0 ? (
          <Card className="p-6 flex flex-col items-center gap-2 text-center">
            <Wallet width={24} height={24} className="text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">لم يتم إرسال أي إيصالات دفع بعد.</p>
          </Card>
        ) : (
          sorted.map((p: PaymentRow) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[15px] truncate">
                    {p.installmentLabel ?? `رسوم العام ${p.academicYear}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.academicYear}</p>
                </div>
                <PaymentStatusPill status={p.status} />
              </div>

              <p className="font-display text-2xl font-extrabold mt-3">{currency(p.amountDue)}</p>

              <p className="text-[13px] text-muted-foreground mt-1">
                أُرسلت {longDate(new Date(p.submittedAt))}
              </p>
              {p.status !== 'pending' && p.reconciledAt && (
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  {p.status === 'confirmed' ? 'تم التأكيد' : 'تم الرفض'} {longDate(new Date(p.reconciledAt))}
                </p>
              )}
            </Card>
          ))
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  )
}
