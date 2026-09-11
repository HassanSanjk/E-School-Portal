import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Search } from '@/components/icons'
import { num } from '@/lib/format'
import { fetchExistingStudents, type ExistingStudent } from '@/lib/students'

// C9 — list/search only. Add/edit is C10, deliberately not built here: no
// action buttons, no click-through, so nothing half-works ahead of that
// task. Cards on mobile, a real table on desktop/tablet — the same
// treatment as the other data-heavy admin screens (C5, C7), per
// figma_make_prompt.md's guidance for admin views specifically.
export function AdminStudentManagement() {
  const [students, setStudents] = useState<ExistingStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await fetchExistingStudents()
        if (!cancelled) setStudents(data)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل قائمة الطالبات.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const grades = useMemo(
    () => [...new Set(students.map((s) => s.gradeLevel).filter(Boolean))].sort(),
    [students],
  )

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students
      .filter((s) => !gradeFilter || s.gradeLevel === gradeFilter)
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
  }, [students, search, gradeFilter])

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-5xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">إدارة الطالبات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {students.length > 0 && `إجمالي عدد الطالبات: ${num(students.length)}`}
          </p>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل قائمة الطالبات</p>
        ) : students.length === 0 ? (
          <Card className="p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">لا توجد طالبات مسجَّلات بعد.</p>
            <Link to="/admin/excel-import" className="text-sm text-primary-soft hover:underline">
              استيراد بيانات الطالبات من إكسل →
            </Link>
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
                    placeholder="ابحثي بالاسم أو الرقم الأكاديمي"
                    className="ps-9"
                  />
                </div>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">كل الصفوف</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {visibleStudents.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">لا توجد طالبات مطابقة.</p>
              </Card>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden space-y-2">
                  {visibleStudents.map((s) => (
                    <Card key={s.id} className="p-3">
                      <CardContent className="p-0 space-y-1">
                        <div className="font-medium text-sm">{s.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.studentNumber}
                          {s.gradeLevel ? ` · ${s.gradeLevel}${s.classSection ? ` ${s.classSection}` : ''}` : ''}
                        </div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {s.loginId}
                        </div>
                        {(s.guardianName || s.guardianPhone) && (
                          <div className="text-xs text-muted-foreground pt-1 border-t border-border mt-1">
                            {s.guardianName}
                            {s.guardianName && s.guardianPhone ? ' — ' : ''}
                            <span dir="ltr">{s.guardianPhone}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
                            الرقم الأكاديمي
                          </th>
                          <th className="text-start font-medium px-3 py-2 border-b border-border">الصف</th>
                          <th className="text-start font-medium px-3 py-2 border-b border-border">
                            رقم الدخول
                          </th>
                          <th className="text-start font-medium px-3 py-2 border-b border-border">
                            ولي الأمر
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStudents.map((s) => (
                          <tr key={s.id} className="odd:bg-card even:bg-muted/30">
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap font-medium">
                              {s.fullName}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap" dir="ltr">
                              {s.studentNumber}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap text-muted-foreground">
                              {s.gradeLevel}
                              {s.classSection ? ` ${s.classSection}` : ''}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap text-muted-foreground" dir="ltr">
                              {s.loginId}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap text-muted-foreground">
                              {s.guardianName}
                              {s.guardianName && s.guardianPhone ? ' — ' : ''}
                              <span dir="ltr">{s.guardianPhone}</span>
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
