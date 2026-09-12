export const SCHOOL_NAME_FULL = 'مدرسة إبن الجراح الثانوية الخاصة بنات'
export const SCHOOL_NAME_LINE_1 = 'مدرسة ابن الجراح'
export const SCHOOL_NAME_LINE_2 = 'الثانوية الخاصة بنات'
export const SCHOOL_NAME_SHORT = 'ابن الجراح'

/** e.g. "2026 / 2027" — assumes a school year starting in August, adjust
 * the month threshold if the real academic calendar differs. */
export function currentAcademicYearLabel(now: Date = new Date()): string {
  const year = now.getFullYear()
  const start = now.getMonth() >= 7 ? year : year - 1 // getMonth() is 0-indexed; 7 = August
  return `${start} / ${start + 1}`
}

/** The stored format for `academic_year` values (fees, marks): "2026-2027",
 * per SCHEMA_AND_ACCESS_MATRIX.md's own example — note this does NOT match
 * currentAcademicYearLabel()'s "2026 / 2027" display format above; that
 * helper is for display only and was never meant to generate a value fed
 * into a real academic_year column. First introduced in C4 (fee schedule),
 * reused as-is in C12 (marks entry) since both need the same validation. */
export const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/
