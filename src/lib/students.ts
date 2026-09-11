// Shared student-directory read. Originally lived in studentImport.ts
// (written for C2's diff-against-existing-data step), extracted here for
// C9 since "every current student" is now a read two unrelated features
// need — a general student-management screen shouldn't depend on a module
// named for Excel import.
import { supabase } from './supabase'

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

/** Reads every current student. Admin-only RLS covers this — no
 * service_role needed, this runs as the signed-in admin's own client. */
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
