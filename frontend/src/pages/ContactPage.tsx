import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Mail } from 'lucide-react'
import { ApiError } from '@/api/client'
import { sendContactMessage } from '@/api/contact'
import { useAuth } from '@/auth/AuthProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  fieldError,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/lib/form'

export function ContactPage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [sent, setSent] = useState(false)

  useDocumentTitle(
    'Contact Us · Sketches101',
    'Send a message to the Sketches101 team.',
  )

  useEffect(() => {
    if (!user) return
    setName((current) => current || user.display_name || user.username || '')
    setEmail((current) => current || user.email || '')
  }, [user])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await sendContactMessage({ name, email, subject, message })
      setSent(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Could not send your message.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="mb-8">
        <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Mail size={16} strokeWidth={2} aria-hidden />
          Contact
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          Questions, feedback, or collaboration ideas — send a note and we’ll get
          back to you.
        </p>
      </div>

      {sent ? (
        <div
          className="rounded-btn border border-border bg-surface px-5 py-8 text-center"
          role="status"
        >
          <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-btn bg-primary/12 text-primary ring-1 ring-primary/20">
            <CheckCircle2 size={22} strokeWidth={2} aria-hidden />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Message sent
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Thanks{name ? `, ${name}` : ''}. We’ll reply to{' '}
            <span className="font-medium text-foreground">{email}</span> soon.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className={primaryBtnClass}>
              Back home
            </Link>
            <button
              type="button"
              className={secondaryBtnClass}
              onClick={() => {
                setSent(false)
                setSubject('')
                setMessage('')
              }}
            >
              Send another
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <label className={labelClass}>
            <span className="text-muted">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass} py-2.5 outline-none focus:border-primary`}
              autoComplete="name"
              maxLength={120}
            />
            {fieldError(fieldErrors, 'name') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'name')}
              </span>
            ) : null}
          </label>

          <label className={labelClass}>
            <span className="text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} py-2.5 outline-none focus:border-primary`}
              autoComplete="email"
            />
            {fieldError(fieldErrors, 'email') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'email')}
              </span>
            ) : null}
          </label>

          <label className={labelClass}>
            <span className="text-muted">Subject (optional)</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`${inputClass} py-2.5 outline-none focus:border-primary`}
              autoComplete="off"
              maxLength={160}
            />
            {fieldError(fieldErrors, 'subject') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'subject')}
              </span>
            ) : null}
          </label>

          <label className={labelClass}>
            <span className="text-muted">Message</span>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputClass} min-h-[9rem] resize-y py-2.5 outline-none focus:border-primary`}
              maxLength={5000}
            />
            {fieldError(fieldErrors, 'message') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'message')}
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
            className={`${primaryBtnClass} w-full sm:w-auto`}
          >
            {submitting ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}
    </div>
  )
}
