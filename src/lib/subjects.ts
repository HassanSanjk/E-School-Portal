// Subject catalog — shared across marks (C12), timetables (C13), and
// eventually C15's subject CRUD. Originally lived inside marks.ts, pulled
// out here since it's no longer a marks-only concern.
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
