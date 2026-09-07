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
  if (!role) return <Navigate to="/login" replace />
  // Admin reaches every route regardless of which roles a given route
  // names — per IMPLEMENTATION_TASK_LIST.md's B7 spec. Every other role
  // stays confined to its own allowedRoles list.
  if (role !== 'admin' && !allowedRoles.includes(role)) {
    return <Navigate to={homePathForRole(role)} replace />
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
