// Tutorial papers — C15.
//
// `tutorial_papers` and its Storage bucket are both openly readable by any
// authenticated user (RLS: "authenticated users read tutorial papers" —
// unlike payment screenshots, this is ordinary study material, not
// sensitive personal data). Still kept in a *private* bucket rather than
// public, though: every other piece of data access in this app requires
// authentication, and a public bucket would be the one silent exception —
// consistent with the payment-screenshots precedent from C7, just with a
// broader read policy.
import { supabase } from './supabase'
import { deleteSubject } from './subjects'

const BUCKET = 'tutorial-papers'
const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20MB — generous for a scanned worksheet/chapter, still a real ceiling against an accidental huge upload over a slow connection

export interface TutorialPaper {
  id: string
  subjectId: string
  title: string
  filePath: string
  createdAt: string
}

export interface TutorialSubjectSummary {
  subjectId: string
  name: string
  paperCount: number
}

/** Subjects for a given grade level, each with its paper count. Used by
 * both the Dashboard's quick list (D1) and the full Tutorial Papers screen
 * (D3). `subjects` and `tutorial_papers` are both openly readable to any
 * authenticated user (schema_and_rls.sql — ordinary study material, not
 * restricted like fees/marks/salaries), so scoping to "her own subjects"
 * happens here client-side via grade_level, not through RLS. */
export async function fetchSubjectsWithPaperCounts(gradeLevel: string): Promise<TutorialSubjectSummary[]> {
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('grade_level', gradeLevel)
  if (subjectsError) throw subjectsError
  if (!subjects || subjects.length === 0) return []

  const subjectIds = subjects.map((s) => s.id)
  const { data: papers, error: papersError } = await supabase
    .from('tutorial_papers')
    .select('subject_id')
    .in('subject_id', subjectIds)
  if (papersError) throw papersError

  const counts = new Map<string, number>()
  for (const p of papers ?? []) {
    counts.set(p.subject_id, (counts.get(p.subject_id) ?? 0) + 1)
  }

  return subjects.map((s) => ({
    subjectId: s.id,
    name: s.name,
    paperCount: counts.get(s.id) ?? 0,
  }))
}

export async function fetchTutorialPapers(subjectId: string): Promise<TutorialPaper[]> {
  const { data, error } = await supabase
    .from('tutorial_papers')
    .select('id, subject_id, title, file_path, created_at')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((p) => ({
    id: p.id,
    subjectId: p.subject_id,
    title: p.title,
    filePath: p.file_path,
    createdAt: p.created_at,
  }))
}

export function validatePaperFile(file: File): string | null {
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'يجب أن يكون الملف بصيغة PDF.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'حجم الملف أكبر من الحد المسموح به (20 ميغابايت).'
  }
  return null
}

/** Uploads the file first, then inserts the row — if the row insert fails,
 * the just-uploaded file is removed so nothing orphaned is left behind.
 * The reverse order (row first) would risk the worse failure mode: a
 * DB row other students can see, pointing at a file that was never
 * actually saved. Same rollback principle as C3's account creation. */
export async function uploadTutorialPaper(
  subjectId: string,
  title: string,
  file: File,
  uploadedBy: string,
): Promise<void> {
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `${subjectId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/pdf' })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('tutorial_papers').insert({
    subject_id: subjectId,
    title,
    file_path: path,
    uploaded_by: uploadedBy,
  })
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path])
    throw insertError
  }
}

/** Deletes the DB row before the Storage object, deliberately — if the
 * later Storage removal fails, the result is an invisible orphaned file
 * (wasted space, not user-facing). The reverse order risks the opposite:
 * a row still visible to every authenticated user, pointing at a file
 * that's already gone. */
export async function deleteTutorialPaper(paper: TutorialPaper): Promise<void> {
  const { error } = await supabase.from('tutorial_papers').delete().eq('id', paper.id)
  if (error) throw error
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([paper.filePath])
  if (removeError) {
    console.error('deleteTutorialPaper: DB row removed but Storage file removal failed', paper.filePath, removeError)
  }
}

export async function createSignedPaperUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 300)
  if (error) {
    console.error('createSignedPaperUrl failed for', filePath, error)
    return null
  }
  return data?.signedUrl ?? null
}

/** Subjects cascade-delete their `tutorial_papers` rows automatically
 * (on delete cascade) — but cascade only removes the DB rows, never the
 * actual Storage objects, which would otherwise linger as orphaned files
 * nothing references anymore. Deletes the subject *first* (still fails
 * cleanly with a clear message if `marks`/`timetables` reference it — see
 * deleteSubject) and only cleans up Storage after that succeeds; see the
 * comment inside for why that order matters. */
export async function deleteSubjectAndPapers(subjectId: string): Promise<void> {
  // Fetch paths first (read-only), then attempt the subject delete itself
  // BEFORE touching Storage — deleteSubject either fails cleanly with
  // nothing changed (blocked by a marks/timetables RESTRICT reference) or
  // succeeds and cascades the tutorial_papers rows away in the same
  // statement. Only on success is it safe to remove the files those rows
  // pointed to. Deleting the files first (the original, wrong order) would
  // mean a failed subject deletion still leaves tutorial_papers rows —
  // visible to every authenticated student — pointing at files that no
  // longer exist.
  const papers = await fetchTutorialPapers(subjectId)
  await deleteSubject(subjectId)
  if (papers.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(papers.map((p) => p.filePath))
    if (error) {
      console.error('deleteSubjectAndPapers: subject deleted, but failed to remove some Storage files', subjectId, error)
    }
  }
}
