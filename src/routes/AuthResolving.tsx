import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineScreen } from '@/pages/OfflineScreen'

/** Shown while a session exists but its `profiles` row hasn't loaded yet.
 * Every reload while logged in passes through this for a moment — normally
 * near-instant, since offline-first caching (B1) rehydrates cached data
 * before this even mounts. It only lingers when there's truly nothing
 * cached for this user on this device, which is exactly the "offline AND
 * no cached data" condition B5 asks for — so that specific case gets the
 * real Offline screen instead of an indicator that would otherwise spin
 * forever with no way out. */
export function AuthResolving() {
  const isOnline = useOnlineStatus()
  if (!isOnline) return <OfflineScreen />
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>...جارٍ التحقق</p>
    </div>
  )
}
