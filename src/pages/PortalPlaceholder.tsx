import { useAuth } from '@/hooks/useAuth'

// TEMPORARY — shared placeholder for every role's home route. Each of
// StudentHome/TeacherHome/AdminHome renders this now and gets its own real
// dashboard in Stage D, at the same file/route.
export function PortalPlaceholder({ title }: { title: string }) {
  const { profile, role, logout } = useAuth()

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 480 }}>
      <h1>{title}</h1>
      <p>
        Real protected route (B3) — reached only because you're signed in
        with the matching role. Real dashboard comes in Stage D.
      </p>
      <p>
        <strong>{profile?.full_name}</strong> — {profile?.login_id} — role:{' '}
        <strong>{role}</strong>
      </p>
      <button onClick={() => logout()}>Sign out</button>
    </div>
  )
}
