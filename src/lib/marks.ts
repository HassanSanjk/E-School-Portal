// Marks — C12 (admin entry) + D2 (student read).
import { supabase } from './supabase'

/** Existing assessment_label values already used for this exact
 * subject+year — the "dropdown-with-freeform-option" data source. Scoped
 * deliberately narrow: a label like "الاختبار الأول" only makes sense to
 * suggest within the same subject/year it was actually used in, not
 * globally across every subject the school has ever taught. */
export async function fetchAssessmentLabels(subjectId: string, academicYear: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('marks')
    .select('assessment_label')
    .eq('subject_id', subjectId)
    .eq('academic_year', academicYear)
  if (error) throw error
  return [...new Set((data ?? []).map((m) => m.assessment_label))].sort()
}

/** Nothing in the schema stops the exact same (student, subject, year,
 * assessment_label) combination from being entered twice — checked before
 * every submit so an accidental double-click or a genuine re-entry both
 * get a clear, informed choice instead of a silent duplicate. */
export async function findExistingMark(
  studentId: string,
  subjectId: string,
  academicYear: string,
  assessmentLabel: string,
): Promise<{ score: number; maxScore: number } | null> {
  const { data, error } = await supabase
    .from('marks')
    .select('score, max_score')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .eq('academic_year', academicYear)
    .eq('assessment_label', assessmentLabel)
    .maybeSingle()
  if (error) throw error
  return data ? { score: data.score, maxScore: data.max_score } : null
}

export interface NewMarkInput {
  studentId: string
  subjectId: string
  academicYear: string
  assessmentLabel: string
  score: number
  maxScore: number
  enteredBy: string
}

export async function createMark(input: NewMarkInput): Promise<void> {
  const { error } = await supabase.from('marks').insert({
    student_id: input.studentId,
    subject_id: input.subjectId,
    academic_year: input.academicYear,
    assessment_label: input.assessmentLabel,
    score: input.score,
    max_score: input.maxScore,
    entered_by: input.enteredBy,
  })
  if (error) throw error
}

// ============================================================
// D2 — Student Marks screen. Admin-only in C12 was about *writing*;
// reading her own marks back is the student's own RLS policy ("student
// reads own marks", student_id = auth.uid()) — this doesn't touch the
// still-open teacher-access-to-marks question at all.
// ============================================================

export interface MarksRow {
  id: string
  subjectId: string
  subjectName: string
  academicYear: string
  assessmentLabel: string
  score: number
  maxScore: number
}

/** Every mark ever recorded for one student, across every subject and
 * year — the screen itself groups/filters this client-side (by academic
 * year, then by subject) rather than this function taking those as
 * params, since the whole set is small per student (a handful of subjects
 * × 2-3 assessments × however many years) and the screen needs to know
 * which years exist at all before it can offer a year filter. */
export async function fetchMyMarks(studentId: string): Promise<MarksRow[]> {
  const { data, error } = await supabase
    .from('marks')
    .select('id, subject_id, academic_year, assessment_label, score, max_score, subjects(name)')
    .eq('student_id', studentId)
  if (error) throw error

  return (data ?? []).map((m) => {
    const subject = Array.isArray(m.subjects) ? m.subjects[0] : m.subjects
    return {
      id: m.id,
      subjectId: m.subject_id,
      subjectName: subject?.name ?? '',
      academicYear: m.academic_year,
      assessmentLabel: m.assessment_label,
      score: m.score,
      maxScore: m.max_score,
    }
  })
}
