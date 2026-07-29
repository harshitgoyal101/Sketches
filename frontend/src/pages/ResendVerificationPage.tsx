import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { resendVerification } from '@/api/auth'
import { fieldError, inputClass, labelClass, primaryBtnClass } from '@/lib/form'

export function ResendVerificationPage() {
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
      await resendVerification(email)
      setSent(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Could not resend verification.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
        <h1 className="font-display text-2xl font-semibold">Check your email</h1>
        <p className="mt-3 text-sm text-muted">
          If an unverified account exists for that address, we sent a new link.
        </p>
        <Link to="/login" className={`${primaryBtnClass} mt-8`}>
          Back to log in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-semibold">Resend verification</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the email you used to sign up.
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className={labelClass}>
          <span className="text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
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
        <button type="submit" disabled={submitting} className={`${primaryBtnClass} w-full`}>
          {submitting ? 'Sending…' : 'Resend link'}
        </button>
      </form>
    </div>
  )
}
