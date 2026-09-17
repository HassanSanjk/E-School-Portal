import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Best-effort clipboard write — silently no-ops on failure (e.g. an
 * insecure context or a browser that blocks it) rather than throwing,
 * since a failed copy isn't worth interrupting the user over; the caller
 * is expected to still show the text on screen as a fallback. */
export function copyToClipboard(text: string): void {
  navigator.clipboard?.writeText(text).catch(() => {})
}

/** First two "words" of a full name, first letters only — used for the
 * small avatar badge in dashboard headers (student and teacher alike). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
}
