// Excel import — C1 (parse only).
//
// Scope, per IMPLEMENTATION_TASK_LIST.md: get the school's spreadsheet
// parsed and into memory client-side, correctly, and nothing more. No
// mapping onto known table columns (students/fees/etc.) and no Supabase
// writes happen here — that's C2 (preview against existing data) and C3
// (commit) respectively.
//
// The parser stays generic on purpose: we don't have a real sample of the
// school's actual file yet, so hard-coding expected column names here
// would be a guess wearing a spec's clothes. Row 1 is treated as the
// header row, whatever labels the school actually used, and every other
// row becomes a plain object keyed by those headers. C2 is where detected
// columns get mapped onto `students` fields.
import { read, utils, type WorkBook } from 'xlsx'

export interface ParsedSheet {
  sheetName: string
  headers: string[]
  rows: Record<string, string | number | boolean>[]
}

export interface OpenedWorkbook {
  fileName: string
  sheetNames: string[]
  workbook: WorkBook
}

export class ExcelParseError extends Error {}

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.csv']

export function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** Read a File (from an <input type="file"> or a drop event) into an opened
 * SheetJS workbook. Doesn't extract any sheet yet — the caller picks one,
 * defaulting to the first. */
export async function openWorkbookFile(file: File): Promise<OpenedWorkbook> {
  if (!hasAcceptedExtension(file.name)) {
    throw new ExcelParseError('صيغة الملف غير مدعومة. الصيغ المقبولة: xlsx، xls، xlsm، csv.')
  }

  const buffer = await file.arrayBuffer()

  let workbook: WorkBook
  try {
    workbook = read(buffer, { type: 'array' })
  } catch {
    throw new ExcelParseError('تعذّرت قراءة هذا الملف. تأكّدي أنه ملف إكسل سليم وغير تالف.')
  }

  if (workbook.SheetNames.length === 0) {
    throw new ExcelParseError('هذا الملف لا يحتوي على أي ورقة عمل.')
  }

  return { fileName: file.name, sheetNames: workbook.SheetNames, workbook }
}

/**
 * Extract one sheet as headered rows.
 *
 * Two passes on purpose: `header: 1` first to read the raw grid (so a
 * genuinely empty sheet is detected cleanly, and so a blank header cell
 * gets a stable fallback name instead of being silently dropped), then a
 * second pass keyed by that resolved header list.
 */
export function extractSheet(workbook: WorkBook, sheetName: string): ParsedSheet {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new ExcelParseError(`لا توجد ورقة باسم "${sheetName}" في هذا الملف.`)
  }

  const rawRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
  if (rawRows.length === 0) {
    throw new ExcelParseError('ورقة العمل هذه فارغة.')
  }

  const headerRow = rawRows[0]
  const headers = headerRow.map((cell, i) => {
    const label = cell === undefined || cell === null ? '' : String(cell).trim()
    return label === '' ? `عمود ${i + 1}` : label
  })

  if (rawRows.length === 1) {
    // Header row only, no data rows beneath it — not an error, just empty.
    return { sheetName, headers, rows: [] }
  }

  const rows = utils.sheet_to_json<Record<string, string | number | boolean>>(sheet, {
    header: headers,
    range: 1, // skip the header row itself; already consumed above
    defval: '',
    blankrows: false,
  })

  return { sheetName, headers, rows }
}
