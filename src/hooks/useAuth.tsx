import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'

// Matches public.user_role in schema_and_rls.sql.
export type Role = 'student' | 'teacher' | 'admin'

// Matches the columns on public.profiles that every role shares. Role-specific
// tables (students/teachers/admins) are fetched separately by the screens
// that need them — this hook only carries what auth/routing decisions need.
export interface Profile {
  id: string
  login_id: string
  role: Role
  full_name: string
}

interface AuthResult {
  error: { message: string } | null
}

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  role: Role | null
  // True while the initial session check (SDK reading its own storage) is
  // still resolving. B5's splash screen waits on this specifically.
  isInitializing: boolean
  // True while a session exists but its profiles row hasn't loaded yet —
  // a real state, not an edge case: it covers every reload while logged in.
  isProfileLoading: boolean
  login: (loginId: string, pin: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// The synthetic email pattern is the one non-negotiable auth detail in
// AGENTS.md — kept in exactly one place so it can't drift between login and
// (if ever needed) admin-side user creation.
function loginIdToEmail(loginId: string): string {
  return `${loginId}@school.internal`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsInitializing(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, login_id, role, full_name')
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!userId,
  })

  async function login(loginId: string, pin: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginIdToEmail(loginId),
        password: pin,
      })
      // Supabase's error text is English and not meant for end users — the
      // real Login screen (B4) maps this to an Arabic message. This hook just
      // reports success/failure.
      return { error: error ? { message: error.message } : null }
    } catch (e) {
      // A thrown exception here means the request never got a response at
      // all (network down, DNS failure, CORS block) rather than Supabase
      // rejecting the credentials — which is itself useful to distinguish.
      const message = e instanceof Error ? e.message : String(e)
      return { error: { message: `Network error: ${message}` } }
    }
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    // Wipe the entire cache, not just the profile query, on explicit logout.
    // This is a shared-device app by design (AGENTS.md: a family uses the
    // student's own login, and a household may have more than one daughter
    // enrolled, each with her own login on the same phone) — leaving a
    // previous user's marks/fees/salary sitting in IndexedDB after logout
    // would be exactly the kind of access gap this project has been bitten
    // by before. Normal offline persistence between reloads is untouched;
    // this only fires on an explicit logout.
    queryClient.clear()
  }

  const value: AuthContextValue = {
    session,
    profile: profileQuery.data ?? null,
    role: profileQuery.data?.role ?? null,
    isInitializing,
    isProfileLoading: !!session && profileQuery.isPending,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be used within <AuthProvider>')
  }
  return ctx
}
