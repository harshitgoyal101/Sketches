import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { ApiError } from '@/api/client'
import { requestPasswordReset } from '@/api/auth'
import { AuthEmailStatus } from '@/components/auth/AuthEmailStatus'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import {
  fieldError,
  inputClass,
  labelClass,
  primaryBtnClass,
} from '@/lib/form'

export function PasswordResetRequestPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Could not send reset email.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <AuthSplitLayout title="Check your email">
        <AuthEmailStatus
          icon={<KeyRound size={22} strokeWidth={2} />}
          title="Reset link sent"
          primaryHref="/login"
          primaryLabel="Back to log in"
        >
          If an account exists for{' '}
          <span className="font-medium text-foreground">{email}</span>, we sent a
          password reset link. Check spam if it doesn’t show up soon.
        </AuthEmailStatus>
        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-medium text-primary hover:underline"
          onClick={() => setSent(false)}
        >
          Try another email
        </button>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout
      title="Reset password"
      lead="Enter the email on your account and we’ll send a secure reset link."
    >
      <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-btn bg-primary/12 text-primary ring-1 ring-primary/20">
        <KeyRound size={20} strokeWidth={2} aria-hidden />
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className={labelClass}>
          <span className="text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} py-2.5 outline-none focus:border-primary`}
            autoComplete="email"
            placeholder="you@example.com"
          />
          {fieldError(fieldErrors, 'email') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'email')}
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
          className={`${primaryBtnClass} w-full`}
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
        {' · '}
        <Link
          to="/resend-verification"
          className="font-medium text-primary hover:underline"
        >
          Resend verification
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
