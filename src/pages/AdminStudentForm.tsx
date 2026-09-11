import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Copy, Check } from '@/components/icons'
import { copyToClipboard } from '@/lib/utils'
import { fetchExistingStudents, updateStudentRecord } from '@/lib/students'
import { commitNewStudents, type NewStudentPayload, type CreateResult } from '@/lib/studentImport'

// C10 — add/edit. Editing is a plain RLS-guarded update (updateStudentRecord
// in lib/students.ts). Adding a brand-new student reuses C3's
// commitNewStudents/admin-bulk-import-students Edge Function as-is — a
// manually-added student and an Excel-imported "new" row both need the
// exact same account-creation machinery (a real auth account, a
// server-generated PIN, the same rollback-on-partial-failure guarantee),
// so this calls it with a single-row batch rather than duplicating any of
// that logic.
export function AdminStudentForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [isLoading, setIsLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [loginId, setLoginId] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [classSection, setClassSection] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdResult, setCreatedResult] = useState<CreateResult | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isEdit || !id) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const all = await fetchExistingStudents()
        const found = all.find((s) => s.id === id)
        if (!found) throw new Error('لم يتم العثور على هذه الطالبة.')
        if (cancelled) return
        setFullName(found.fullName)
        setStudentNumber(found.studentNumber)
        setLoginId(found.loginId)
        setGradeLevel(found.gradeLevel)
        setClassSection(found.classSection)
        setGuardianName(found.guardianName)
        setGuardianPhone(found.guardianPhone)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل بيانات الطالبة.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  function validate(): string | null {
    if (!fullName.trim()) return 'اسم الطالبة مطلوب.'
    if (!studentNumber.trim()) return 'الرقم الأكاديمي مطلوب.'
    if (!loginId.trim()) return 'رقم الدخول مطلوب.'
    if (!gradeLevel.trim()) return 'الصف مطلوب.'
    if (!classSection.trim()) return 'الشعبة مطلوبة.'
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setFormError(validationError)
      return
    }
    setFormError(null)
    setSubmitError(null)
    setSubmitState('submitting')

    try {
      if (isEdit && id) {
        await updateStudentRecord(id, {
          fullName: fullName.trim(),
          studentNumber: studentNumber.trim(),
          loginId: loginId.trim(),
          gradeLevel: gradeLevel.trim(),
          classSection: classSection.trim(),
          guardianName: guardianName.trim(),
          guardianPhone: guardianPhone.trim(),
        })
        setSubmitState('done')
      } else {
        const payload: NewStudentPayload = {
          studentNumber: studentNumber.trim(),
          fullName: fullName.trim(),
          loginId: loginId.trim(),
          gradeLevel: gradeLevel.trim(),
          classSection: classSection.trim(),
          guardianName: guardianName.trim(),
          guardianPhone: guardianPhone.trim(),
        }
        const results = await commitNewStudents([payload])
        const result = results[0]
        if (!result || result.status !== 'created') {
          throw new Error(result?.error ?? 'تعذّر إنشاء الحساب.')
        }
        setCreatedResult(result)
        setSubmitState('done')
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.')
      setSubmitState('idle')
    }
  }

  function handleCopyCredentials() {
    if (!createdResult) return
    copyToClipboard(`${createdResult.loginId} / ${createdResult.pin}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const title = isEdit ? 'تعديل بيانات الطالبة' : 'إضافة طالبة جديدة'

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin/students" className="text-sm text-primary-soft hover:underline">
            ← إدارة الطالبات
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">{title}</h1>
        </div>

        {isEdit && isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل بيانات الطالبة</p>
        ) : isEdit && loadError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : submitState === 'done' ? (
          <Card className="p-5">
            <CardContent className="p-0 space-y-3">
              {isEdit ? (
                <Alert>
                  <Check />
                  <AlertDescription>تم حفظ بيانات الطالبة بنجاح.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <Check />
                    <AlertDescription>تم إنشاء حساب الطالبة بنجاح.</AlertDescription>
                  </Alert>
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-sm font-medium">
                      احتفظي بنسخة من رمز السر هذا الآن — لن يظهر مرة أخرى بعد مغادرة هذه الصفحة:
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        رقم الدخول: <span dir="ltr" className="font-mono">{createdResult?.loginId}</span>
                      </span>
                      <span>
                        رمز السر: <span dir="ltr" className="font-mono">{createdResult?.pin}</span>
                      </span>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopyCredentials}>
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <Link to="/admin/students" className="text-sm text-primary-soft hover:underline">
                  → العودة إلى قائمة الطالبات
                </Link>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitState('idle')
                      setCreatedResult(null)
                      setFullName('')
                      setStudentNumber('')
                      setLoginId('')
                      setGradeLevel('')
                      setClassSection('')
                      setGuardianName('')
                      setGuardianPhone('')
                    }}
                    className="text-sm text-primary-soft hover:underline"
                  >
                    إضافة طالبة أخرى
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">بيانات الطالبة</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="fullName">اسم الطالبة</FieldLabel>
                  <Input id="fullName" value={fullName} onValueChange={setFullName} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="studentNumber">الرقم الأكاديمي</FieldLabel>
                  <Input id="studentNumber" dir="ltr" value={studentNumber} onValueChange={setStudentNumber} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="loginId">رقم الدخول</FieldLabel>
                  <Input id="loginId" dir="ltr" value={loginId} onValueChange={setLoginId} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="gradeLevel">الصف</FieldLabel>
                  <Input id="gradeLevel" value={gradeLevel} onValueChange={setGradeLevel} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="classSection">الشعبة</FieldLabel>
                  <Input id="classSection" value={classSection} onValueChange={setClassSection} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                <Field>
                  <FieldLabel htmlFor="guardianName">اسم ولي الأمر (اختياري)</FieldLabel>
                  <Input id="guardianName" value={guardianName} onValueChange={setGuardianName} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="guardianPhone">هاتف ولي الأمر (اختياري)</FieldLabel>
                  <Input id="guardianPhone" dir="ltr" value={guardianPhone} onValueChange={setGuardianPhone} />
                </Field>
              </div>

              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  سيتم إنشاء رمز سر مؤقت تلقائيًا عند الحفظ — لا حاجة لإدخاله هنا.
                </p>
              )}

              {formError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {submitError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Button type="button" onClick={handleSubmit} disabled={submitState === 'submitting'}>
                {submitState === 'submitting' ? '...جارٍ الحفظ' : isEdit ? 'حفظ التعديلات' : 'إنشاء الحساب'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
