import { Navigate, Outlet } from 'react-router'
import { useAuth, type Role } from '@/hooks/useAuth'
import { homePathForRole } from './homePathForRole'

/** Shown while we don't yet know enough to make a routing decision safely —
 * never render real content or redirect on a guess. */
function RouteResolving() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>...جارٍ التحقق</p>
    </div>
  )
}

export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { session, role, isInitializing, isProfileLoading } = useAuth()

  if (isInitializing) return <RouteResolving />
  if (!session) return <Navigate to="/login" replace />
  // Session exists but the profiles row hasn't loaded yet — role is
  // genuinely unknown at this point, not "no role". Don't redirect on a
  // guess; every reload while logged in passes through this for a moment.
  if (isProfileLoading) return <RouteResolving />
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={role ? homePathForRole(role) : '/login'} replace />
  }

  return <Outlet />
}

/** Wraps /login so an already-signed-in user gets bounced to their own
 * home instead of seeing the login form again. */
export function PublicOnlyRoute() {
  const { session, role, isInitializing, isProfileLoading } = useAuth()

  if (isInitializing) return <RouteResolving />
  if (session && isProfileLoading) return <RouteResolving />
  if (session && role) return <Navigate to={homePathForRole(role)} replace />

  return <Outlet />
}
