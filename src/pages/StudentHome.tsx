import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { BrandBand, BottomNav } from '@/components/shell'
import { STUDENT_NAV_ITEMS } from '@/lib/studentNav'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, Clock, FileText } from '@/components/icons'
import { currency, shortDate, score, num, FEE_STATUS_LABEL, type FeeStatus } from '@/lib/format'
import { parseDateOnly } from '@/lib/fees'
import {
  fetchMyStudentInfo,
  fetchMyRecentMarks,
  fetchMyFeeHeadline,
  fetchMyTutorialSubjects,
} from '@/lib/studentDashboard'

// Gradient + icon per fee status, matching the tone the reference design
// (reusable_design_export.zip) used for this exact hero card, adapted to
// this repo's real design tokens rather than the export's own shadow/color
// custom properties (which were never carried into this project's
// index.css — only the ones AGENTS.md actually confirmed were).
const FEE_GRADIENT: Record<FeeStatus, string> = {
  paid: 'from-paid to-[#0f5c37]',
  due: 'from-[#8a5606] to-[#6d4405]',
  overdue: 'from-overdue to-[#8a271f]',
}

const FEE_ICON: Record<FeeStatus, typeof CheckCircle> = {
  paid: CheckCircle,
  due: Clock,
  overdue: AlertTriangle,
}

const FEE_PILL_TONE: Record<FeeStatus, string> = {
  paid: 'bg-paid-bg text-paid',
  due: 'bg-due-bg text-due',
  overdue: 'bg-overdue-bg text-overdue',
}

function FeeStatusPill({ status }: { status: FeeStatus }) {
  const Icon = FEE_ICON[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-xs font-bold ${FEE_PILL_TONE[status]}`}
    >
      <Icon width={14} height={14} />
      {FEE_STATUS_LABEL[status]}
    </span>
  )
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
}

/** A query failing while there's genuinely no network isn't an error worth
 * alarming a family over — it's the exact "calm, expected" offline state
 * AGENTS.md and the Offline screen (B5) already treat as normal. A query
 * failing while online is a real problem worth naming. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function StudentHome() {
  const { profile, logout } = useAuth()
  const isOnline = useOnlineStatus()
  const studentId = profile?.id

  const infoQuery = useQuery({
    queryKey: ['studentInfo', studentId],
    queryFn: () => fetchMyStudentInfo(studentId!),
    enabled: !!studentId,
  })

  const marksQuery = useQuery({
    queryKey: ['recentMarks', studentId],
    queryFn: () => fetchMyRecentMarks(studentId!, 3),
    enabled: !!studentId,
  })

  const feeQuery = useQuery({
    queryKey: ['feeHeadline', studentId],
    queryFn: () => fetchMyFeeHeadline(studentId!),
    enabled: !!studentId,
  })

  const gradeLevel = infoQuery.data?.gradeLevel

  const papersQuery = useQuery({
    queryKey: ['tutorialSubjects', gradeLevel],
    queryFn: () => fetchMyTutorialSubjects(gradeLevel!),
    enabled: !!gradeLevel,
  })

  const firstName = (profile?.full_name ?? '').split(' ')[0] || profile?.full_name || ''

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <BrandBand
        greeting={`مرحبًا، ${firstName}`}
        meta={
          infoQuery.data ? `${infoQuery.data.gradeLevel} · ${infoQuery.data.classSection}` : undefined
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
        {infoQuery.isError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>
              {loadFailureMessage(isOnline, 'تعذّر تحميل بيانات الطالبة.')}
            </AlertDescription>
          </Alert>
        )}

        {/* Headline fee status */}
        {feeQuery.isPending ? (
          <Skeleton className="h-36 -mt-8 relative z-10 rounded-2xl" />
        ) : feeQuery.isError ? (
          <Alert variant="destructive" className="-mt-8 relative z-10">
            <AlertTriangle />
            <AlertDescription>
              {loadFailureMessage(isOnline, 'تعذّر تحميل حالة الرسوم.')}
            </AlertDescription>
          </Alert>
        ) : feeQuery.data ? (
          <Card className="overflow-hidden -mt-8 relative z-10 shadow-lg p-0">
            <div className={`bg-gradient-to-l ${FEE_GRADIENT[feeQuery.data.status]} text-white p-4`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/85">
                  حالة الرسوم — {feeQuery.data.installmentLabel ?? feeQuery.data.academicYear}
                </span>
                <FeeStatusPill status={feeQuery.data.status} />
              </div>
              <p className="font-display text-3xl font-extrabold leading-none mt-3">
                {currency(feeQuery.data.amountDue)}
              </p>
              <p className="text-[13px] text-white/85 mt-2">
                تاريخ الاستحقاق {shortDate(parseDateOnly(feeQuery.data.dueDate))}
                {feeQuery.data.hasPendingPayment ? ' · بانتظار مراجعة الدفع' : ''}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="-mt-8 relative z-10 shadow-lg">
            <CardContent>
              <p className="text-sm text-muted-foreground">لا توجد رسوم مسجَّلة بعد لهذا العام.</p>
            </CardContent>
          </Card>
        )}

        {/* Recent marks */}
        <Card className="p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-bold text-foreground">أحدث النتائج</h3>
            {marksQuery.data && marksQuery.data.length > 0 && (
              <Link to="/student/marks" className="text-sm font-semibold text-primary hover:underline">
                عرض الكل
              </Link>
            )}
          </div>
          {marksQuery.isPending ? (
            <div className="px-4 pb-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : marksQuery.isError ? (
            <div className="px-4 pb-4">
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>
                  {loadFailureMessage(isOnline, 'تعذّر تحميل النتائج.')}
                </AlertDescription>
              </Alert>
            </div>
          ) : marksQuery.data && marksQuery.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {marksQuery.data.map((m) => {
                const pct = Math.round((m.score / m.maxScore) * 100)
                return (
                  <li key={m.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-bold text-[15px] truncate">{m.subjectName}</span>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {m.assessmentLabel}: {score(m.score, m.maxScore)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 80 ? 'bg-primary' : 'bg-accent'}`}
                        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="px-4 pb-6 text-center">
              <p className="text-sm text-muted-foreground">
                لا توجد نتائج مرصودة بعد لهذا العام الدراسي.
              </p>
            </div>
          )}
        </Card>

        {/* Tutorial papers — quick list, not yet tappable: the Tutorial
            Papers screen itself (D3) doesn't exist as a route yet, so
            these stay informational for now rather than linking anywhere. */}
        <Card className="p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-1">
            <h3 className="font-display text-[17px] font-bold text-foreground">المذكّرات الدراسية</h3>
            <p className="text-[13px] text-muted-foreground mt-1">حسب مواد صفّك الدراسي</p>
          </div>
          {infoQuery.isError ? (
            // Depends on the student's grade_level from infoQuery above —
            // if that failed to load, there's no grade to look subjects up
            // by, so this reflects the same failure rather than spinning
            // on a skeleton forever.
            <div className="px-4 pb-4">
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>
                  {loadFailureMessage(isOnline, 'تعذّر تحميل المواد الدراسية.')}
                </AlertDescription>
              </Alert>
            </div>
          ) : papersQuery.isPending ? (
            <div className="px-4 py-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : papersQuery.isError ? (
            <div className="px-4 pb-4">
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>
                  {loadFailureMessage(isOnline, 'تعذّر تحميل المواد الدراسية.')}
                </AlertDescription>
              </Alert>
            </div>
          ) : papersQuery.data && papersQuery.data.length > 0 ? (
            <ul className="px-2 pb-2">
              {papersQuery.data.map((s) => (
                <li key={s.subjectId} className="flex items-center gap-3 rounded-lg px-2 min-h-12 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary-soft shrink-0">
                    <FileText width={18} height={18} />
                  </span>
                  <span className="flex-1 font-semibold truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{num(s.paperCount)} ملفات</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 pb-6 text-center">
              <p className="text-sm text-muted-foreground">لا توجد مواد دراسية مسجَّلة بعد لصفّك.</p>
            </div>
          )}
        </Card>
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  )
}
