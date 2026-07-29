import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'

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
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/account" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await login({ username, password, remember })
      navigate('/account', { replace: true })
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
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Log in</h1>
      <p className="mt-2 text-sm text-muted">
        Use your Sketches101 email or username.
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted">Email</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-btn border border-border bg-surface px-3 py-2 text-foreground"
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-btn border border-border bg-surface px-3 py-2 text-foreground"
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
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/password-reset" className="text-primary hover:underline">
          Forgot password?
        </Link>
        {' · '}
        <Link to="/resend-verification" className="text-primary hover:underline">
          Resend verification
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-muted">
        No account?{' '}
        <Link to="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
