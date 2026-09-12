import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Calendar } from '@/components/icons'
import { fetchExistingStudents } from '@/lib/students'
import { fetchExistingTeachers, type ExistingTeacher } from '@/lib/teachers'
import { fetchSubjects, type Subject } from '@/lib/subjects'
import { checkScheduleConflicts, createTimetableEntry, type ScheduleConflict } from '@/lib/timetables'

// C13 — timetable entry. Every day 0-6 is offered (see timetables.ts for
// why — Sudan's exact school-week convention turned out to be genuinely
// disputed when checked, so this doesn't guess); listed starting Sunday,
// matching both Date.getDay()'s storage convention and the Islamic
// calendar's "Sunday is day one."
const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]

export function AdminTimetableEntry() {
  const [teachers, setTeachers] = useState<ExistingTeacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classOptions, setClassOptions] = useState<{ gradeLevel: string; classSection: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [teacherId, setTeacherId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [classSection, setClassSection] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<number | ''>('')
  const [period, setPeriod] = useState('')
  const [room, setRoom] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [stage, setStage] = useState<'idle' | 'confirming' | 'submitting' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [teacherConflict, setTeacherConflict] = useState<ScheduleConflict | null>(null)
  const [classConflict, setClassConflict] = useState<ScheduleConflict | null>(null)

  const gradeDatalistId = useId()
  const teacherSelectId = useId()
  const subjectSelectId = useId()
  const gradeId = useId()
  const sectionId = useId()
  const dayId = useId()
  const periodId = useId()
  const roomId = useId()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [teachersData, subjectsData, studentsData] = await Promise.all([
          fetchExistingTeachers(),
          fetchSubjects(),
          fetchExistingStudents(),
        ])
        if (cancelled) return
        setTeachers(teachersData)
        setSubjects(subjectsData)
        // Distinct grade/section combos already in use, as datalist
        // suggestions — same freeform-with-suggestions approach as C12's
        // assessment label, to keep spelling consistent (e.g. "10" vs
        // "الصف العاشر") without forcing a rigid enum these free-text
        // columns were never given.
        const combos = new Map<string, { gradeLevel: string; classSection: string }>()
        for (const s of studentsData) {
          if (s.gradeLevel) combos.set(`${s.gradeLevel}|${s.classSection}`, { gradeLevel: s.gradeLevel, classSection: s.classSection })
        }
        setClassOptions([...combos.values()])
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل البيانات.')
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
  const selectedSubject = useMemo(() => subjects.find((s) => s.id === subjectId), [subjects, subjectId])
  const selectedDayLabel = useMemo(
    () => DAY_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? '',
    [dayOfWeek],
  )

  function validate(): string | null {
    if (!teacherId) return 'اختاري المعلمة.'
    if (!subjectId) return 'اختاري المادة.'
    if (!gradeLevel.trim()) return 'أدخلي الصف.'
    if (!classSection.trim()) return 'أدخلي الشعبة.'
    if (dayOfWeek === '') return 'اختاري اليوم.'
    const periodNum = Number(period)
    if (!period || Number.isNaN(periodNum) || periodNum <= 0) return 'أدخلي رقم حصة صحيحًا (أكبر من صفر).'
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
      const { teacherConflict: tc, classConflict: cc } = await checkScheduleConflicts({
        teacherId,
        gradeLevel: gradeLevel.trim(),
        classSection: classSection.trim(),
        dayOfWeek: dayOfWeek as number,
        period: Number(period),
      })
      setTeacherConflict(tc)
      setClassConflict(cc)
    } catch {
      setTeacherConflict(null)
      setClassConflict(null) // non-fatal — the create call below still catches real errors
    }
    setStage('confirming')
  }

  async function handleConfirm() {
    setStage('submitting')
    setSubmitError(null)
    try {
      await createTimetableEntry({
        teacherId,
        subjectId,
        gradeLevel: gradeLevel.trim(),
        classSection: classSection.trim(),
        dayOfWeek: dayOfWeek as number,
        period: Number(period),
        room: room.trim(),
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
    setTeacherConflict(null)
    setClassConflict(null)
    setPeriod('')
    setRoom('')
  }

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">إدخال الجدول الدراسي</h1>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل البيانات</p>
        ) : subjects.length === 0 || teachers.length === 0 ? (
          <Card className="p-6 text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              {subjects.length === 0 && teachers.length === 0
                ? 'لا توجد مواد أو معلمات مضافة بعد.'
                : subjects.length === 0
                  ? 'لا توجد مواد دراسية مضافة بعد.'
                  : 'لا توجد معلمات مضافات بعد.'}
            </p>
            <p className="text-xs text-muted-foreground">يجب إضافتها أولًا قبل إمكانية إدخال الجدول.</p>
          </Card>
        ) : stage === 'done' ? (
          <Card className="p-5">
            <CardContent className="p-0 space-y-3">
              <Alert>
                <Calendar />
                <AlertDescription>
                  تم حفظ حصة {selectedSubject?.name} ({selectedTeacher?.fullName}) يوم {selectedDayLabel} بنجاح.
                </AlertDescription>
              </Alert>
              <button type="button" onClick={startAnother} className="text-sm text-primary-soft hover:underline">
                إدخال حصة أخرى لنفس الصف والشعبة
              </button>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">بيانات الحصة</CardTitle>
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
                      {t.subjectSpecialty ? ` (${t.subjectSpecialty})` : ''}
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

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor={gradeId}>الصف</FieldLabel>
                  <input
                    id={gradeId}
                    list={gradeDatalistId}
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    disabled={stage !== 'idle'}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <datalist id={gradeDatalistId}>
                    {[...new Set(classOptions.map((c) => c.gradeLevel))].map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </Field>
                <Field>
                  <FieldLabel htmlFor={sectionId}>الشعبة</FieldLabel>
                  <Input
                    id={sectionId}
                    value={classSection}
                    onValueChange={setClassSection}
                    disabled={stage !== 'idle'}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor={dayId}>اليوم</FieldLabel>
                  <select
                    id={dayId}
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={stage !== 'idle'}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">— اختاري —</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={periodId}>الحصة</FieldLabel>
                  <Input
                    id={periodId}
                    type="number"
                    min="1"
                    dir="ltr"
                    value={period}
                    onValueChange={setPeriod}
                    disabled={stage !== 'idle'}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor={roomId}>القاعة (اختياري)</FieldLabel>
                <Input id={roomId} value={room} onValueChange={setRoom} disabled={stage !== 'idle'} />
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
                  <Calendar />
                  <AlertDescription className="space-y-3">
                    {teacherConflict && (
                      <p>
                        <span className="font-medium">تنبيه:</span> المعلمة {selectedTeacher?.fullName} لديها
                        بالفعل حصة {teacherConflict.subjectName} يوم {selectedDayLabel} في نفس الحصة (
                        {teacherConflict.gradeLevel} {teacherConflict.classSection}).
                      </p>
                    )}
                    {classConflict && (
                      <p>
                        <span className="font-medium">تنبيه:</span> الصف {gradeLevel} {classSection} لديه بالفعل
                        حصة {classConflict.subjectName}
                        {classConflict.teacherName ? ` (${classConflict.teacherName})` : ''} يوم {selectedDayLabel}{' '}
                        في نفس الحصة.
                      </p>
                    )}
                    <p>
                      حفظ حصة {selectedSubject?.name} — {selectedTeacher?.fullName} — {gradeLevel} {classSection} —{' '}
                      {selectedDayLabel}، الحصة {period}؟
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
