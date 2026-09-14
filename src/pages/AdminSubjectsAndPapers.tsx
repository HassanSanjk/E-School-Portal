import { useEffect, useId, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle, FileText, Upload, X } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { fetchSubjects, createSubject, updateSubject, type Subject, type SubjectFields } from '@/lib/subjects'
import {
  fetchTutorialPapers,
  uploadTutorialPaper,
  deleteTutorialPaper,
  deleteSubjectAndPapers,
  createSignedPaperUrl,
  validatePaperFile,
  type TutorialPaper,
} from '@/lib/tutorialPapers'

// C15 — the last Stage C task, and the one C12 (marks) and C13 (timetable)
// were actually waiting on: both need subjects to exist. Subjects get full
// CRUD per the task list's own wording; tutorial papers get upload + list
// + delete — "manage the subject list and upload PDFs against a subject"
// (figma_make_prompt.md) reads as more than upload-only once you can't
// see or remove what's already there, but there's no "edit" for a PDF —
// replacing one's content only ever means delete-and-reupload.
export function AdminSubjectsAndPapers() {
  const { session } = useAuth()
  const uploadedBy = session?.user.id

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editGrade, setEditGrade] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null)
  const [subjectDeleteError, setSubjectDeleteError] = useState<Record<string, string>>({})

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [papers, setPapers] = useState<TutorialPaper[]>([])
  const [isLoadingPapers, setIsLoadingPapers] = useState(false)
  const [papersError, setPapersError] = useState<string | null>(null)

  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [deletingPaperId, setDeletingPaperId] = useState<string | null>(null)
  const [paperDeleteError, setPaperDeleteError] = useState<Record<string, string>>({})
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  const newNameId = useId()
  const newGradeId = useId()
  const uploadTitleId = useId()
  const fileInputId = useId()

  useEffect(() => {
    loadSubjects()
  }, [])

  async function loadSubjects() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await fetchSubjects()
      setSubjects(data)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل المواد الدراسية.')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadPapers(subjectId: string) {
    setIsLoadingPapers(true)
    setPapersError(null)
    try {
      const data = await fetchTutorialPapers(subjectId)
      setPapers(data)
    } catch (e) {
      setPapersError(e instanceof Error ? e.message : 'تعذّر تحميل ملفات المادة.')
    } finally {
      setIsLoadingPapers(false)
    }
  }

  function selectSubject(id: string) {
    setSelectedSubjectId(id)
    setUploadTitle('')
    setUploadFile(null)
    setUploadError(null)
    loadPapers(id)
  }

  function validateSubject(fields: SubjectFields): string | null {
    if (!fields.name.trim()) return 'اسم المادة مطلوب.'
    if (!fields.gradeLevel.trim()) return 'الصف مطلوب.'
    return null
  }

  async function handleAddSubject() {
    const fields = { name: newName.trim(), gradeLevel: newGrade.trim() }
    const error = validateSubject(fields)
    if (error) {
      setAddError(error)
      return
    }
    setAddError(null)
    setIsAdding(true)
    try {
      const created = await createSubject(fields)
      setSubjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'ar')))
      setNewName('')
      setNewGrade('')
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'تعذّر إضافة المادة.')
    } finally {
      setIsAdding(false)
    }
  }

  function startEdit(subject: Subject) {
    setEditingId(subject.id)
    setEditName(subject.name)
    setEditGrade(subject.gradeLevel)
    setEditError(null)
  }

  async function saveEdit(id: string) {
    const fields = { name: editName.trim(), gradeLevel: editGrade.trim() }
    const error = validateSubject(fields)
    if (error) {
      setEditError(error)
      return
    }
    setEditError(null)
    setIsSavingEdit(true)
    try {
      await updateSubject(id, fields)
      setSubjects((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...fields } : s)).sort((a, b) => a.name.localeCompare(b.name, 'ar')),
      )
      setEditingId(null)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'تعذّر حفظ التعديلات.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleDeleteSubject(id: string) {
    setDeletingSubjectId(id)
    setSubjectDeleteError((prev) => ({ ...prev, [id]: '' }))
    try {
      await deleteSubjectAndPapers(id)
      setSubjects((prev) => prev.filter((s) => s.id !== id))
      if (selectedSubjectId === id) {
        setSelectedSubjectId(null)
        setPapers([])
      }
    } catch (e) {
      setSubjectDeleteError((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : 'تعذّر حذف المادة.' }))
    } finally {
      setDeletingSubjectId(null)
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) {
      const error = validatePaperFile(file)
      if (error) {
        setUploadError(error)
        setUploadFile(null)
        e.target.value = ''
        return
      }
    }
    setUploadError(null)
    setUploadFile(file)
  }

  async function handleUpload() {
    if (!selectedSubjectId) return
    if (!uploadTitle.trim()) {
      setUploadError('عنوان الملف مطلوب.')
      return
    }
    if (!uploadFile) {
      setUploadError('اختاري ملف PDF.')
      return
    }
    if (!uploadedBy) {
      setUploadError('تعذّر تحديد هوية المسؤول الحالي — أعيدي تسجيل الدخول.')
      return
    }
    setUploadError(null)
    setIsUploading(true)
    try {
      await uploadTutorialPaper(selectedSubjectId, uploadTitle.trim(), uploadFile, uploadedBy)
      setUploadTitle('')
      setUploadFile(null)
      await loadPapers(selectedSubjectId)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'تعذّر رفع الملف.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeletePaper(paper: TutorialPaper) {
    setDeletingPaperId(paper.id)
    setPaperDeleteError((prev) => ({ ...prev, [paper.id]: '' }))
    try {
      await deleteTutorialPaper(paper)
      setPapers((prev) => prev.filter((p) => p.id !== paper.id))
    } catch (e) {
      setPaperDeleteError((prev) => ({
        ...prev,
        [paper.id]: e instanceof Error ? e.message : 'تعذّر حذف الملف.',
      }))
    } finally {
      setDeletingPaperId(null)
    }
  }

  async function handlePreview(paper: TutorialPaper) {
    setPreviewingId(paper.id)
    try {
      const url = await createSignedPaperUrl(paper.filePath)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      else setPapersError('تعذّر فتح الملف.')
    } finally {
      setPreviewingId(null)
    }
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-2xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">المواد الدراسية وملفات التقوية</h1>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <Card className="p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-base">إضافة مادة</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={newNameId}>اسم المادة</FieldLabel>
                <Input id={newNameId} value={newName} onValueChange={setNewName} disabled={isAdding} />
              </Field>
              <Field>
                <FieldLabel htmlFor={newGradeId}>الصف</FieldLabel>
                <Input id={newGradeId} value={newGrade} onValueChange={setNewGrade} disabled={isAdding} />
              </Field>
            </div>
            {addError && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
            <Button type="button" onClick={handleAddSubject} disabled={isAdding}>
              {isAdding ? '...جارٍ الإضافة' : 'إضافة'}
            </Button>
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-base">المواد الحالية</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">...جارٍ التحميل</p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد مواد بعد.</p>
            ) : (
              subjects.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3 space-y-2">
                  {editingId === s.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editName} onValueChange={setEditName} disabled={isSavingEdit} />
                        <Input value={editGrade} onValueChange={setEditGrade} disabled={isSavingEdit} />
                      </div>
                      {editError && <p className="text-xs text-destructive">{editError}</p>}
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => saveEdit(s.id)} disabled={isSavingEdit}>
                          {isSavingEdit ? '...' : 'حفظ'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={isSavingEdit}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => selectSubject(s.id)}
                        className={`text-start flex-1 ${selectedSubjectId === s.id ? 'font-medium text-primary-soft' : ''}`}
                      >
                        {s.name} <span className="text-muted-foreground">({s.gradeLevel})</span>
                      </button>
                      <div className="flex gap-1 shrink-0">
                        <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(s)}>
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSubject(s.id)}
                          disabled={deletingSubjectId === s.id}
                        >
                          {deletingSubjectId === s.id ? '...' : 'حذف'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {subjectDeleteError[s.id] && <p className="text-xs text-destructive">{subjectDeleteError[s.id]}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {selectedSubject && (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">ملفات تقوية: {selectedSubject.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                <Field>
                  <FieldLabel htmlFor={uploadTitleId}>عنوان الملف</FieldLabel>
                  <Input id={uploadTitleId} value={uploadTitle} onValueChange={setUploadTitle} disabled={isUploading} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fileInputId}>الملف (PDF)</FieldLabel>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                  />
                </Field>
                {uploadError && (
                  <Alert variant="destructive">
                    <AlertTriangle />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}
                <Button type="button" onClick={handleUpload} disabled={isUploading}>
                  <Upload className="size-4" />
                  {isUploading ? '...جارٍ الرفع' : 'رفع الملف'}
                </Button>
              </div>

              {papersError && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{papersError}</AlertDescription>
                </Alert>
              )}

              {isLoadingPapers ? (
                <p className="text-sm text-muted-foreground">...جارٍ التحميل</p>
              ) : papers.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد ملفات مرفوعة لهذه المادة بعد.</p>
              ) : (
                <div className="space-y-2">
                  {papers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => handlePreview(p)}
                        disabled={previewingId === p.id}
                        className="flex items-center gap-2 text-sm text-start flex-1 hover:text-primary-soft"
                      >
                        <FileText className="size-4 shrink-0" />
                        {previewingId === p.id ? '...جارٍ الفتح' : p.title}
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDeletePaper(p)}
                        disabled={deletingPaperId === p.id}
                        aria-label="حذف الملف"
                      >
                        <X className="size-4" />
                      </Button>
                      {paperDeleteError[p.id] && <p className="text-xs text-destructive">{paperDeleteError[p.id]}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
