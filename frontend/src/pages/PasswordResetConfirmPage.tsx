import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { ApiError } from '@/api/client'
import { confirmPasswordReset } from '@/api/auth'
import { useAuth } from '@/auth/AuthProvider'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import {
  fieldError,
  labelClass,
  primaryBtnClass,
} from '@/lib/form'

export function PasswordResetConfirmPage() {
  const { uidb64 = '', token = '' } = useParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  if (!uidb64 || !token) {
    return <Navigate to="/password-reset" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await confirmPasswordReset({
        uid: uidb64,
        token,
        password1,
        password2,
      })
      await refresh()
      navigate('/account', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Could not reset password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout
      title="Choose a new password"
      lead="Use at least 8 characters with a letter, number, and symbol."
    >
      <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-btn bg-primary/12 text-primary ring-1 ring-primary/20">
        <LockKeyhole size={20} strokeWidth={2} aria-hidden />
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className={labelClass}>
          <span className="text-muted">New password</span>
          <PasswordInput
            required
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            autoComplete="new-password"
          />
          {fieldError(fieldErrors, 'new_password1', 'password1') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'new_password1', 'password1')}
            </span>
          ) : null}
        </label>
        <label className={labelClass}>
          <span className="text-muted">Confirm password</span>
          <PasswordInput
            required
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
          {fieldError(fieldErrors, 'new_password2', 'password2') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'new_password2', 'password2')}
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
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Link expired?{' '}
        <Link
          to="/password-reset"
          className="font-medium text-primary hover:underline"
        >
          Request a new one
        </Link>
        {' · '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
