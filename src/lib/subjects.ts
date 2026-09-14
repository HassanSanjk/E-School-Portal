// Subject catalog — shared across marks (C12), timetables (C13), and
// C15's subject CRUD + tutorial papers. Originally lived inside marks.ts,
// pulled out here since it's no longer a marks-only concern.
import { supabase } from './supabase'

export interface Subject {
  id: string
  name: string
  gradeLevel: string
}

export async function fetchSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('id, name, grade_level')
  if (error) throw error
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, gradeLevel: s.grade_level ?? '' }))
}

export interface SubjectFields {
  name: string
  gradeLevel: string
}

export async function createSubject(input: SubjectFields): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ name: input.name, grade_level: input.gradeLevel })
    .select('id, name, grade_level')
    .single()
  if (error) throw error
  return { id: data.id, name: data.name, gradeLevel: data.grade_level }
}

export async function updateSubject(id: string, input: SubjectFields): Promise<void> {
  const { error } = await supabase
    .from('subjects')
    .update({ name: input.name, grade_level: input.gradeLevel })
    .eq('id', id)
  if (error) throw error
}

/** `marks.subject_id`/`timetables.subject_id` both `on delete restrict` —
 * deleting a subject already used there fails at the database with a
 * foreign-key-violation, surfaced here as a plain Arabic explanation
 * instead of a raw constraint-name error. `tutorial_papers.subject_id` is
 * `on delete cascade` instead, which is exactly why the caller must clean
 * up that subject's Storage files *before* calling this — cascade deletes
 * the DB rows, never the actual files, which would otherwise be
 * orphaned. See deleteSubjectAndPapers in tutorialPapers.ts. */
export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error('لا يمكن حذف هذه المادة لأنها مستخدمة في درجات أو جدول دراسي حالي.')
    }
    throw error
  }
}
