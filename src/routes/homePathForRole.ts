import type { Role } from '@/hooks/useAuth'

export function homePathForRole(role: Role): string {
  switch (role) {
    case 'student':
      return '/student'
    case 'teacher':
      return '/teacher'
    case 'admin':
      return '/admin'
  }
}
