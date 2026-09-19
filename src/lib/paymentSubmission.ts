// Submit Payment — D5.
//
// Upload path convention: `${studentId}/${uuid}.jpg` in the
// payment-screenshots bucket — this is exactly what the new "student
// uploads own payment screenshot" Storage policy (added alongside this
// screen, see schema_and_rls.sql) checks the first path segment against.
// Get this wrong and every upload fails RLS, not silently succeeds wrong.
import { supabase } from './supabase'
import { enqueueJob, getQueuedJobs, processQueuedJobs } from './offlineQueue'

const BUCKET = 'payment-screenshots'
const MAX_RAW_BYTES = 15 * 1024 * 1024 // guard before compression even starts

export function validatePaymentScreenshot(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'يجب أن يكون الملف صورة (JPG أو PNG).'
  }
  if (file.size > MAX_RAW_BYTES) {
    return 'حجم الصورة كبير جدًا. الرجاء اختيار صورة أصغر.'
  }
  return null
}

/** Downscales to at most 1600px on the long edge and re-encodes as JPEG —
 * a phone camera photo of a bank transfer screen doesn't need to be
 * full-resolution to be legible on review, and this project's whole
 * premise is working over bad connections on cheap Android phones, so
 * shrinking the upload matters more here than most apps. */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذّر معالجة الصورة على هذا الجهاز.')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('تعذّر ضغط الصورة.')
  return blob
}

/** Upload + insert only — the network part of submitting a payment, split
 * out from compression so a queued retry (E2) doesn't need to recompress,
 * just replay this against the blob it already produced. Same rollback
 * principle as uploadTutorialPaper: if the row insert fails, remove the
 * just-uploaded file rather than leaving it orphaned. */
export async function uploadAndRecordPayment(studentId: string, feeId: string, blob: Blob): Promise<void> {
  const path = `${studentId}/${crypto.randomUUID()}.jpg`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
  })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('payments').insert({
    fee_id: feeId,
    student_id: studentId,
    screenshot_path: path,
  })
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path])
    throw insertError
  }
}

// ============================================================
// E2 — offline write-queue for this flow (see offlineQueue.ts).
// ============================================================

const QUEUE_KIND = 'payment'

interface QueuedPaymentPayload {
  studentId: string
  feeId: string
  blob: Blob
}

export async function enqueuePayment(studentId: string, feeId: string, blob: Blob): Promise<void> {
  await enqueueJob<QueuedPaymentPayload>(QUEUE_KIND, { studentId, feeId, blob })
}

/** Fee ids with a payment already sitting in the local queue — checked by
 * StudentSubmitPayment so it doesn't offer the same fee twice while one
 * submission is still waiting to go out. */
export async function queuedPaymentFeeIds(): Promise<Set<string>> {
  const jobs = await getQueuedJobs<QueuedPaymentPayload>(QUEUE_KIND)
  return new Set(jobs.map((j) => j.payload.feeId))
}

/** Replays every queued payment in order, stopping at the first failure
 * (almost always "still offline"). Call this on the 'online' event and
 * once on app start if already online. */
export async function processQueuedPayments(onEachSuccess?: () => void): Promise<void> {
  await processQueuedJobs<QueuedPaymentPayload>(QUEUE_KIND, async (payload) => {
    await uploadAndRecordPayment(payload.studentId, payload.feeId, payload.blob)
    onEachSuccess?.()
  })
}
