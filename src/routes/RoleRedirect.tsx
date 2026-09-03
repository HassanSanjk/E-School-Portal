import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { homePathForRole } from './homePathForRole'
import { AuthResolving } from './AuthResolving'

export function RoleRedirect() {
  const { session, role, isProfileLoading } = useAuth()

  if (session && isProfileLoading) return <AuthResolving />
  if (session && role) return <Navigate to={homePathForRole(role)} replace />
  return <Navigate to="/login" replace />
}
