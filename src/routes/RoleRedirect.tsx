import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { homePathForRole } from './homePathForRole'

export function RoleRedirect() {
  const { session, role, isInitializing, isProfileLoading } = useAuth()

  if (isInitializing || (session && isProfileLoading)) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <p>...جارٍ التحقق</p>
      </div>
    )
  }

  if (session && role) return <Navigate to={homePathForRole(role)} replace />
  return <Navigate to="/login" replace />
}
