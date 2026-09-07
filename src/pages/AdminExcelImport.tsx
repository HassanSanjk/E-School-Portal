import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Upload, FileText, X, AlertTriangle } from '@/components/icons'
import { num } from '@/lib/format'
import {
  openWorkbookFile,
  extractSheet,
  ExcelParseError,
  type OpenedWorkbook,
  type ParsedSheet,
} from '@/lib/excelImport'

// C1 — parse only. Upload the school's Excel file, read it into memory with
// SheetJS, and confirm the rows came through correctly (console + a plain
// preview table). No comparison against existing students and no database
// writes here — that's C2/C3.
export function AdminExcelImport() {
  const [opened, setOpened] = useState<OpenedWorkbook | null>(null)
  const [parsed, setParsed] = useState<ParsedSheet | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const sheetSelectId = useId()

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

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-3xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">استيراد بيانات الطالبات من إكسل</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ارفعي ملف الإكسل لقراءة صفوفه أولًا. هذه الخطوة للتأكد من قراءة البيانات بشكل صحيح
            فقط — لن يُحفظ شيء بعد.
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
      </div>
    </div>
  )
}
