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

// ============================================================
// C10 — edit an existing student. (Creating a new one reuses C3's
// commitNewStudents from studentImport.ts — see AdminStudentForm.tsx —
// since a manual "add one student" and an Excel-imported "new" row need
// exactly the same account-creation machinery, not a second copy of it.)
// ============================================================

export interface StudentFormFields {
  fullName: string
  studentNumber: string
  loginId: string
  gradeLevel: string
  classSection: string
  guardianName: string
  guardianPhone: string
}

/** Postgres's unique-violation code, surfaced as a readable Arabic message
 * instead of a raw constraint-name error — this is genuinely the safer
 * way to catch a login_id/student_number collision anyway (checking first
 * and writing second would leave a race window; the constraint is the
 * real, atomic check). */
function friendlyStudentError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error('رقم الدخول أو الرقم الأكاديمي مستخدم بالفعل لطالبة أخرى.')
  }
  return new Error(error.message)
}

export async function updateStudentRecord(id: string, fields: StudentFormFields): Promise<void> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fields.fullName, login_id: fields.loginId })
    .eq('id', id)
  if (profileError) throw friendlyStudentError(profileError)

  const { error: studentError } = await supabase
    .from('students')
    .update({
      student_number: fields.studentNumber,
      grade_level: fields.gradeLevel,
      class_section: fields.classSection,
      guardian_name: fields.guardianName || null,
      guardian_phone: fields.guardianPhone || null,
    })
    .eq('id', id)
  if (studentError) throw friendlyStudentError(studentError)
}
