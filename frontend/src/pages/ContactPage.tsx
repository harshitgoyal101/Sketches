import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react'
import { ApiError } from '@/api/client'
import { sendContactMessage } from '@/api/contact'
import { useAuth } from '@/auth/AuthProvider'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  fieldError,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/lib/form'
import { cn } from '@/lib/utils'

const MESSAGE_MAX = 5000

export function ContactPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
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

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const fromName = user?.display_name || user?.username || ''
  const fromEmail = user?.email || ''
  const initials = (fromName || fromEmail || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await sendContactMessage({ subject, message })
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

  if (isLoading || !user) {
    return (
      <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
        <SketchDetailAtmosphere />
        <p className="relative z-10 px-6 py-16 text-center text-sm text-muted">
          Loading…
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      <SketchDetailAtmosphere />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-12">
        <header className="border-b border-border pb-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Support
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            Questions, feedback, or collaboration ideas — we read every message.
          </p>
        </header>

        {sent ? (
          <div
            className="mt-8 rounded-2xl border border-border bg-surface/80 px-6 py-10 text-center sm:px-8"
            role="status"
          >
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <CheckCircle2 size={28} strokeWidth={2} aria-hidden />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Message sent
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
              Thanks{fromName ? `, ${fromName}` : ''}. We’ll reply to{' '}
              <span className="font-medium text-foreground">{fromEmail}</span>{' '}
              as soon as we can.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/" className={cn(primaryBtnClass, 'gap-2')}>
                <ArrowLeft size={16} aria-hidden />
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
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3.5">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-mono text-xs font-bold text-primary ring-1 ring-primary/25"
                aria-hidden
              >
                {initials || <Mail size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  Sending as
                </p>
                <p className="truncate text-sm font-medium text-foreground">
                  {fromName || 'You'}
                  {fromEmail ? (
                    <span className="font-normal text-muted"> · {fromEmail}</span>
                  ) : null}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  To
                </p>
                <p className="text-sm font-medium text-foreground">Sketches101</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <label className={labelClass}>
                <span className="text-muted">Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={`${inputClass} py-2.5 outline-none focus:border-primary`}
                  autoComplete="off"
                  maxLength={160}
                  placeholder="What’s this about? (optional)"
                />
                {fieldError(fieldErrors, 'subject') ? (
                  <span className="text-xs text-destructive">
                    {fieldError(fieldErrors, 'subject')}
                  </span>
                ) : null}
              </label>

              <label className={labelClass}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted">Message</span>
                  <span className="font-mono text-[11px] text-muted">
                    {message.length}/{MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`${inputClass} min-h-[11rem] resize-y py-3 outline-none focus:border-primary`}
                  maxLength={MESSAGE_MAX}
                  placeholder="Tell us what’s on your mind…"
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

              {!fromEmail ? (
                <p className="text-sm text-destructive" role="alert">
                  Your account needs an email address to send a message.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting || !fromEmail}
                  className={cn(primaryBtnClass, 'gap-2')}
                >
                  <Send size={16} aria-hidden />
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
                <Link to="/" className={secondaryBtnClass}>
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
