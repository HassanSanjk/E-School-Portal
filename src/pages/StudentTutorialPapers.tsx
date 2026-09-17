import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { AppBar, BottomNav } from '@/components/shell'
import { STUDENT_NAV_ITEMS } from '@/lib/studentNav'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ChevronEnd, FileText } from '@/components/icons'
import { num, longDate } from '@/lib/format'
import { fetchMyStudentInfo } from '@/lib/studentDashboard'
import { fetchSubjectsWithPaperCounts, fetchTutorialPapers, createSignedPaperUrl } from '@/lib/tutorialPapers'

/** Same calm-vs-real-error distinction as D1/D2. */
function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function StudentTutorialPapers() {
  const { profile } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const studentId = profile?.id

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openingPaperId, setOpeningPaperId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  const infoQuery = useQuery({
    queryKey: ['studentInfo', studentId],
    queryFn: () => fetchMyStudentInfo(studentId!),
    enabled: !!studentId,
  })

  const gradeLevel = infoQuery.data?.gradeLevel

  const subjectsQuery = useQuery({
    queryKey: ['tutorialSubjects', gradeLevel],
    queryFn: () => fetchSubjectsWithPaperCounts(gradeLevel!),
    enabled: !!gradeLevel,
  })

  // Papers for a subject are only fetched once she actually expands it —
  // most students will only open one or two subjects per visit, so this
  // avoids fetching every subject's paper list up front.
  const papersQuery = useQuery({
    queryKey: ['tutorialPapers', expandedId],
    queryFn: () => fetchTutorialPapers(expandedId!),
    enabled: !!expandedId,
  })

  function toggleSubject(subjectId: string) {
    setOpenError(null)
    setExpandedId((current) => (current === subjectId ? null : subjectId))
  }

  async function handleOpenPaper(paperId: string, filePath: string) {
    setOpenError(null)
    setOpeningPaperId(paperId)
    try {
      const url = await createSignedPaperUrl(filePath)
      if (!url) {
        setOpenError('تعذّر فتح الملف. حاولي مرة أخرى.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningPaperId(null)
    }
  }

  const isLoadingInfo = infoQuery.isPending
  const infoFailed = infoQuery.isError

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <AppBar title="المذكّرات الدراسية" onBack={() => navigate('/student')} />

      <main className="flex-1 p-4 space-y-3 pb-24 max-w-xl w-full mx-auto">
        {isLoadingInfo ? (
          <>
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </>
        ) : infoFailed ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>
              {loadFailureMessage(isOnline, 'تعذّر تحميل بيانات الطالبة.')}
            </AlertDescription>
          </Alert>
        ) : subjectsQuery.isPending ? (
          <>
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </>
        ) : subjectsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>
              {loadFailureMessage(isOnline, 'تعذّر تحميل المواد الدراسية.')}
            </AlertDescription>
          </Alert>
        ) : subjectsQuery.data && subjectsQuery.data.length > 0 ? (
          subjectsQuery.data.map((s) => {
            const isOpen = expandedId === s.subjectId
            return (
              <Card key={s.subjectId} className="p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSubject(s.subjectId)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 min-h-14 py-3 hover:bg-muted transition-colors text-start"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary-soft shrink-0">
                    <FileText width={18} height={18} />
                  </span>
                  <span className="flex-1 font-semibold truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{num(s.paperCount)} ملفات</span>
                  <ChevronEnd
                    width={18}
                    height={18}
                    className={`text-muted-foreground/70 transition-transform ${isOpen ? '-rotate-90' : 'rotate-90'}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-2">
                    {papersQuery.isPending ? (
                      <div className="py-3 space-y-2">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    ) : papersQuery.isError ? (
                      <div className="py-3">
                        <Alert variant="destructive">
                          <AlertTriangle />
                          <AlertDescription>
                            {loadFailureMessage(isOnline, 'تعذّر تحميل الملفات.')}
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : papersQuery.data && papersQuery.data.length > 0 ? (
                      <ul className="divide-y divide-border">
                        {papersQuery.data.map((paper) => (
                          <li key={paper.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{paper.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {longDate(new Date(paper.createdAt))}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenPaper(paper.id, paper.filePath)}
                              disabled={openingPaperId === paper.id}
                              className="shrink-0 h-9 px-3 rounded-lg text-sm font-semibold text-primary hover:bg-secondary transition-colors disabled:opacity-50"
                            >
                              {openingPaperId === paper.id ? '...جارٍ الفتح' : 'فتح'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        لا توجد ملفات مرفوعة بعد لهذه المادة.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        ) : (
          <Card className="p-6 flex flex-col items-center gap-2 text-center">
            <FileText width={24} height={24} className="text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">لا توجد مواد دراسية مسجَّلة بعد لصفّك.</p>
          </Card>
        )}

        {openError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{openError}</AlertDescription>
          </Alert>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  )
}
