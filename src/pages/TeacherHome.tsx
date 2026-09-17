import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { BrandBand, BottomNav } from '@/components/shell'
import { TEACHER_NAV_ITEMS } from '@/lib/teacherNav'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Calendar } from '@/components/icons'
import { TimetablePeriodRow } from '@/components/timetablePeriod'
import { SalaryCard } from '@/components/salaryCard'
import { currentAcademicYearLabel } from '@/lib/constants'
import { initials } from '@/lib/utils'
import { fetchMyTeacherInfo } from '@/lib/teachers'
import { fetchMyTimetable, DAY_OPTIONS } from '@/lib/timetables'
import { fetchMySalaries } from '@/lib/salaries'

/** Same calm-vs-real-error distinction as every student-portal screen. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function TeacherHome() {
  const { profile, logout } = useAuth()
  const isOnline = useOnlineStatus()
  const teacherId = profile?.id

  const infoQuery = useQuery({
    queryKey: ['teacherInfo', teacherId],
    queryFn: () => fetchMyTeacherInfo(teacherId!),
    enabled: !!teacherId,
  })

  const timetableQuery = useQuery({
    queryKey: ['myTimetable', teacherId],
    queryFn: () => fetchMyTimetable(teacherId!),
    enabled: !!teacherId,
  })

  const salariesQuery = useQuery({
    queryKey: ['mySalaries', teacherId],
    queryFn: () => fetchMySalaries(teacherId!),
    enabled: !!teacherId,
  })

  const today = new Date().getDay()
  const todayLabel = DAY_OPTIONS.find((d) => d.value === today)?.label ?? ''
  const todaysPeriods = useMemo(
    () => (timetableQuery.data ?? []).filter((p) => p.dayOfWeek === today),
    [timetableQuery.data, today],
  )
  const latestSalary = salariesQuery.data?.[0] ?? null

  // No gendered title/pronoun here on purpose — figma_make_prompt.md is
  // explicit that teacher-facing wording stays gender-neutral where the
  // person's gender isn't established, unlike the student-facing screens'
  // deliberately feminine grammar (this is a girls' school, but nothing in
  // the schema says every teacher is a woman).
  const firstName = (profile?.full_name ?? '').split(' ')[0] || profile?.full_name || ''

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <BrandBand
        greeting={`مرحبًا، ${firstName}`}
        meta={
          infoQuery.data?.subjectSpecialty
            ? `التخصص: ${infoQuery.data.subjectSpecialty} · ${currentAcademicYearLabel()}`
            : currentAcademicYearLabel()
        }
        trailing={
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center rounded-full bg-primary-soft font-bold text-white shrink-0"
              style={{ width: 40, height: 40, fontSize: 14 }}
              aria-hidden
            >
              {initials(profile?.full_name ?? '')}
            </span>
            <button
              onClick={() => logout()}
              className="h-9 px-3 rounded-lg text-xs font-semibold text-white/85 hover:bg-white/10 transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 space-y-4 pb-24 max-w-xl w-full mx-auto">
        {/* Latest salary */}
        {salariesQuery.isPending ? (
          <Skeleton className="h-40 -mt-8 relative z-10 rounded-2xl" />
        ) : salariesQuery.isError ? (
          <Alert variant="destructive" className="-mt-8 relative z-10">
            <AlertTriangle />
            <AlertDescription>{loadFailureMessage(isOnline, 'تعذّر تحميل بيانات الراتب.')}</AlertDescription>
          </Alert>
        ) : latestSalary ? (
          <div className="-mt-8 relative z-10">
            <SalaryCard salary={latestSalary} />
          </div>
        ) : (
          <Card className="-mt-8 relative z-10 shadow-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">لم يتم إدخال أي راتب بعد.</p>
          </Card>
        )}

        {/* Today's timetable */}
        <Card className="p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <h3 className="font-display text-[17px] font-bold text-foreground">
              حصص اليوم — {todayLabel}
            </h3>
          </div>
          {timetableQuery.isPending ? (
            <div className="px-4 pb-4 space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : timetableQuery.isError ? (
            <div className="px-4 pb-4">
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>
                  {loadFailureMessage(isOnline, 'تعذّر تحميل الجدول الدراسي.')}
                </AlertDescription>
              </Alert>
            </div>
          ) : todaysPeriods.length > 0 ? (
            <ul className="px-4 pb-4 space-y-2.5">
              {todaysPeriods.map((p) => (
                <TimetablePeriodRow key={p.id} entry={p} />
              ))}
            </ul>
          ) : (
            <div className="px-4 pb-6 flex flex-col items-center gap-2 text-center">
              <Calendar width={22} height={22} className="text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">لا توجد حصص مجدولة اليوم.</p>
            </div>
          )}
        </Card>
      </main>

      <BottomNav items={TEACHER_NAV_ITEMS} />
    </div>
  )
}
