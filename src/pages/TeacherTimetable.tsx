import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { AppBar, BottomNav } from '@/components/shell'
import { TEACHER_NAV_ITEMS } from '@/lib/teacherNav'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Calendar } from '@/components/icons'
import { TimetablePeriodRow } from '@/components/timetablePeriod'
import { fetchMyTimetable, DAY_OPTIONS } from '@/lib/timetables'

/** Same calm-vs-real-error distinction as every other portal screen. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function TeacherTimetable() {
  const { profile } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const teacherId = profile?.id

  const timetableQuery = useQuery({
    queryKey: ['myTimetable', teacherId],
    queryFn: () => fetchMyTimetable(teacherId!),
    enabled: !!teacherId,
  })

  // Every day of the week is shown as a tab, not just days she happens to
  // teach — a "weekly timetable" is a fixed 7-day grid, unlike D2's marks
  // filter, where only years with actual data are worth showing at all.
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay())

  const periodsForDay = useMemo(
    () => (timetableQuery.data ?? []).filter((p) => p.dayOfWeek === selectedDay),
    [timetableQuery.data, selectedDay],
  )

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <AppBar title="الجدول الدراسي" onBack={() => navigate('/teacher')} />

      <main className="flex-1 p-4 space-y-4 pb-24 max-w-xl w-full mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="اليوم">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              role="tab"
              aria-selected={d.value === selectedDay}
              onClick={() => setSelectedDay(d.value)}
              className={`shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                d.value === selectedDay
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {timetableQuery.isPending ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : timetableQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadFailureMessage(isOnline, 'تعذّر تحميل الجدول الدراسي.')}</AlertDescription>
          </Alert>
        ) : periodsForDay.length > 0 ? (
          <ul className="space-y-2.5">
            {periodsForDay.map((p) => (
              <TimetablePeriodRow key={p.id} entry={p} />
            ))}
          </ul>
        ) : (
          <Card className="p-6 flex flex-col items-center gap-2 text-center">
            <Calendar width={22} height={22} className="text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">لا توجد حصص مجدولة في هذا اليوم.</p>
          </Card>
        )}
      </main>

      <BottomNav items={TEACHER_NAV_ITEMS} />
    </div>
  )
}
