// Excel import — C2 (preview only).
//
// C1 parses a spreadsheet generically, with no idea which column means
// what. This file is where that gets resolved: the admin maps each
// detected column onto a known `students`/`profiles` field, and the
// mapped rows get diffed against what's already live in Supabase. Still
// no writes here — this only reads `students`/`profiles` for comparison.
// C3 is where new/changed rows actually get committed.
import type { ParsedSheet } from './excelImport'
import { supabase } from './supabase'

export type StudentField =
  | 'student_number'
  | 'login_id'
  | 'full_name'
  | 'grade_level'
  | 'class_section'
  | 'guardian_name'
  | 'guardian_phone'

export interface StudentFieldDef {
  key: StudentField
  label: string
  required: boolean
  /** Rough keywords for auto-guessing which detected column this is —
   * always overridable by the admin, never trusted blindly. */
  guessKeywords: string[]
}

// `student_number` is the matching key C3 will use ("update existing ones
// by matching on student_number" per IMPLEMENTATION_TASK_LIST.md), so it's
// required here too — there's nothing to diff against without it.
// `full_name` is required for the preview to mean anything to a human
// reading it. Everything else is optional: a real roster may not carry
// every field on day one.
export const STUDENT_FIELDS: StudentFieldDef[] = [
  {
    key: 'student_number',
    label: 'الرقم الأكاديمي',
    required: true,
    guessKeywords: ['رقم اكاديمي', 'رقم الطالبة', 'الرقم الأكاديمي', 'student number', 'student_number'],
  },
  {
    key: 'full_name',
    label: 'اسم الطالبة',
    required: true,
    guessKeywords: ['اسم الطالبة', 'الاسم الكامل', 'اسم كامل', 'full name', 'name'],
  },
  {
    key: 'login_id',
    label: 'رقم الدخول',
    required: false,
    guessKeywords: ['رقم الدخول', 'login', 'معرف الدخول'],
  },
  {
    key: 'grade_level',
    label: 'الصف',
    required: false,
    guessKeywords: ['الصف', 'المستوى', 'grade'],
  },
  {
    key: 'class_section',
    label: 'الشعبة',
    required: false,
    guessKeywords: ['الشعبة', 'الفصل', 'section'],
  },
  {
    key: 'guardian_name',
    label: 'اسم ولي الأمر',
    required: false,
    guessKeywords: ['اسم ولي الأمر', 'ولي الأمر', 'guardian name'],
  },
  {
    key: 'guardian_phone',
    label: 'هاتف ولي الأمر',
    required: false,
    guessKeywords: ['هاتف ولي الأمر', 'رقم الهاتف', 'الهاتف', 'phone'],
  },
]

// Fields whose value differences actually get shown as a "changed" diff.
// student_number is excluded — it's the match key, not a compared field.
const COMPARABLE_FIELDS = STUDENT_FIELDS.filter((f) => f.key !== 'student_number')

export type ColumnMapping = Partial<Record<StudentField, string>>

/** Best-effort auto-mapping from detected headers to fields, purely a
 * starting point the admin reviews and can change — never applied silently. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')

  for (const field of STUDENT_FIELDS) {
    const match = headers.find((h) =>
      field.guessKeywords.some((kw) => normalize(h).includes(normalize(kw))),
    )
    if (match) mapping[field.key] = match
  }
  return mapping
}

function cell(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

export interface MappedRow {
  rowNumber: number // 1-based position among data rows, for display only
  values: Partial<Record<StudentField, string>>
}

export function applyMapping(sheet: ParsedSheet, mapping: ColumnMapping): MappedRow[] {
  return sheet.rows.map((row, i) => {
    const values: Partial<Record<StudentField, string>> = {}
    for (const field of STUDENT_FIELDS) {
      const header = mapping[field.key]
      if (header) values[field.key] = cell(row[header])
    }
    return { rowNumber: i + 1, values }
  })
}

export interface ExistingStudent {
  id: string
  studentNumber: string
  loginId: string
  fullName: string
  gradeLevel: string
  classSection: string
  guardianName: string
  guardianPhone: string
}

/** Reads every current student for comparison. Admin-only RLS covers this —
 * no service_role needed, this runs as the signed-in admin's own client. */
export async function fetchExistingStudents(): Promise<ExistingStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select(
      'id, student_number, grade_level, class_section, guardian_name, guardian_phone, profiles(full_name, login_id)',
    )

  if (error) throw error

  return (data ?? []).map((row) => {
    // Nested embed comes back as an object (1:1 FK) but supabase-js types
    // it defensively as possibly-array; normalize either shape.
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      studentNumber: row.student_number ?? '',
      loginId: profile?.login_id ?? '',
      fullName: profile?.full_name ?? '',
      gradeLevel: row.grade_level ?? '',
      classSection: row.class_section ?? '',
      guardianName: row.guardian_name ?? '',
      guardianPhone: row.guardian_phone ?? '',
    }
  })
}

function existingValue(existing: ExistingStudent, field: StudentField): string {
  switch (field) {
    case 'student_number':
      return existing.studentNumber
    case 'login_id':
      return existing.loginId
    case 'full_name':
      return existing.fullName
    case 'grade_level':
      return existing.gradeLevel
    case 'class_section':
      return existing.classSection
    case 'guardian_name':
      return existing.guardianName
    case 'guardian_phone':
      return existing.guardianPhone
  }
}

export type RowStatus = 'new' | 'changed' | 'unchanged' | 'invalid'

export interface FieldChange {
  field: StudentField
  label: string
  before: string
  after: string
}

export interface RowResult {
  rowNumber: number
  status: RowStatus
  studentNumber: string
  fullName: string
  changes: FieldChange[]
  issue?: string
}

export interface DiffResult {
  results: RowResult[]
  notInFile: ExistingStudent[]
  counts: Record<RowStatus, number>
}

export function diffAgainstExisting(mappedRows: MappedRow[], existing: ExistingStudent[]): DiffResult {
  const byStudentNumber = new Map(existing.map((s) => [s.studentNumber, s]))
  const seenInFile = new Set<string>()
  const seenTwiceInFile = new Set<string>()

  // First pass: detect duplicate student_number values within the file
  // itself — otherwise C3 wouldn't know which of two rows to trust.
  for (const row of mappedRows) {
    const sn = row.values.student_number ?? ''
    if (!sn) continue
    if (seenInFile.has(sn)) seenTwiceInFile.add(sn)
    seenInFile.add(sn)
  }

  const results: RowResult[] = mappedRows.map((row) => {
    const sn = row.values.student_number ?? ''
    const fullName = row.values.full_name ?? ''

    if (!sn || !fullName) {
      return {
        rowNumber: row.rowNumber,
        status: 'invalid',
        studentNumber: sn,
        fullName,
        changes: [],
        issue: !sn ? 'الرقم الأكاديمي فارغ.' : 'اسم الطالبة فارغ.',
      }
    }
    if (seenTwiceInFile.has(sn)) {
      return {
        rowNumber: row.rowNumber,
        status: 'invalid',
        studentNumber: sn,
        fullName,
        changes: [],
        issue: `الرقم الأكاديمي "${sn}" مكرر أكثر من مرة داخل هذا الملف.`,
      }
    }

    const existingStudent = byStudentNumber.get(sn)
    if (!existingStudent) {
      return { rowNumber: row.rowNumber, status: 'new', studentNumber: sn, fullName, changes: [] }
    }

    const changes: FieldChange[] = []
    for (const field of COMPARABLE_FIELDS) {
      if (!(field.key in row.values)) continue // column wasn't mapped, nothing to compare
      const after = row.values[field.key] ?? ''
      const before = existingValue(existingStudent, field.key)
      if (after !== before) {
        changes.push({ field: field.key, label: field.label, before, after })
      }
    }

    return {
      rowNumber: row.rowNumber,
      status: changes.length > 0 ? 'changed' : 'unchanged',
      studentNumber: sn,
      fullName,
      changes,
    }
  })

  const inFileNumbers = new Set(results.map((r) => r.studentNumber).filter(Boolean))
  const notInFile = existing.filter((s) => !inFileNumbers.has(s.studentNumber))

  const counts: Record<RowStatus, number> = { new: 0, changed: 0, unchanged: 0, invalid: 0 }
  for (const r of results) counts[r.status]++

  return { results, notInFile, counts }
}
