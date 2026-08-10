import { useCallback, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { readPendingAction } from '@/guest/storage'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

function fieldError(
  errors: Record<string, string[]>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    if (errors[key]?.[0]) return errors[key][0]
  }
  return undefined
}

export function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const afterAuth = useCallback(() => {
    const pending = readPendingAction()
    navigate(pending ? '/' : '/account', { replace: true })
  }, [navigate])

  const onGoogle = useCallback(
    async (credential: string) => {
      setFormError(null)
      try {
        await loginWithGoogle(credential)
        afterAuth()
      } catch (err) {
        setFormError(
          err instanceof ApiError ? err.message : 'Google sign-in failed',
        )
      }
    },
    [afterAuth, loginWithGoogle],
  )

  if (!isLoading && isAuthenticated) {
    const pending = readPendingAction()
    return <Navigate to={pending ? '/' : '/account'} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await login({ username, password, remember })
      afterAuth()
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Login failed. Is Django running?')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout
      title="Log in"
      lead="Great to have you back! Sign in to your account to continue."
    >
      <div className="space-y-5">
        <GoogleSignInButton
          clientId={GOOGLE_CLIENT_ID || undefined}
          onCredential={(cred) => {
            void onGoogle(cred)
          }}
        />

        <div className="relative py-1 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
          <span className="relative z-10 bg-background px-3">or email</span>
          <span
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"
            aria-hidden
          />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted">Email or username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-btn border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary"
              autoComplete="username email"
              inputMode="email"
              required
            />
            {fieldError(fieldErrors, 'username') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'username')}
              </span>
            ) : null}
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted">Password</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {fieldError(fieldErrors, 'password') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'password')}
              </span>
            ) : null}
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-border"
            />
            Remember me
          </label>
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-btn bg-primary py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          <Link to="/password-reset" className="text-primary hover:underline">
            Forgot password?
          </Link>
          {' · '}
          <Link to="/resend-verification" className="text-primary hover:underline">
            Resend verification
          </Link>
        </p>
        <p className="text-center text-sm text-muted">
          No account?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  )
}
