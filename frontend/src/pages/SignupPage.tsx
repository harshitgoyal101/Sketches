import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { AuthEmailStatus } from '@/components/auth/AuthEmailStatus'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'

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
      <AuthSplitLayout title="Check your email">
        <AuthEmailStatus
          icon={<Mail size={22} strokeWidth={2} />}
          title="Verify your address"
          primaryHref="/login"
          primaryLabel="Go to log in"
          secondaryHref="/resend-verification"
          secondaryLabel="Resend verification"
        >
          We sent a verification link to{' '}
          <span className="font-medium text-foreground">{doneEmail}</span>.
          Open it to activate your account before logging in.
        </AuthEmailStatus>
      </AuthSplitLayout>
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
    <AuthSplitLayout
      title="Create account"
      lead="Join us and start exploring, playing, creating and sharing."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-btn border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary"
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
            className="w-full rounded-btn border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary"
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
          <PasswordInput
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
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
          <PasswordInput
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
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
    </AuthSplitLayout>
  )
}
