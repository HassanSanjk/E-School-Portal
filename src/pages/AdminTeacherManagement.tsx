import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Search } from '@/components/icons'
import { num } from '@/lib/format'
import { fetchExistingTeachers, type ExistingTeacher } from '@/lib/teachers'

// C11 — list/search + add/edit (combined into one task for teachers, per
// IMPLEMENTATION_TASK_LIST.md — unlike students, split across C9/C10).
// Kept as two pages anyway, mirroring AdminStudentManagement/
// AdminStudentForm's structure: once an admin knows how one works, she
// knows how the other does too.
export function AdminTeacherManagement() {
  const navigate = useNavigate()

  const [teachers, setTeachers] = useState<ExistingTeacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await fetchExistingTeachers()
        if (!cancelled) setTeachers(data)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل قائمة المعلمات.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const subjects = useMemo(
    () => [...new Set(teachers.map((t) => t.subjectSpecialty).filter(Boolean))].sort(),
    [teachers],
  )

  const visibleTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teachers
      .filter((t) => !subjectFilter || t.subjectSpecialty === subjectFilter)
      .filter((t) => !q || t.fullName.toLowerCase().includes(q) || t.loginId.toLowerCase().includes(q))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
  }, [teachers, search, subjectFilter])

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-5xl w-full mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/admin" className="text-sm text-primary-soft hover:underline">
              ← لوحة الإدارة
            </Link>
            <h1 className="font-display text-xl font-bold mt-2">إدارة المعلمات</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {teachers.length > 0 && `إجمالي عدد المعلمات: ${num(teachers.length)}`}
            </p>
          </div>
          <Link to="/admin/teachers/new" className={buttonVariants({ size: 'sm' })}>
            + إضافة معلمة
          </Link>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل قائمة المعلمات</p>
        ) : teachers.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">لا توجد معلمات مسجَّلات بعد.</p>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <CardContent className="p-0 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground size-4" />
                  <Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ابحثي بالاسم أو رقم الدخول"
                    className="ps-9"
                  />
                </div>
                {subjects.length > 0 && (
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">كل التخصصات</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </CardContent>
            </Card>

            {visibleTeachers.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">لا توجد معلمات مطابقات.</p>
              </Card>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden space-y-2">
                  {visibleTeachers.map((t) => (
                    <Link key={t.id} to={`/admin/teachers/${t.id}/edit`} className="block">
                      <Card className="p-3 hover:bg-muted/50 transition-colors">
                        <CardContent className="p-0 space-y-1">
                          <div className="font-medium text-sm">{t.fullName}</div>
                          <div className="text-xs text-muted-foreground" dir="ltr">
                            {t.loginId}
                          </div>
                          {t.subjectSpecialty && (
                            <div className="text-xs text-muted-foreground">{t.subjectSpecialty}</div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Desktop/tablet: table */}
                <Card className="hidden sm:block p-0 overflow-hidden">
                  <div className="overflow-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-start font-medium px-3 py-2 border-b border-border">الاسم</th>
                          <th className="text-start font-medium px-3 py-2 border-b border-border">
                            رقم الدخول
                          </th>
                          <th className="text-start font-medium px-3 py-2 border-b border-border">
                            التخصص
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTeachers.map((t) => (
                          <tr
                            key={t.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/admin/teachers/${t.id}/edit`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/teachers/${t.id}/edit`)
                            }}
                            className="odd:bg-card even:bg-muted/30 cursor-pointer hover:bg-muted/60"
                          >
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap font-medium">
                              {t.fullName}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap" dir="ltr">
                              {t.loginId}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap text-muted-foreground">
                              {t.subjectSpecialty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
