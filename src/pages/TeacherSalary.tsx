import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { AppBar, BottomNav } from '@/components/shell'
import { TEACHER_NAV_ITEMS } from '@/lib/teacherNav'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Wallet } from '@/components/icons'
import { SalaryCard } from '@/components/salaryCard'
import { fetchMySalaries } from '@/lib/salaries'

/** Same calm-vs-real-error distinction as every other portal screen. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function TeacherSalary() {
  const { profile } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const teacherId = profile?.id

  // Already sorted most-recent-month-first by fetchMySalaries itself —
  // same query D7's dashboard uses, just rendering every row instead of
  // only the first.
  const salariesQuery = useQuery({
    queryKey: ['mySalaries', teacherId],
    queryFn: () => fetchMySalaries(teacherId!),
    enabled: !!teacherId,
  })

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <AppBar title="الراتب" onBack={() => navigate('/teacher')} />

      <main className="flex-1 p-4 space-y-3 pb-24 max-w-xl w-full mx-auto">
        {salariesQuery.isPending ? (
          <>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </>
        ) : salariesQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadFailureMessage(isOnline, 'تعذّر تحميل بيانات الراتب.')}</AlertDescription>
          </Alert>
        ) : salariesQuery.data && salariesQuery.data.length > 0 ? (
          salariesQuery.data.map((s) => <SalaryCard key={s.id} salary={s} />)
        ) : (
          <Card className="p-6 flex flex-col items-center gap-2 text-center">
            <Wallet width={24} height={24} className="text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">لم يتم إدخال أي راتب بعد.</p>
          </Card>
        )}
      </main>

      <BottomNav items={TEACHER_NAV_ITEMS} />
    </div>
  )
}
