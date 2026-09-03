import { Navigate, Outlet } from 'react-router'
import { useAuth, type Role } from '@/hooks/useAuth'
import { homePathForRole } from './homePathForRole'
import { AuthResolving } from './AuthResolving'

export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { session, role, isProfileLoading } = useAuth()

  // isInitializing is handled one level up in App.tsx (the whole route tree
  // isn't mounted until it resolves), so it's not re-checked here.
  if (!session) return <Navigate to="/login" replace />
  // Session exists but the profiles row hasn't loaded yet — role is
  // genuinely unknown at this point, not "no role". Don't redirect on a
  // guess.
  if (isProfileLoading) return <AuthResolving />
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={role ? homePathForRole(role) : '/login'} replace />
  }

  return <Outlet />
}

/** Wraps /login so an already-signed-in user gets bounced to their own
 * home instead of seeing the login form again. */
export function PublicOnlyRoute() {
  const { session, role, isProfileLoading } = useAuth()

  if (session && isProfileLoading) return <AuthResolving />
  if (session && role) return <Navigate to={homePathForRole(role)} replace />

  return <Outlet />
}
