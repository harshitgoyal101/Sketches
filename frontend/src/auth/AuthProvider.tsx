import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  ensureCsrfCookie,
  type AuthUser,
  type LoginPayload,
  type SignupPayload,
  type SignupResponse,
} from '@/api/auth'

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  refresh: () => Promise<void>
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  signup: (payload: SignupPayload) => Promise<SignupResponse>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    await ensureCsrfCookie()
    const me = await getMe()
    setUser(me.user)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const login = useCallback(async (payload: LoginPayload) => {
    const next = await apiLogin(payload)
    setUser(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const signup = useCallback(async (payload: SignupPayload) => {
    return apiSignup(payload)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      refresh,
      login,
      logout,
      signup,
    }),
    [user, isLoading, refresh, login, logout, signup],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
