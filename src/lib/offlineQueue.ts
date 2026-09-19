// Offline write-queue — E2. Generic on purpose (kind + payload), but the
// only producer/consumer wired up right now is payment submission (D5),
// per the task's own scope ("payment upload and admin data entry" — admin
// screens are deliberately plain-fetch by design, see AGENTS.md, and are
// expected to run from the school office with a connection; this queue is
// for the one flow a student genuinely needs mid-blackout). Add more
// `kind`s here if a specific admin flow later needs the same treatment.
import { get, set } from 'idb-keyval'

const QUEUE_KEY = 'offline-write-queue'

export interface QueuedJob<TPayload = unknown> {
  id: string
  kind: string
  payload: TPayload
  createdAt: string
}

async function readQueue(): Promise<QueuedJob[]> {
  return (await get(QUEUE_KEY)) ?? []
}

async function writeQueue(jobs: QueuedJob[]): Promise<void> {
  await set(QUEUE_KEY, jobs)
}

export async function enqueueJob<TPayload>(kind: string, payload: TPayload): Promise<void> {
  const jobs = await readQueue()
  jobs.push({ id: crypto.randomUUID(), kind, payload, createdAt: new Date().toISOString() })
  await writeQueue(jobs)
}

export async function getQueuedJobs<TPayload = unknown>(kind?: string): Promise<QueuedJob<TPayload>[]> {
  const jobs = await readQueue()
  const filtered = kind ? jobs.filter((j) => j.kind === kind) : jobs
  return filtered as QueuedJob<TPayload>[]
}

/** Runs every queued job of `kind` through `handler`, in order, removing
 * each on success. Stops at the first failure rather than skipping it —
 * a failure here almost always means "still offline," and skipping ahead
 * would submit jobs out of order for no benefit. */
export async function processQueuedJobs<TPayload>(
  kind: string,
  handler: (payload: TPayload) => Promise<void>,
): Promise<void> {
  const jobs = await readQueue()
  const remaining = [...jobs]

  for (const job of jobs) {
    if (job.kind !== kind) continue
    try {
      await handler(job.payload as TPayload)
      const idx = remaining.findIndex((j) => j.id === job.id)
      if (idx !== -1) remaining.splice(idx, 1)
      await writeQueue(remaining)
    } catch {
      // Still failing (still offline) — stop here, leave the rest queued.
      return
    }
  }
}
