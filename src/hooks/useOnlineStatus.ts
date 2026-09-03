import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/** Reactive navigator.onLine. Note this only reflects whether the device
 * has *a* network connection, not whether Supabase is actually reachable —
 * good enough to distinguish "no connection" from "connection but no cached
 * data," which is what B5 asks for, but not a substitute for handling a
 * genuinely failed fetch (a query can still fail with `isOnline: true`, and
 * that's a normal error state, not this screen's job). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // SSR fallback, unused in this SPA but required by the hook's signature
  )
}
