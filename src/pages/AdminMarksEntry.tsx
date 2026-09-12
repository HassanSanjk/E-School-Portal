import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle, GraduationCap } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { ACADEMIC_YEAR_PATTERN } from '@/lib/constants'
import { fetchExistingStudents, type ExistingStudent } from '@/lib/students'
import { fetchSubjects, type Subject } from '@/lib/subjects'
import { fetchAssessmentLabels, findExistingMark, createMark } from '@/lib/marks'

// C12 — marks entry. Admin-only: teacher access to `marks` is still an
// open, unconfirmed question per SCHEMA_AND_ACCESS_MATRIX.md, and this
// screen doesn't touch that at all — it's the admin-side entry form the
// matrix already allows regardless of how that question is resolved.
//
// "Free-text assessment label... dropdown-with-freeform-option" is a
// native <input list> + <datalist> here rather than a new combobox
// component — genuine freeform-with-suggestions behavior with zero new
// dependencies, consistent with using a plain <select> elsewhere in this
// codebase instead of introducing a Select primitive. Student and subject
// choices stay real <select> elements though, not datalists: a marks
// entry is exactly the kind of place where "picked the wrong near-match
// by accident" is a much costlier mistake than for a reminder label, so
// those two fields stay ID-backed and can't silently resolve to the wrong
// record the way free text could.
export function AdminMarksEntry() {
  const { session } = useAuth()
  const enteredBy = session?.user.id

  const [students, setStudents] = useState<ExistingStudent[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [studentId, setStudentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [assessmentLabel, setAssessmentLabel] = useState('')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('')

  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([])

  const [formError, setFormError] = useState<string | null>(null)
  const [stage, setStage] = useState<'idle' | 'confirming' | 'submitting' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<{ score: number; maxScore: number } | null>(null)

  const datalistId = useId()
  const studentSelectId = useId()
  const subjectSelectId = useId()
  const yearId = useId()
  const labelId = useId()
  const scoreId = useId()
  const maxScoreId = useId()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [studentsData, subjectsData] = await Promise.all([fetchExistingStudents(), fetchSubjects()])
        if (cancelled) return
        setStudents(studentsData)
        setSubjects(subjectsData)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل بيانات الطالبات أو المواد.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Refresh label suggestions whenever subject or year changes — scoped
  // narrow on purpose (see lib/marks.ts): a label only makes sense to
  // suggest within the same subject/year it was actually used in.
  useEffect(() => {
    if (!subjectId || !ACADEMIC_YEAR_PATTERN.test(academicYear)) {
      setLabelSuggestions([])
      return
    }
    let cancelled = false
    fetchAssessmentLabels(subjectId, academicYear)
      .then((labels) => {
        if (!cancelled) setLabelSuggestions(labels)
      })
      .catch(() => {
        if (!cancelled) setLabelSuggestions([]) // non-fatal — just no suggestions
      })
    return () => {
      cancelled = true
    }
  }, [subjectId, academicYear])

  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [students, studentId])

  function validate(): string | null {
    if (!studentId) return 'اختاري الطالبة.'
    if (!subjectId) return 'اختاري المادة.'
    if (!ACADEMIC_YEAR_PATTERN.test(academicYear)) return 'صيغة العام الدراسي يجب أن تكون بالشكل 2026-2027.'
    if (!assessmentLabel.trim()) return 'أدخلي اسم التقييم (مثال: الاختبار الأول).'
    const scoreNum = Number(score)
    const maxNum = Number(maxScore)
    if (score === '' || Number.isNaN(scoreNum) || scoreNum < 0) return 'أدخلي درجة صحيحة (صفر أو أكثر).'
    if (maxScore === '' || Number.isNaN(maxNum) || maxNum <= 0) return 'أدخلي الدرجة العظمى (أكبر من صفر).'
    if (scoreNum > maxNum) return 'الدرجة لا يمكن أن تكون أكبر من الدرجة العظمى.'
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
      const existing = await findExistingMark(studentId, subjectId, academicYear, assessmentLabel.trim())
      setDuplicateWarning(existing)
    } catch {
      setDuplicateWarning(null) // non-fatal — the create call below still catches real errors
    }
    setStage('confirming')
  }

  async function handleConfirm() {
    if (!enteredBy) {
      setSubmitError('تعذّر تحديد هوية المسؤول الحالي — أعيدي تسجيل الدخول.')
      return
    }
    setStage('submitting')
    setSubmitError(null)
    try {
      await createMark({
        studentId,
        subjectId,
        academicYear,
        assessmentLabel: assessmentLabel.trim(),
        score: Number(score),
        maxScore: Number(maxScore),
        enteredBy,
      })
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
    setDuplicateWarning(null)
    setAssessmentLabel('')
    setScore('')
    setMaxScore('')
  }

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">إدخال الدرجات</h1>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل البيانات</p>
        ) : subjects.length === 0 ? (
          <Card className="p-6 text-center space-y-1">
            <p className="text-sm text-muted-foreground">لا توجد مواد دراسية مضافة بعد.</p>
            <p className="text-xs text-muted-foreground">
              يجب إضافة المواد أولًا قبل إمكانية إدخال الدرجات.
            </p>
          </Card>
        ) : stage === 'done' ? (
          <Card className="p-5">
            <CardContent className="p-0 space-y-3">
              <Alert>
                <GraduationCap />
                <AlertDescription>
                  تم حفظ درجة {selectedStudent?.fullName} في مادة{' '}
                  {subjects.find((s) => s.id === subjectId)?.name} بنجاح.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <button type="button" onClick={startAnother} className="text-sm text-primary-soft hover:underline">
                  إدخال درجة أخرى لنفس المادة والعام
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">بيانات الدرجة</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <Field>
                <FieldLabel htmlFor={studentSelectId}>الطالبة</FieldLabel>
                <select
                  id={studentSelectId}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={stage !== 'idle'}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">— اختاري —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.studentNumber}
                      {s.gradeLevel ? ` (${s.gradeLevel}${s.classSection ? ` ${s.classSection}` : ''})` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor={subjectSelectId}>المادة</FieldLabel>
                <select
                  id={subjectSelectId}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={stage !== 'idle'}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">— اختاري —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.gradeLevel ? ` (${s.gradeLevel})` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor={yearId}>العام الدراسي</FieldLabel>
                  <Input
                    id={yearId}
                    dir="ltr"
                    placeholder="2026-2027"
                    value={academicYear}
                    onValueChange={setAcademicYear}
                    disabled={stage !== 'idle'}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={labelId}>التقييم</FieldLabel>
                  <input
                    id={labelId}
                    list={datalistId}
                    value={assessmentLabel}
                    onChange={(e) => setAssessmentLabel(e.target.value)}
                    disabled={stage !== 'idle'}
                    placeholder="الاختبار الأول"
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <datalist id={datalistId}>
                    {labelSuggestions.map((label) => (
                      <option key={label} value={label} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor={scoreId}>الدرجة</FieldLabel>
                  <Input
                    id={scoreId}
                    type="number"
                    min="0"
                    dir="ltr"
                    value={score}
                    onValueChange={setScore}
                    disabled={stage !== 'idle'}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={maxScoreId}>الدرجة العظمى</FieldLabel>
                  <Input
                    id={maxScoreId}
                    type="number"
                    min="0"
                    dir="ltr"
                    value={maxScore}
                    onValueChange={setMaxScore}
                    disabled={stage !== 'idle'}
                  />
                </Field>
              </div>

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
                  <GraduationCap />
                  <AlertDescription className="space-y-3">
                    {duplicateWarning && (
                      <p>
                        <span className="font-medium">تنبيه:</span> يوجد بالفعل درجة مسجَّلة لهذه الطالبة في هذا
                        التقييم: {duplicateWarning.score}/{duplicateWarning.maxScore}. المتابعة ستضيف درجة
                        جديدة منفصلة، دون حذف القديمة.
                      </p>
                    )}
                    <p>
                      حفظ درجة {selectedStudent?.fullName}: {score}/{maxScore} في{' '}
                      {subjects.find((s) => s.id === subjectId)?.name} ({assessmentLabel.trim()}، {academicYear})؟
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
