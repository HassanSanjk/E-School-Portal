import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Copy, Check } from '@/components/icons'
import { copyToClipboard } from '@/lib/utils'
import {
  fetchExistingTeachers,
  updateTeacherRecord,
  commitNewTeacher,
  type TeacherCreateResult,
} from '@/lib/teachers'

// C11 — add/edit. Mirrors AdminStudentForm.tsx's structure. Editing is a
// plain RLS-guarded update; adding a new teacher reuses the same
// generalized Edge Function C10 used for students (see lib/teachers.ts).
export function AdminTeacherForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [isLoading, setIsLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [subjectSpecialty, setSubjectSpecialty] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdResult, setCreatedResult] = useState<TeacherCreateResult | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isEdit || !id) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const all = await fetchExistingTeachers()
        const found = all.find((t) => t.id === id)
        if (!found) throw new Error('لم يتم العثور على هذه المعلمة.')
        if (cancelled) return
        setFullName(found.fullName)
        setLoginId(found.loginId)
        setSubjectSpecialty(found.subjectSpecialty)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل بيانات المعلمة.')
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
    if (!fullName.trim()) return 'اسم المعلمة مطلوب.'
    if (!loginId.trim()) return 'رقم الدخول مطلوب.'
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
        await updateTeacherRecord(id, {
          fullName: fullName.trim(),
          loginId: loginId.trim(),
          subjectSpecialty: subjectSpecialty.trim(),
        })
        setSubmitState('done')
      } else {
        const result = await commitNewTeacher({
          fullName: fullName.trim(),
          loginId: loginId.trim(),
          subjectSpecialty: subjectSpecialty.trim(),
        })
        if (result.status !== 'created') {
          throw new Error(result.error ?? 'تعذّر إنشاء الحساب.')
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

  const title = isEdit ? 'تعديل بيانات المعلمة' : 'إضافة معلمة جديدة'

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin/teachers" className="text-sm text-primary-soft hover:underline">
            ← إدارة المعلمات
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">{title}</h1>
        </div>

        {isEdit && isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل بيانات المعلمة</p>
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
                  <AlertDescription>تم حفظ بيانات المعلمة بنجاح.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <Check />
                    <AlertDescription>تم إنشاء حساب المعلمة بنجاح.</AlertDescription>
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
                <Link to="/admin/teachers" className="text-sm text-primary-soft hover:underline">
                  → العودة إلى قائمة المعلمات
                </Link>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitState('idle')
                      setCreatedResult(null)
                      setFullName('')
                      setLoginId('')
                      setSubjectSpecialty('')
                    }}
                    className="text-sm text-primary-soft hover:underline"
                  >
                    إضافة معلمة أخرى
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">بيانات المعلمة</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="fullName">اسم المعلمة</FieldLabel>
                  <Input id="fullName" value={fullName} onValueChange={setFullName} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="loginId">رقم الدخول</FieldLabel>
                  <Input id="loginId" dir="ltr" value={loginId} onValueChange={setLoginId} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="subjectSpecialty">التخصص (اختياري)</FieldLabel>
                  <Input id="subjectSpecialty" value={subjectSpecialty} onValueChange={setSubjectSpecialty} />
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
