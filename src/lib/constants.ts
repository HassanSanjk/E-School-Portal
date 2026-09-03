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
