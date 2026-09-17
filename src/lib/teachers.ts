// Teacher management — C11.
//
// Structurally similar to students.ts, but genuinely simpler: no
// guardian fields, no Excel-import overlap, no NOT NULL constraints on
// `teachers` beyond the primary key (subject_specialty is nullable).
import { supabase } from './supabase'

export interface ExistingTeacher {
  id: string
  loginId: string
  fullName: string
  subjectSpecialty: string
}

/** Reads every current teacher. Admin-only RLS covers this — no
 * service_role needed, this runs as the signed-in admin's own client. */
export async function fetchExistingTeachers(): Promise<ExistingTeacher[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, subject_specialty, profiles(full_name, login_id)')

  if (error) throw error

  return (data ?? []).map((row) => {
    // Nested embed comes back as an object (1:1 FK) but supabase-js types
    // it defensively as possibly-array; normalize either shape.
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      loginId: profile?.login_id ?? '',
      fullName: profile?.full_name ?? '',
      subjectSpecialty: row.subject_specialty ?? '',
    }
  })
}

/** Postgres's unique-violation code, surfaced as a readable Arabic message
 * instead of a raw constraint-name error — checking first and writing
 * second would leave a race window anyway, so relying on the constraint
 * itself (and translating its error) is the more correct approach, not
 * just the simpler one. Same reasoning as students.ts's version. */
function friendlyTeacherError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error('رقم الدخول مستخدم بالفعل لحساب آخر.')
  }
  return new Error(error.message)
}

export interface TeacherFormFields {
  fullName: string
  loginId: string
  subjectSpecialty: string
}

export async function updateTeacherRecord(id: string, fields: TeacherFormFields): Promise<void> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fields.fullName, login_id: fields.loginId })
    .eq('id', id)
  if (profileError) throw friendlyTeacherError(profileError)

  const { error: teacherError } = await supabase
    .from('teachers')
    .update({ subject_specialty: fields.subjectSpecialty || null })
    .eq('id', id)
  if (teacherError) throw friendlyTeacherError(teacherError)
}

// ============================================================
// D7 — Teacher Dashboard. Her name already comes from useAuth()'s own
// profile; this is only for the one extra field (subject_specialty) that
// lives on `teachers` instead of `profiles`.
// ============================================================

export interface MyTeacherInfo {
  subjectSpecialty: string
}

/** RLS ("teacher reads own row", id = auth.uid()) scopes this to herself. */
export async function fetchMyTeacherInfo(teacherId: string): Promise<MyTeacherInfo> {
  const { data, error } = await supabase.from('teachers').select('subject_specialty').eq('id', teacherId).single()
  if (error) throw error
  return { subjectSpecialty: data.subject_specialty ?? '' }
}

// ============================================================
// New teacher creation reuses the generalized admin-bulk-import-students
// Edge Function (originally C3's student-only import commit, extended for
// C11 with a `role` field) rather than a second copy of the same
// account-creation/PIN-generation/rollback logic.
// ============================================================

export interface NewTeacherPayload {
  fullName: string
  loginId: string
  subjectSpecialty: string
}

export interface TeacherCreateResult {
  fullName: string
  status: 'created' | 'failed'
  loginId?: string
  pin?: string
  error?: string
}

export async function commitNewTeacher(payload: NewTeacherPayload): Promise<TeacherCreateResult> {
  const { data, error } = await supabase.functions.invoke('admin-bulk-import-students', {
    body: {
      rows: [
        {
          role: 'teacher',
          fullName: payload.fullName,
          loginId: payload.loginId,
          subjectSpecialty: payload.subjectSpecialty,
        },
      ],
    },
  })
  if (error) throw error
  const results = (data?.results ?? []) as TeacherCreateResult[]
  const result = results[0]
  if (!result) throw new Error('لم يتم استلام أي نتيجة من الخادم.')
  return result
}
