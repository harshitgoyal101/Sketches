import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

type AuthGateProps = {
  open: boolean
  reason?: string
  googleClientId?: string
  onClose: () => void
  onGoogleCredential: (credential: string) => void
}

export function AuthGate({
  open,
  reason,
  googleClientId,
  onClose,
  onGoogleCredential,
}: AuthGateProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl outline-none"
      >
        <div
          className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-transparent"
          aria-hidden
        />
        <div className="p-6 sm:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Sign in required
          </p>
          <h2
            id="auth-gate-title"
            className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground"
          >
            Keep your work
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {reason ||
              'Sign in to save, fork, or create sketches. Guest drafts and scores move to your account.'}
          </p>

          <div className="mt-6 space-y-3">
            <GoogleSignInButton
              clientId={googleClientId}
              onCredential={onGoogleCredential}
            />

            <div className="relative py-1 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
              <span className="relative z-10 bg-surface px-3">or</span>
              <span
                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"
                aria-hidden
              />
            </div>

            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-btn border border-border bg-background py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
              onClick={onClose}
            >
              Continue with email
            </Link>
            <Link
              to="/signup"
              className="flex w-full items-center justify-center rounded-btn bg-primary py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover"
              onClick={onClose}
            >
              Create account
            </Link>
            <button
              type="button"
              className="w-full py-2 text-sm text-muted transition-colors hover:text-foreground"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
