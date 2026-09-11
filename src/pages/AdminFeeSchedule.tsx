import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Search, Wallet } from '@/components/icons'
import { num } from '@/lib/format'
import { fetchExistingStudents, type ExistingStudent } from '@/lib/students'
import { fetchFeeKeysForYear, createFees, type ExistingFeeKey, type NewFeeInput } from '@/lib/feeSchedule'

// C4 — fee schedule setup. No dedicated screen exists for this in
// figma_make_prompt.md (only "Fees Due Soon", C5, is spec'd), so this is
// designed fresh: create one fee for one student, or the same fee for
// several at once — a 45-student school setting "this year's tuition" one
// student at a time would be needless friction. Tuition is annual, not
// per-term (SCHEMA_AND_ACCESS_MATRIX.md §1): one row per student per
// academic_year, optionally split by installment_label.
const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/

export function AdminFeeSchedule() {
  const [students, setStudents] = useState<ExistingStudent[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [academicYear, setAcademicYear] = useState('')
  const [installmentLabel, setInstallmentLabel] = useState('')
  const [amountDue, setAmountDue] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')

  const [existingFeeKeys, setExistingFeeKeys] = useState<ExistingFeeKey[]>([])
  const [existingFeeCount, setExistingFeeCount] = useState<number | null>(null)

  const [formError, setFormError] = useState<string | null>(null)
  const [stage, setStage] = useState<'idle' | 'confirming' | 'submitting' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdCount, setCreatedCount] = useState(0)
  const [skippedDuplicates, setSkippedDuplicates] = useState<ExistingStudent[]>([])

  const academicYearId = useId()
  const installmentId = useId()
  const amountId = useId()
  const dueDateId = useId()
  const descriptionId = useId()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoadingStudents(true)
      setLoadError(null)
      try {
        const data = await fetchExistingStudents()
        if (!cancelled) setStudents(data)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل قائمة الطالبات.')
        }
      } finally {
        if (!cancelled) setIsLoadingStudents(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Re-check for duplicates the moment academicYear is a complete,
  // validly-formatted year — the regex gate doubles as a natural debounce
  // (a partial year like "2026-202" never matches mid-typing).
  useEffect(() => {
    if (!ACADEMIC_YEAR_PATTERN.test(academicYear)) {
      setExistingFeeKeys([])
      setExistingFeeCount(null)
      return
    }
    let cancelled = false
    fetchFeeKeysForYear(academicYear)
      .then((keys) => {
        if (!cancelled) {
          setExistingFeeKeys(keys)
          setExistingFeeCount(keys.length)
        }
      })
      .catch(() => {
        if (!cancelled) setExistingFeeCount(null) // non-fatal — duplicate check just won't run
      })
    return () => {
      cancelled = true
    }
  }, [academicYear])

  const grades = useMemo(
    () => [...new Set(students.map((s) => s.gradeLevel).filter(Boolean))].sort(),
    [students],
  )

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (gradeFilter && s.gradeLevel !== gradeFilter) return false
      if (!q) return true
      return s.fullName.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q)
    })
  }, [students, search, gradeFilter])

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => new Set([...prev, ...filteredStudents.map((s) => s.id)]))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  const normalizedInstallment = installmentLabel.trim() || null

  const duplicates = useMemo(() => {
    if (existingFeeKeys.length === 0) return []
    const dupIds = new Set(
      existingFeeKeys
        .filter((k) => k.installmentLabel === normalizedInstallment)
        .map((k) => k.studentId),
    )
    return students.filter((s) => selectedIds.has(s.id) && dupIds.has(s.id))
  }, [existingFeeKeys, normalizedInstallment, students, selectedIds])

  function validate(): string | null {
    if (!ACADEMIC_YEAR_PATTERN.test(academicYear)) {
      return 'صيغة العام الدراسي يجب أن تكون بالشكل 2026-2027.'
    }
    const amount = Number(amountDue)
    if (!amountDue || Number.isNaN(amount) || amount <= 0) {
      return 'أدخلي مبلغًا صحيحًا أكبر من صفر.'
    }
    if (!dueDate) {
      return 'اختاري تاريخ الاستحقاق.'
    }
    if (selectedIds.size === 0) {
      return 'اختاري طالبة واحدة على الأقل.'
    }
    return null
  }

  function handleReviewClick() {
    const error = validate()
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setStage('confirming')
  }

  async function handleConfirm() {
    setStage('submitting')
    setSubmitError(null)
    try {
      const dupIds = new Set(duplicates.map((d) => d.id))
      const targetStudents = students.filter((s) => selectedIds.has(s.id) && !dupIds.has(s.id))
      const amount = Number(amountDue)

      const rows: NewFeeInput[] = targetStudents.map((s) => ({
        studentId: s.id,
        academicYear,
        installmentLabel: normalizedInstallment,
        amountDue: amount,
        dueDate,
        description: description.trim() || null,
      }))

      console.log('[جدول الرسوم] إنشاء رسوم:', rows)
      await createFees(rows)

      setCreatedCount(rows.length)
      setSkippedDuplicates(duplicates)
      setStage('done')
      setSelectedIds(new Set())
      // Refresh the duplicate-check set so a second batch (e.g. a second
      // installment for the same year) sees what was just created.
      const keys = await fetchFeeKeysForYear(academicYear)
      setExistingFeeKeys(keys)
      setExistingFeeCount(keys.length)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء الحفظ.')
      setStage('confirming')
    }
  }

  function startAnother() {
    setStage('idle')
    setFormError(null)
    setSubmitError(null)
    setCreatedCount(0)
    setSkippedDuplicates([])
  }

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-3xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">جدول الرسوم الدراسية</h1>
          <p className="text-sm text-muted-foreground mt-1">
            أنشئي رسمًا لعام دراسي كامل، أو لقسط منه، لطالبة واحدة أو لعدة طالبات دفعة واحدة.
          </p>
        </div>

        <Card className="p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-base">بيانات الرسم</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={academicYearId}>العام الدراسي</FieldLabel>
                <Input
                  id={academicYearId}
                  dir="ltr"
                  placeholder="2026-2027"
                  value={academicYear}
                  onValueChange={setAcademicYear}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={installmentId}>القسط (اختياري)</FieldLabel>
                <Input
                  id={installmentId}
                  placeholder="اتركيه فارغًا لرسوم العام كاملًا"
                  value={installmentLabel}
                  onValueChange={setInstallmentLabel}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={amountId}>المبلغ المستحق</FieldLabel>
                <Input
                  id={amountId}
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  placeholder="٠"
                  value={amountDue}
                  onValueChange={setAmountDue}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={dueDateId}>تاريخ الاستحقاق</FieldLabel>
                <Input id={dueDateId} type="date" dir="ltr" value={dueDate} onValueChange={setDueDate} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={descriptionId}>ملاحظات (اختياري)</FieldLabel>
              <Input
                id={descriptionId}
                placeholder="مثال: رسوم النقل مضمّنة"
                value={description}
                onValueChange={setDescription}
              />
            </Field>
            {existingFeeCount !== null && (
              <p className="text-xs text-muted-foreground">
                يوجد حاليًا {num(existingFeeCount)} رسم مسجل للعام الدراسي {academicYear}.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-base">اختيار الطالبات</CardTitle>
            <CardDescription>محدَّد حاليًا: {num(selectedIds.size)}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {loadError && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}

            {isLoadingStudents ? (
              <p className="text-sm text-muted-foreground">...جارٍ تحميل قائمة الطالبات</p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2">
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
                </div>

                <div className="flex gap-3 text-xs">
                  <button type="button" onClick={selectAllFiltered} className="text-primary-soft hover:underline">
                    تحديد كل الظاهرات ({num(filteredStudents.length)})
                  </button>
                  <button type="button" onClick={clearSelection} className="text-muted-foreground hover:underline">
                    إلغاء كل التحديد
                  </button>
                </div>

                <div className="rounded-lg border border-border divide-y divide-border max-h-72 overflow-auto">
                  {filteredStudents.length === 0 && (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                      لا توجد طالبات مطابقة.
                    </p>
                  )}
                  {filteredStudents.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="size-4 rounded border-input accent-primary shrink-0"
                      />
                      <span className="flex-1">
                        <span className="font-medium">{s.fullName}</span>{' '}
                        <span className="text-muted-foreground">
                          — {s.studentNumber}
                          {s.gradeLevel ? ` · ${s.gradeLevel}${s.classSection ? ` ${s.classSection}` : ''}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-base">إنشاء الرسوم</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {formError && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {stage === 'idle' && (
              <Button type="button" onClick={handleReviewClick}>
                مراجعة قبل الإنشاء
              </Button>
            )}

            {(stage === 'confirming' || stage === 'submitting') && (
              <Alert>
                <Wallet />
                <AlertDescription className="space-y-3">
                  {duplicates.length > 0 && (
                    <p>
                      <span className="font-medium">
                        {num(duplicates.length)} من الطالبات المحددات لديهن بالفعل هذا الرسم
                      </span>{' '}
                      لهذا العام{normalizedInstallment ? ` والقسط "${normalizedInstallment}"` : ''}:{' '}
                      {duplicates.map((d) => d.fullName).join('، ')} — سيتم تجاوزهن تلقائيًا لتفادي
                      التكرار.
                    </p>
                  )}
                  <p>
                    سيتم إنشاء رسم بمبلغ {amountDue} لعام {academicYear}
                    {normalizedInstallment ? ` (${normalizedInstallment})` : ''} لعدد{' '}
                    {num(selectedIds.size - duplicates.length)} طالبة. هل تريدين المتابعة؟
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleConfirm} disabled={stage === 'submitting'}>
                      {stage === 'submitting' ? '...جارٍ الحفظ' : 'نعم، أنشئي الرسوم'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStage('idle')}
                      disabled={stage === 'submitting'}
                    >
                      إلغاء
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {stage === 'done' && (
              <div className="space-y-2">
                <Alert>
                  <Wallet />
                  <AlertDescription>
                    تم إنشاء {num(createdCount)} رسم بنجاح.
                    {skippedDuplicates.length > 0 &&
                      ` تم تجاوز ${num(skippedDuplicates.length)} طالبة كان لديها هذا الرسم مسبقًا.`}
                  </AlertDescription>
                </Alert>
                <Button type="button" variant="outline" onClick={startAnother}>
                  إنشاء رسم آخر
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
