import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Wallet } from '@/components/icons'
import { currency } from '@/lib/format'
import { fetchExistingTeachers, type ExistingTeacher } from '@/lib/teachers'
import { findExistingSalary, createSalary, type ExistingSalary } from '@/lib/salaries'

// C14 — salary entry. net_amount is never a form field — it's a generated
// column, computed by Postgres and rejecting any explicit write (verified
// live against this project; see lib/salaries.ts). Shown here only as a
// live, read-only preview so the admin can sanity-check the numbers
// before saving, then again as the server's own confirmed value after
// saving — never as something typed in.
export function AdminSalaryEntry() {
  const [teachers, setTeachers] = useState<ExistingTeacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [teacherId, setTeacherId] = useState('')
  const [month, setMonth] = useState('') // yyyy-mm, from <input type="month">
  const [baseAmount, setBaseAmount] = useState('')
  const [deductions, setDeductions] = useState('')
  const [notes, setNotes] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [stage, setStage] = useState<'idle' | 'confirming' | 'submitting' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [existingSalary, setExistingSalary] = useState<ExistingSalary | null>(null)
  const [savedNetAmount, setSavedNetAmount] = useState<number | null>(null)

  const teacherSelectId = useId()
  const monthId = useId()
  const baseId = useId()
  const deductionsId = useId()
  const notesId = useId()

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

  const selectedTeacher = useMemo(() => teachers.find((t) => t.id === teacherId), [teachers, teacherId])

  const livePreview = useMemo(() => {
    const base = Number(baseAmount)
    const ded = Number(deductions || '0')
    if (!baseAmount || Number.isNaN(base) || Number.isNaN(ded)) return null
    return base - ded
  }, [baseAmount, deductions])

  function validate(): string | null {
    if (!teacherId) return 'اختاري المعلمة.'
    if (!month) return 'اختاري الشهر.'
    const base = Number(baseAmount)
    const ded = Number(deductions || '0')
    if (!baseAmount || Number.isNaN(base) || base <= 0) return 'أدخلي الراتب الأساسي (أكبر من صفر).'
    if (deductions !== '' && (Number.isNaN(ded) || ded < 0)) return 'الخصومات يجب أن تكون صفرًا أو أكثر.'
    if (ded > base) return 'الخصومات لا يمكن أن تتجاوز الراتب الأساسي.'
    return null
  }

  async function handleReviewClick() {
    const error = validate()
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setSubmitError(null)
    try {
      const existing = await findExistingSalary(teacherId, `${month}-01`)
      setExistingSalary(existing)
    } catch {
      setExistingSalary(null) // non-fatal — the create call below still catches real errors
    }
    setStage('confirming')
  }

  async function handleConfirm() {
    setStage('submitting')
    setSubmitError(null)
    try {
      const netAmount = await createSalary({
        teacherId,
        month: `${month}-01`,
        baseAmount: Number(baseAmount),
        deductions: Number(deductions || '0'),
        notes: notes.trim(),
      })
      setSavedNetAmount(netAmount)
      setStage('done')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء الحفظ.')
      setStage('confirming')
    }
  }

  function startAnother() {
    setStage('idle')
    setFormError(null)
    setSubmitError(null)
    setExistingSalary(null)
    setSavedNetAmount(null)
    setBaseAmount('')
    setDeductions('')
    setNotes('')
  }

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">إدخال الراتب</h1>
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
          <Card className="p-6 text-center space-y-1">
            <p className="text-sm text-muted-foreground">لا توجد معلمات مضافات بعد.</p>
            <Link to="/admin/teachers/new" className="text-xs text-primary-soft hover:underline">
              إضافة معلمة →
            </Link>
          </Card>
        ) : stage === 'done' ? (
          <Card className="p-5">
            <CardContent className="p-0 space-y-3">
              <Alert>
                <Wallet />
                <AlertDescription>
                  تم حفظ راتب {selectedTeacher?.fullName} لشهر {month}. صافي الراتب:{' '}
                  {savedNetAmount !== null && currency(savedNetAmount)} (محسوب تلقائيًا من قِبل النظام).
                </AlertDescription>
              </Alert>
              <button type="button" onClick={startAnother} className="text-sm text-primary-soft hover:underline">
                إدخال راتب آخر
              </button>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">بيانات الراتب</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <Field>
                <FieldLabel htmlFor={teacherSelectId}>المعلمة</FieldLabel>
                <select
                  id={teacherSelectId}
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  disabled={stage !== 'idle'}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">— اختاري —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor={monthId}>الشهر</FieldLabel>
                <Input
                  id={monthId}
                  type="month"
                  dir="ltr"
                  value={month}
                  onValueChange={setMonth}
                  disabled={stage !== 'idle'}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor={baseId}>الراتب الأساسي</FieldLabel>
                  <Input
                    id={baseId}
                    type="number"
                    min="0"
                    dir="ltr"
                    value={baseAmount}
                    onValueChange={setBaseAmount}
                    disabled={stage !== 'idle'}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={deductionsId}>الخصومات</FieldLabel>
                  <Input
                    id={deductionsId}
                    type="number"
                    min="0"
                    dir="ltr"
                    placeholder="٠"
                    value={deductions}
                    onValueChange={setDeductions}
                    disabled={stage !== 'idle'}
                  />
                </Field>
              </div>

              {livePreview !== null && (
                <p className="text-sm text-muted-foreground">
                  صافي الراتب (يُحسب تلقائيًا، غير قابل للتعديل):{' '}
                  <span className="font-medium text-foreground">{currency(livePreview)}</span>
                </p>
              )}

              <Field>
                <FieldLabel htmlFor={notesId}>ملاحظات (اختياري)</FieldLabel>
                <Input id={notesId} value={notes} onValueChange={setNotes} disabled={stage !== 'idle'} />
              </Field>

              {formError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              {stage === 'idle' && (
                <Button type="button" onClick={handleReviewClick}>
                  مراجعة قبل الحفظ
                </Button>
              )}

              {(stage === 'confirming' || stage === 'submitting') && (
                <Alert>
                  <Wallet />
                  <AlertDescription className="space-y-3">
                    {existingSalary && (
                      <p>
                        <span className="font-medium">تنبيه:</span> يوجد بالفعل راتب مسجَّل لهذه المعلمة لهذا
                        الشهر: أساسي {currency(existingSalary.baseAmount)}، صافي{' '}
                        {currency(existingSalary.netAmount)}. المتابعة ستضيف سجلًا جديدًا منفصلًا، دون حذف
                        القديم.
                      </p>
                    )}
                    <p>
                      حفظ راتب {selectedTeacher?.fullName} لشهر {month}: أساسي {currency(Number(baseAmount))}،
                      خصومات {currency(Number(deductions || '0'))}، صافي{' '}
                      {livePreview !== null && currency(livePreview)}؟
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleConfirm} disabled={stage === 'submitting'}>
                        {stage === 'submitting' ? '...جارٍ الحفظ' : 'نعم، احفظي'}
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
