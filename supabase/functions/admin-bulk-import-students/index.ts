// admin-bulk-import-students
//
// Admin-only. C3's commit step for *new* students found by the Excel
// import (C1/C2). A client can never create another user's auth account
// directly — Supabase's Admin API (auth.admin.createUser) only works with
// an elevated key — so this has to be server-side, the same reason
// admin-reset-pin exists.
//
// "Changed" rows (existing students, just updated fields) do NOT go
// through this function — RLS already lets an authenticated admin update
// `students`/`profiles` directly, so the client does that itself. This
// function exists only for the part a client fundamentally cannot do:
// minting a new login.
//
// Auth model — identical two-layer pattern to admin-reset-pin:
//   1. Platform-level: verify_jwt = true rejects any request with no valid
//      session before this code runs.
//   2. In code: the caller's own profiles.role must be 'admin'.
//
// Same service_role-over-secret-key choice as admin-reset-pin, for the
// same reason: every call in this function that touches
// auth.admin.* should use the key format already confirmed reliable for
// Admin API calls on this project as of Sep 2026.
//
// Defense in depth, on purpose: this function does NOT trust the client's
// diff. It independently re-checks student_number/login_id uniqueness
// against the live database before creating anything — a stale preview
// (opened a while ago, or a second admin importing concurrently) should
// never be able to create a duplicate.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PUBLISHABLE_KEY = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')!)['default']

console.log(
  'admin-bulk-import-students boot: SUPABASE_URL set:', !!SUPABASE_URL,
  '| SERVICE_ROLE_KEY length:', SERVICE_ROLE_KEY?.length ?? 0,
  '| PUBLISHABLE_KEY length:', PUBLISHABLE_KEY?.length ?? 0,
)

const MAX_ROWS_PER_REQUEST = 500 // generous headroom over this school's ~45 students

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface IncomingRow {
  studentNumber?: string
  fullName?: string
  loginId?: string
  gradeLevel?: string
  classSection?: string
  guardianName?: string
  guardianPhone?: string
}

interface RowResult {
  studentNumber: string
  fullName: string
  status: 'created' | 'skipped' | 'failed'
  loginId?: string
  pin?: string
  error?: string
}

/** 8 cryptographically random digits. Rejection-sampled (reject bytes
 * 250-255) so `byte % 10` isn't even the tiny bit biased a plain modulo
 * would be — costs nothing, removes the question entirely. */
function generatePin(): string {
  const digits: number[] = []
  while (digits.length < 8) {
    const byte = crypto.getRandomValues(new Uint8Array(1))[0]
    if (byte < 250) digits.push(byte % 10)
  }
  return digits.join('')
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const callerClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfileError || callerProfile?.role !== 'admin') {
      console.error(
        'admin-bulk-import-students: caller is not admin',
        user.id,
        callerProfile?.role ?? '(no profile row)',
      )
      return json({ error: 'Forbidden: admin role required' }, 403)
    }

    const body = await req.json().catch(() => null)
    const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : []

    if (rows.length === 0) {
      return json({ error: 'rows must be a non-empty array' }, 400)
    }
    if (rows.length > MAX_ROWS_PER_REQUEST) {
      return json({ error: `Too many rows in one request (max ${MAX_ROWS_PER_REQUEST})` }, 400)
    }

    // Pre-fetch current state once, up front, so uniqueness re-checks
    // below don't need a query per row.
    const [{ data: existingStudents, error: studentsErr }, { data: existingProfiles, error: profilesErr }] =
      await Promise.all([
        adminClient.from('students').select('student_number'),
        adminClient.from('profiles').select('login_id'),
      ])
    if (studentsErr || profilesErr) {
      console.error('admin-bulk-import-students: prefetch failed', studentsErr, profilesErr)
      return json({ error: 'Could not read current student/profile state' }, 500)
    }
    const existingStudentNumbers = new Set((existingStudents ?? []).map((s) => s.student_number))
    const existingLoginIds = new Set((existingProfiles ?? []).map((p) => p.login_id))

    const results: RowResult[] = []

    // Sequential on purpose: this is an admin-triggered, low-frequency,
    // small-batch (~45 students) operation, not a hot path — sequential
    // keeps behavior predictable and avoids hammering the Auth Admin API
    // with concurrent createUser calls.
    for (const raw of rows) {
      const studentNumber = clean(raw.studentNumber)
      const fullName = clean(raw.fullName)
      const loginId = clean(raw.loginId)
      const gradeLevel = clean(raw.gradeLevel)
      const classSection = clean(raw.classSection)
      const guardianName = clean(raw.guardianName)
      const guardianPhone = clean(raw.guardianPhone)

      if (!studentNumber || !fullName || !loginId || !gradeLevel || !classSection) {
        results.push({
          studentNumber: studentNumber || '(بلا رقم)',
          fullName,
          status: 'failed',
          error: 'حقل مطلوب مفقود (الرقم الأكاديمي، الاسم، رقم الدخول، الصف، أو الشعبة).',
        })
        continue
      }

      // Re-check against live state, not the client's (possibly stale)
      // diff — see file header.
      if (existingStudentNumbers.has(studentNumber)) {
        results.push({
          studentNumber,
          fullName,
          status: 'skipped',
          error: 'هذا الرقم الأكاديمي أصبح موجودًا بالفعل — تم تجاوزه لتفادي التكرار.',
        })
        continue
      }
      if (existingLoginIds.has(loginId)) {
        results.push({
          studentNumber,
          fullName,
          status: 'failed',
          error: `رقم الدخول "${loginId}" مستخدم بالفعل لحساب آخر.`,
        })
        continue
      }

      const pin = generatePin()
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: `${loginId}@school.internal`,
        password: pin,
        email_confirm: true,
      })

      if (createError || !created?.user) {
        console.error('admin-bulk-import-students: createUser failed', studentNumber, createError)
        results.push({
          studentNumber,
          fullName,
          status: 'failed',
          error: createError?.message ?? 'تعذّر إنشاء الحساب.',
        })
        continue
      }

      const newId = created.user.id

      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({ id: newId, login_id: loginId, role: 'student', full_name: fullName })

      const { error: studentError } = profileError
        ? { error: null } // don't attempt the second insert if the first already failed
        : await adminClient.from('students').insert({
            id: newId,
            student_number: studentNumber,
            grade_level: gradeLevel,
            class_section: classSection,
            guardian_name: guardianName || null,
            guardian_phone: guardianPhone || null,
          })

      if (profileError || studentError) {
        // Compensating rollback: deleting the auth user cascades to
        // profiles/students automatically (both FKs are `on delete
        // cascade`), so this alone fully undoes the partial write. Without
        // this, a failed row would leave an orphaned auth account
        // permanently squatting on that login_id, silently blocking every
        // future retry for that student.
        const { error: rollbackError } = await adminClient.auth.admin.deleteUser(newId)
        if (rollbackError) {
          console.error(
            'admin-bulk-import-students: ROLLBACK FAILED, orphaned auth user',
            newId,
            studentNumber,
            rollbackError,
          )
        }
        console.error(
          'admin-bulk-import-students: row insert failed after account creation',
          studentNumber,
          profileError ?? studentError,
        )
        results.push({
          studentNumber,
          fullName,
          status: 'failed',
          error: (profileError ?? studentError)?.message ?? 'فشل حفظ بيانات الطالبة بعد إنشاء الحساب.',
        })
        existingLoginIds.add(loginId) // just in case rollback failed — don't retry-collide in this same batch
        continue
      }

      existingStudentNumbers.add(studentNumber)
      existingLoginIds.add(loginId)
      results.push({ studentNumber, fullName, status: 'created', loginId, pin })
    }

    return json({ results })
  } catch (e) {
    console.error('admin-bulk-import-students: unexpected error', e)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
