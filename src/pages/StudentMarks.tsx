import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { AppBar, BottomNav } from '@/components/shell'
import { STUDENT_NAV_ITEMS } from '@/lib/studentNav'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ChartBar } from '@/components/icons'
import { score } from '@/lib/format'
import { fetchMyMarks, type MarksRow } from '@/lib/marks'

/** Same calm-vs-real-error distinction as StudentHome.tsx (D1) — a query
 * failing with no network is the expected offline state, not a crash. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function StudentMarks() {
  const { profile } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const studentId = profile?.id

  const marksQuery = useQuery({
    queryKey: ['allMarks', studentId],
    queryFn: () => fetchMyMarks(studentId!),
    enabled: !!studentId,
  })

  // "YYYY-YYYY" sorts correctly as a plain string as long as every year is
  // entered in that format — C4/C12 enforce this on entry (constants.ts's
  // ACADEMIC_YEAR_PATTERN). Most recent first.
  const years = useMemo(() => {
    const set = new Set((marksQuery.data ?? []).map((m) => m.academicYear))
    return [...set].sort().reverse()
  }, [marksQuery.data])

  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const activeYear = selectedYear ?? years[0] ?? null

  const bySubject = useMemo(() => {
    if (!activeYear) return []
    const rows = (marksQuery.data ?? []).filter((m) => m.academicYear === activeYear)
    const map = new Map<string, { subjectName: string; marks: MarksRow[] }>()
    for (const m of rows) {
      const entry = map.get(m.subjectId) ?? { subjectName: m.subjectName, marks: [] }
      entry.marks.push(m)
      map.set(m.subjectId, entry)
    }
    return [...map.values()].sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'ar'))
  }, [marksQuery.data, activeYear])

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <AppBar title="النتائج" onBack={() => navigate('/student')} />

      <main className="flex-1 p-4 space-y-4 pb-24 max-w-xl w-full mx-auto">
        {marksQuery.isPending ? (
          <>
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </>
        ) : marksQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadFailureMessage(isOnline, 'تعذّر تحميل النتائج.')}</AlertDescription>
          </Alert>
        ) : years.length === 0 ? (
          <Card className="p-6 flex flex-col items-center gap-2 text-center">
            <ChartBar width={24} height={24} className="text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">لا توجد نتائج مرصودة بعد.</p>
          </Card>
        ) : (
          <>
            {years.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="العام الدراسي">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    role="tab"
                    aria-selected={y === activeYear}
                    onClick={() => setSelectedYear(y)}
                    className={`shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                      y === activeYear
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            {bySubject.length === 0 ? (
              <Card className="p-6 flex flex-col items-center gap-2 text-center">
                <ChartBar width={24} height={24} className="text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">لا توجد نتائج مرصودة لهذا العام.</p>
              </Card>
            ) : (
              bySubject.map((s) => (
                <Card key={s.subjectName} className="p-0 overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <h3 className="font-display text-[16px] font-bold text-foreground">{s.subjectName}</h3>
                  </div>
                  {/* Deliberately no fixed number of rows here — a subject
                      can have 2 or 3 assessments in a given year, per
                      figma_make_prompt.md, so this just renders whatever
                      exists rather than assuming e.g. "midterm/final". */}
                  <ul className="divide-y divide-border">
                    {s.marks.map((m) => (
                      <li key={m.id} className="px-4 py-3 flex items-center justify-between gap-2">
                        <span className="text-sm text-foreground truncate">{m.assessmentLabel}</span>
                        <span className="text-sm font-semibold text-muted-foreground shrink-0">
                          {score(m.score, m.maxScore)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))
            )}
          </>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  )
}
