import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
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

export function SignupPage() {
  const { signup, isAuthenticated, isLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [doneEmail, setDoneEmail] = useState<string | null>(null)

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/account" replace />
  }

  if (doneEmail) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          We sent a verification link to <span className="text-foreground">{doneEmail}</span>.
          Verify your address before logging in.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover"
        >
          Go to log in
        </Link>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const result = await signup({ username, email, password1, password2 })
      setDoneEmail(result.email)
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Signup failed. Is Django running?')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Sign up</h1>
      <p className="mt-2 text-sm text-muted">
        Create an account to publish sketches. Password needs 8+ chars, a letter, a
        number, and a symbol.
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-btn border border-border bg-surface px-3 py-2 text-foreground"
            autoComplete="username"
            required
          />
          {fieldError(fieldErrors, 'username') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'username')}
            </span>
          ) : null}
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-btn border border-border bg-surface px-3 py-2 text-foreground"
            autoComplete="email"
            required
          />
          {fieldError(fieldErrors, 'email') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'email')}
            </span>
          ) : null}
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted">Password</span>
          <input
            type="password"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            className="w-full rounded-btn border border-border bg-surface px-3 py-2 text-foreground"
            autoComplete="new-password"
            required
          />
          {fieldError(fieldErrors, 'password1') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'password1')}
            </span>
          ) : null}
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted">Confirm password</span>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full rounded-btn border border-border bg-surface px-3 py-2 text-foreground"
            autoComplete="new-password"
            required
          />
          {fieldError(fieldErrors, 'password2') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'password2')}
            </span>
          ) : null}
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
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
