// Timetable entry — C13.
//
// Sudan's actual school-week convention turned out to be genuinely
// disputed across sources when checked (Saturday-Wednesday per one
// reference, Sunday-Thursday per a more recent 2017 government schools
// directive per another) — rather than guess wrong for this specific
// school, every day is offered with its correct, unambiguous Arabic name;
// the admin (who obviously knows her own school's real week) just picks
// whichever ones apply. Storage uses JavaScript's native Date.getDay()
// convention (0 = Sunday ... 6 = Saturday), matching a globally-recognized
// standard rather than an invented one, and lines up with "Sunday is the
// first day of the week" (Yawmul Ahad) in the Islamic calendar — so the
// UI lists days starting Sunday too. See DAY_OPTIONS in
// AdminTimetableEntry.tsx for the actual label mapping.
import { supabase } from './supabase'

export interface NewTimetableEntry {
  teacherId: string
  subjectId: string
  gradeLevel: string
  classSection: string
  dayOfWeek: number
  period: number
  room: string
}

export interface ScheduleConflict {
  subjectName: string
  gradeLevel?: string
  classSection?: string
  teacherName?: string
}

interface ConflictRow {
  subject_id: string
  grade_level: string
  class_section: string
  teacher_id: string
  subjects: { name: string } | { name: string }[] | null
  teachers:
    | { profiles: { full_name: string } | { full_name: string }[] | null }
    | { profiles: { full_name: string } | { full_name: string }[] | null }[]
    | null
}

function subjectNameOf(row: ConflictRow): string {
  const s = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects
  return s?.name ?? ''
}

function teacherNameOf(row: ConflictRow): string {
  const t = Array.isArray(row.teachers) ? row.teachers[0] : row.teachers
  const profile = t ? (Array.isArray(t.profiles) ? t.profiles[0] : t.profiles) : null
  return profile?.full_name ?? ''
}

/** Nothing in the schema stops a teacher being booked twice at the same
 * day+period, or a class having two different lessons at once — checked
 * client-side before every insert so either kind of conflict gets a clear,
 * informed warning instead of a silent double-booking. Not a hard block:
 * team-teaching or a deliberate correction are legitimate, rare cases. */
export async function checkScheduleConflicts(
  entry: Pick<NewTimetableEntry, 'teacherId' | 'gradeLevel' | 'classSection' | 'dayOfWeek' | 'period'>,
): Promise<{ teacherConflict: ScheduleConflict | null; classConflict: ScheduleConflict | null }> {
  const [teacherResult, classResult] = await Promise.all([
    supabase
      .from('timetables')
      .select('subject_id, grade_level, class_section, teacher_id, subjects(name)')
      .eq('teacher_id', entry.teacherId)
      .eq('day_of_week', entry.dayOfWeek)
      .eq('period', entry.period)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('timetables')
      .select('subject_id, grade_level, class_section, teacher_id, subjects(name), teachers(profiles(full_name))')
      .eq('grade_level', entry.gradeLevel)
      .eq('class_section', entry.classSection)
      .eq('day_of_week', entry.dayOfWeek)
      .eq('period', entry.period)
      .limit(1)
      .maybeSingle(),
  ])

  if (teacherResult.error) throw teacherResult.error
  if (classResult.error) throw classResult.error

  const teacherConflict = teacherResult.data
    ? {
        subjectName: subjectNameOf(teacherResult.data as unknown as ConflictRow),
        gradeLevel: (teacherResult.data as unknown as ConflictRow).grade_level,
        classSection: (teacherResult.data as unknown as ConflictRow).class_section,
      }
    : null

  const classConflict = classResult.data
    ? {
        subjectName: subjectNameOf(classResult.data as unknown as ConflictRow),
        teacherName: teacherNameOf(classResult.data as unknown as ConflictRow),
      }
    : null

  return { teacherConflict, classConflict }
}

export async function createTimetableEntry(entry: NewTimetableEntry): Promise<void> {
  const { error } = await supabase.from('timetables').insert({
    teacher_id: entry.teacherId,
    subject_id: entry.subjectId,
    grade_level: entry.gradeLevel,
    class_section: entry.classSection,
    day_of_week: entry.dayOfWeek,
    period: entry.period,
    room: entry.room || null,
  })
  if (error) throw error
}
