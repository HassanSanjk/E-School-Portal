import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Upload, FileText, X, AlertTriangle, Copy } from '@/components/icons'
import { num } from '@/lib/format'
import { copyToClipboard } from '@/lib/utils'
import {
  openWorkbookFile,
  extractSheet,
  ExcelParseError,
  type OpenedWorkbook,
  type ParsedSheet,
} from '@/lib/excelImport'
import { fetchExistingStudents } from '@/lib/students'
import {
  STUDENT_FIELDS,
  guessMapping,
  applyMapping,
  diffAgainstExisting,
  creationBlockReason,
  toNewStudentPayload,
  commitNewStudents,
  commitChangedStudent,
  type ColumnMapping,
  type StudentField,
  type DiffResult,
  type MappedRow,
  type NewStudentPayload,
  type CreateResult,
} from '@/lib/studentImport'

// C1 (parse) + C2 (preview) + C3 (commit). Upload the school's Excel file,
// read it into memory with SheetJS (C1), map its columns onto known
// student fields and diff against what's already live in Supabase (C2),
// then actually save selected new/changed rows (C3). New students go
// through an Edge Function (need a real auth account, which the client
// can't create directly); changed rows update `students`/`profiles`
// straight from here, since RLS already allows that for an admin.
export function AdminExcelImport() {
  const [opened, setOpened] = useState<OpenedWorkbook | null>(null)
  const [parsed, setParsed] = useState<ParsedSheet | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [commitStage, setCommitStage] = useState<'idle' | 'confirming' | 'committing' | 'done'>('idle')
  const [commitError, setCommitError] = useState<string | null>(null)
  const [createResults, setCreateResults] = useState<CreateResult[]>([])
  const [updateResults, setUpdateResults] = useState<
    { rowNumber: number; fullName: string; studentNumber: string; ok: boolean; error?: string }[]
  >([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const sheetSelectId = useId()

  // Re-guess the mapping (and invalidate any previous diff) whenever the
  // parsed sheet changes — a new file or a different sheet within the same
  // file both mean the previous mapping/diff no longer apply.
  useEffect(() => {
    setMapping(parsed ? guessMapping(parsed.headers) : {})
    setDiff(null)
    setMappedRows([])
    setCompareError(null)
    setSelectedRows(new Set())
    setCommitStage('idle')
    setCommitError(null)
    setCreateResults([])
    setUpdateResults([])
  }, [parsed])

  async function loadFile(file: File) {
    setIsReading(true)
    setError(null)
    setParsed(null)
    setOpened(null)
    try {
      const wb = await openWorkbookFile(file)
      setOpened(wb)
      parseAndLog(wb, wb.sheetNames[0])
    } catch (e) {
      setError(e instanceof ExcelParseError ? e.message : 'حدث خطأ غير متوقع أثناء قراءة الملف.')
    } finally {
      setIsReading(false)
    }
  }

  function parseAndLog(wb: OpenedWorkbook, sheetName: string) {
    try {
      const sheet = extractSheet(wb.workbook, sheetName)
      // The C1 acceptance check: confirm in the console that every row and
      // column came through correctly before anything gets built on top
      // of it in C2.
      console.log(
        `[استيراد إكسل] "${wb.fileName}" ← "${sheetName}": ` +
          `${sheet.rows.length} صفًا، ${sheet.headers.length} عمودًا`,
      )
      console.log('الأعمدة المكتشفة:', sheet.headers)
      console.log('الصفوف:', sheet.rows)
      setParsed(sheet)
      setError(null)
    } catch (e) {
      setParsed(null)
      setError(e instanceof ExcelParseError ? e.message : 'حدث خطأ غير متوقع أثناء تحليل الورقة.')
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = '' // allow re-choosing the same file name after Reset
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  function handleSheetChange(sheetName: string) {
    if (!opened) return
    parseAndLog(opened, sheetName)
  }

  function reset() {
    setOpened(null)
    setParsed(null)
    setError(null)
  }

  function handleMappingChange(field: StudentField, header: string) {
    setMapping((prev) => {
      const next = { ...prev }
      if (header) next[field] = header
      else delete next[field]
      return next
    })
    setDiff(null) // mapping changed — any previous comparison is now stale
    setCommitStage('idle')
    setCreateResults([])
    setUpdateResults([])
  }

  const canCompare = Boolean(parsed?.rows.length && mapping.student_number && mapping.full_name)

  async function handleCompare() {
    if (!parsed) return
    setIsComparing(true)
    setCompareError(null)
    try {
      const existing = await fetchExistingStudents()
      const rows = applyMapping(parsed, mapping)
      const result = diffAgainstExisting(rows, existing)
      // Same C1-style acceptance check, one level up: confirm the actual
      // comparison result in the console, not just what renders.
      console.log('[استيراد إكسل] نتيجة المقارنة:', result)
      setMappedRows(rows)
      setDiff(result)
      // Default to "commit everything actionable" — new + changed — with
      // the admin able to deselect specific rows before actually saving.
      setSelectedRows(
        new Set(
          result.results
            .filter((r) => r.status === 'new' || r.status === 'changed')
            .map((r) => r.rowNumber),
        ),
      )
      setCommitStage('idle')
      setCommitError(null)
      setCreateResults([])
      setUpdateResults([])
    } catch (e) {
      setCompareError(
        e instanceof Error ? e.message : 'تعذّرت مقارنة الملف ببيانات النظام. حاولي مرة أخرى.',
      )
    } finally {
      setIsComparing(false)
    }
  }

  function toggleRowSelected(rowNumber: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

  const selectedNewRows = diff?.results.filter((r) => r.status === 'new' && selectedRows.has(r.rowNumber)) ?? []
  const selectedChangedRows =
    diff?.results.filter((r) => r.status === 'changed' && selectedRows.has(r.rowNumber)) ?? []
  const hasSelection = selectedNewRows.length + selectedChangedRows.length > 0

  async function handleCommit() {
    setCommitStage('committing')
    setCommitError(null)

    // Split selected 'new' rows into ones ready to send and ones missing
    // something account-creation actually needs (see creationBlockReason)
    // — reported directly as failures rather than sent to the function.
    const preBlocked: CreateResult[] = []
    const payloads: NewStudentPayload[] = []
    for (const r of selectedNewRows) {
      const values = mappedRows.find((m) => m.rowNumber === r.rowNumber)?.values ?? {}
      const blockReason = creationBlockReason(values)
      if (blockReason) {
        preBlocked.push({ studentNumber: r.studentNumber, fullName: r.fullName, status: 'failed', error: blockReason })
      } else {
        payloads.push(toNewStudentPayload(values))
      }
    }

    // These two write paths are independent — a failure in one shouldn't
    // swallow the other. New-account creation goes through the network to
    // an Edge Function and can fail wholesale (e.g. the function itself
    // is unreachable); changed-row updates are separate direct calls per
    // row and should still be attempted either way.
    let created: CreateResult[] = []
    let creationError: string | null = null
    try {
      created = await commitNewStudents(payloads)
    } catch (e) {
      creationError = e instanceof Error ? e.message : 'تعذّر الاتصال بخدمة إنشاء الحسابات.'
    }

    const updates: typeof updateResults = []
    for (const r of selectedChangedRows) {
      try {
        if (r.existingId) await commitChangedStudent(r.existingId, r.changes)
        updates.push({ rowNumber: r.rowNumber, fullName: r.fullName, studentNumber: r.studentNumber, ok: true })
      } catch (e) {
        updates.push({
          rowNumber: r.rowNumber,
          fullName: r.fullName,
          studentNumber: r.studentNumber,
          ok: false,
          error: e instanceof Error ? e.message : 'فشل التحديث.',
        })
      }
    }

    console.log('[استيراد إكسل] نتيجة الحفظ:', {
      created: [...preBlocked, ...created],
      creationError,
      updated: updates,
    })

    setCreateResults([...preBlocked, ...created])
    setUpdateResults(updates)
    setCommitError(
      creationError && payloads.length > 0 ? `تعذّر إنشاء الحسابات الجديدة: ${creationError}` : null,
    )
    setCommitStage('done')
  }

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-3xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">استيراد بيانات الطالبات من إكسل</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ارفعي الملف، حدّدي أي عمود يقابل أي بيانات، راجعي التغييرات المكتشفة، ثم احفظي ما
            تختارينه منها. لا شيء يُحفظ تلقائيًا — الحفظ خطوة صريحة ومنفصلة أدناه.
          </p>
        </div>

        <Card className="p-5">
          <CardContent className="p-0 space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragOver ? 'border-ring bg-muted' : 'border-border hover:bg-muted/50'
              }`}
            >
              <Upload className="text-muted-foreground" />
              <p className="text-sm font-medium">
                {isReading ? '...جارٍ القراءة' : 'اضغطي لاختيار ملف، أو أفلتيه هنا'}
              </p>
              <p className="text-xs text-muted-foreground">xlsx، xls، xlsm، أو csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>

            {opened && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{opened.fileName}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={reset}
                  aria-label="إزالة الملف"
                >
                  <X />
                </Button>
              </div>
            )}

            {opened && opened.sheetNames.length > 1 && (
              <Field>
                <FieldLabel htmlFor={sheetSelectId}>ورقة العمل</FieldLabel>
                <select
                  id={sheetSelectId}
                  value={parsed?.sheetName ?? opened.sheetNames[0]}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {opened.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {parsed && (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">
                {parsed.sheetName}
              </CardTitle>
              <CardDescription>
                {parsed.rows.length === 0
                  ? 'لا توجد صفوف بيانات تحت صف العناوين.'
                  : `${num(parsed.rows.length)} صفًا · ${num(parsed.headers.length)} عمودًا — تحقّقي من طرفية المتصفح (Console) لرؤية نفس البيانات كما دخلت الذاكرة`}
              </CardDescription>
            </CardHeader>
            {parsed.rows.length > 0 && (
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[28rem] rounded-lg border border-border">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-start font-medium px-3 py-2 border-b border-border text-muted-foreground">
                          م
                        </th>
                        {parsed.headers.map((h) => (
                          <th
                            key={h}
                            className="text-start font-medium px-3 py-2 border-b border-border whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.map((row, i) => (
                        <tr key={i} className="odd:bg-card even:bg-muted/30">
                          <td className="px-3 py-1.5 border-b border-border text-muted-foreground">
                            {num(i + 1)}
                          </td>
                          {parsed.headers.map((h) => {
                            const cell = row[h]
                            return (
                              <td key={h} className="px-3 py-1.5 border-b border-border whitespace-nowrap">
                                {typeof cell === 'number' ? num(cell) : String(cell)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {parsed && parsed.rows.length > 0 && (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">مطابقة الأعمدة</CardTitle>
              <CardDescription>
                حدّدي أي عمود من الملف يقابل كل بيانة. الاقتراحات أدناه تلقائية — راجعيها قبل
                المتابعة.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STUDENT_FIELDS.map((field) => (
                  <Field key={field.key}>
                    <FieldLabel htmlFor={`map-${field.key}`}>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </FieldLabel>
                    <select
                      id={`map-${field.key}`}
                      value={mapping[field.key] ?? ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className="flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">— لا يوجد —</option>
                      {parsed.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>

              {!canCompare && (
                <p className="text-xs text-muted-foreground">
                  لا بد من مطابقة "الرقم الأكاديمي" و"اسم الطالبة" على الأقل قبل المقارنة.
                </p>
              )}

              <Button type="button" onClick={handleCompare} disabled={!canCompare || isComparing}>
                {isComparing ? '...جارٍ المقارنة' : 'مقارنة ببيانات النظام الحالية'}
              </Button>

              {compareError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{compareError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {diff && (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">نتيجة المقارنة</CardTitle>
              <CardDescription>
                لا شيء محفوظ بعد — راجعي القائمة، عدّلي التحديد إذا لزم، ثم استخدمي "حفظ التغييرات"
                أدناه.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <CountPill label="جديدة" count={diff.counts.new} tone="new" />
                <CountPill label="معدّلة" count={diff.counts.changed} tone="changed" />
                <CountPill label="بلا تغيير" count={diff.counts.unchanged} tone="neutral" />
                <CountPill label="بها مشكلة" count={diff.counts.invalid} tone="invalid" />
              </div>

              {diff.results.filter((r) => r.status === 'new').length > 0 && (
                <ResultGroup title="طالبات جديدة" tone="new">
                  {diff.results
                    .filter((r) => r.status === 'new')
                    .map((r) => (
                      <label
                        key={r.rowNumber}
                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRows.has(r.rowNumber)}
                          onChange={() => toggleRowSelected(r.rowNumber)}
                          disabled={commitStage !== 'idle'}
                          className="size-4 rounded border-input accent-primary shrink-0"
                        />
                        <span>
                          <span className="font-medium">{r.fullName}</span>{' '}
                          <span className="text-muted-foreground">— {r.studentNumber}</span>
                        </span>
                      </label>
                    ))}
                </ResultGroup>
              )}

              {diff.results.filter((r) => r.status === 'changed').length > 0 && (
                <ResultGroup title="سجلات معدّلة" tone="changed">
                  {diff.results
                    .filter((r) => r.status === 'changed')
                    .map((r) => (
                      <label
                        key={r.rowNumber}
                        className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRows.has(r.rowNumber)}
                          onChange={() => toggleRowSelected(r.rowNumber)}
                          disabled={commitStage !== 'idle'}
                          className="size-4 rounded border-input accent-primary shrink-0 mt-0.5"
                        />
                        <span className="space-y-1">
                          <span className="block">
                            <span className="font-medium">{r.fullName}</span>{' '}
                            <span className="text-muted-foreground">— {r.studentNumber}</span>
                          </span>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {r.changes.map((c) => (
                              <li key={c.field}>
                                {c.label}: <span className="line-through">{c.before || '(فارغ)'}</span>{' '}
                                ← <span className="text-foreground font-medium">{c.after || '(فارغ)'}</span>
                              </li>
                            ))}
                          </ul>
                        </span>
                      </label>
                    ))}
                </ResultGroup>
              )}

              {diff.results.filter((r) => r.status === 'invalid').length > 0 && (
                <ResultGroup title="صفوف بها مشكلة — لن تُستورد" tone="invalid">
                  {diff.results
                    .filter((r) => r.status === 'invalid')
                    .map((r) => (
                      <div key={r.rowNumber} className="px-3 py-2 text-sm">
                        <span className="text-muted-foreground">صف {num(r.rowNumber)}:</span>{' '}
                        {r.issue}
                      </div>
                    ))}
                </ResultGroup>
              )}

              {diff.notInFile.length > 0 && (
                <ResultGroup title="موجودات في النظام ولم يردن في هذا الملف" tone="neutral">
                  {diff.notInFile.map((s) => (
                    <div key={s.id} className="px-3 py-2 text-sm">
                      <span className="font-medium">{s.fullName}</span>{' '}
                      <span className="text-muted-foreground">— {s.studentNumber}</span>
                    </div>
                  ))}
                </ResultGroup>
              )}
            </CardContent>
          </Card>
        )}

        {diff && (diff.counts.new > 0 || diff.counts.changed > 0) && (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">حفظ التغييرات</CardTitle>
              <CardDescription>
                {commitStage === 'done'
                  ? 'انتهى الحفظ — راجعي النتيجة أدناه.'
                  : 'إنشاء حساب دخول حقيقي لكل طالبة جديدة محددة، وتحديث بيانات كل سجل معدّل محدد.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {commitStage !== 'done' && (
                <p className="text-sm text-muted-foreground">
                  محدَّد للحفظ: {num(selectedNewRows.length)} جديدة، {num(selectedChangedRows.length)} معدّلة —
                  يمكنك إلغاء تحديد أي صف أعلاه قبل المتابعة.
                </p>
              )}

              {commitStage === 'idle' && (
                <Button type="button" onClick={() => setCommitStage('confirming')} disabled={!hasSelection}>
                  حفظ التغييرات المحددة
                </Button>
              )}

              {commitStage === 'confirming' && (
                <Alert>
                  <AlertTriangle />
                  <AlertDescription className="space-y-3">
                    <p>
                      سيتم إنشاء {num(selectedNewRows.length)} حساب دخول جديد وتحديث{' '}
                      {num(selectedChangedRows.length)} سجل. الحسابات الجديدة حقيقية وقابلة لتسجيل
                      الدخول فورًا. هل تريدين المتابعة؟
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleCommit}>
                        نعم، تابعي الحفظ
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setCommitStage('idle')}>
                        إلغاء
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {commitStage === 'committing' && (
                <Button type="button" disabled>
                  ...جارٍ الحفظ
                </Button>
              )}

              {commitError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{commitError}</AlertDescription>
                </Alert>
              )}

              {commitStage === 'done' && (
                <div className="space-y-4">
                  {createResults.filter((r) => r.status === 'created').length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        تم إنشاء {num(createResults.filter((r) => r.status === 'created').length)} حساب
                        جديد — احتفظي بنسخة من رموز السر هذه الآن، لن تظهر مرة أخرى بعد مغادرة هذه
                        الصفحة:
                      </p>
                      <div className="overflow-auto rounded-lg border border-border">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-start font-medium px-3 py-2 border-b border-border">
                                الاسم
                              </th>
                              <th className="text-start font-medium px-3 py-2 border-b border-border">
                                رقم الدخول
                              </th>
                              <th className="text-start font-medium px-3 py-2 border-b border-border">
                                رمز السر المؤقت
                              </th>
                              <th className="px-3 py-2 border-b border-border" />
                            </tr>
                          </thead>
                          <tbody>
                            {createResults
                              .filter((r) => r.status === 'created')
                              .map((r) => (
                                <tr key={r.studentNumber} className="odd:bg-card even:bg-muted/30">
                                  <td className="px-3 py-1.5 border-b border-border whitespace-nowrap">
                                    {r.fullName}
                                  </td>
                                  <td
                                    className="px-3 py-1.5 border-b border-border whitespace-nowrap"
                                    dir="ltr"
                                  >
                                    {r.loginId}
                                  </td>
                                  <td
                                    className="px-3 py-1.5 border-b border-border font-mono whitespace-nowrap"
                                    dir="ltr"
                                  >
                                    {r.pin}
                                  </td>
                                  <td className="px-3 py-1.5 border-b border-border">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => copyToClipboard(`${r.loginId} / ${r.pin}`)}
                                      aria-label="نسخ رقم الدخول ورمز السر"
                                    >
                                      <Copy />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {createResults.filter((r) => r.status !== 'created').length > 0 && (
                    <ResultGroup title="لم يتم إنشاؤها" tone="invalid">
                      {createResults
                        .filter((r) => r.status !== 'created')
                        .map((r, i) => (
                          <div key={`${r.studentNumber}-${i}`} className="px-3 py-2 text-sm">
                            <span className="font-medium">{r.fullName || r.studentNumber}</span>
                            {' — '}
                            <span className="text-muted-foreground">{r.error}</span>
                          </div>
                        ))}
                    </ResultGroup>
                  )}

                  {updateResults.filter((u) => u.ok).length > 0 && (
                    <p className="text-sm text-paid font-medium">
                      تم تحديث {num(updateResults.filter((u) => u.ok).length)} سجل بنجاح.
                    </p>
                  )}

                  {updateResults.filter((u) => !u.ok).length > 0 && (
                    <ResultGroup title="فشل تحديثها" tone="invalid">
                      {updateResults
                        .filter((u) => !u.ok)
                        .map((u) => (
                          <div key={u.rowNumber} className="px-3 py-2 text-sm">
                            <span className="font-medium">{u.fullName}</span>
                            {' — '}
                            <span className="text-muted-foreground">{u.error}</span>
                          </div>
                        ))}
                    </ResultGroup>
                  )}

                  <p className="text-xs text-muted-foreground">
                    انتهى هذا الاستيراد. اضغطي "مقارنة ببيانات النظام الحالية" أعلاه مرة أخرى
                    للتأكد من عدم تبقّي أي شيء.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

const TONE_STYLES = {
  new: 'bg-paid-bg text-paid',
  changed: 'bg-due-bg text-due',
  invalid: 'bg-overdue-bg text-overdue',
  neutral: 'bg-muted text-muted-foreground',
} as const

function CountPill({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: keyof typeof TONE_STYLES
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${TONE_STYLES[tone]}`}>
      {label} · {num(count)}
    </span>
  )
}

function ResultGroup({
  title,
  tone,
  children,
}: {
  title: string
  tone: keyof typeof TONE_STYLES
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className={`px-3 py-1.5 text-xs font-medium ${TONE_STYLES[tone]}`}>{title}</div>
      <div className="divide-y divide-border max-h-64 overflow-auto">{children}</div>
    </div>
  )
}
