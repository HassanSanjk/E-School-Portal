import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'

// TEMPORARY — plain HTML form standing in for B4's real Login screen
// (shadcn/ui, Arabic copy, ID+PIN framing). Routing/auth wiring here is
// real; the visual is not.
export function LoginPage() {
  const { login } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const { error } = await login(loginId, pin)
      if (error) setError(error.message)
    } catch (e) {
      // login() shouldn't throw anymore, but if something upstream ever
      // does, surface it instead of hanging on "Signing in..." forever.
      setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 480 }}>
      <h1>B3 sanity check — /login</h1>
      <p>Real route, real auth call. Not the real B4 screen.</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
        <label>
          Login ID
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        <label>
          PIN
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      </form>
    </div>
  )
}
