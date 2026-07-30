import { useEffect, useState, type FormEvent } from 'react'

type GuestNameGateProps = {
  open: boolean
  onSubmit: (name: string) => void
}

export function GuestNameGate({ open, onSubmit }: GuestNameGateProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  if (!open) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-name-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <div
          className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-transparent"
          aria-hidden
        />
        <div className="p-6 sm:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Welcome
          </p>
          <h2
            id="guest-name-title"
            className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground"
          >
            What should we call you?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Play and experiment as a guest. We&apos;ll ask you to sign in only when
            you save, fork, create, or keep a high score.
          </p>
          <label className="mt-6 block space-y-1.5 text-sm">
            <span className="text-muted">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              placeholder="Ada"
              className="w-full rounded-btn border border-border bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim()}
            className="mt-6 w-full rounded-btn bg-primary py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover disabled:opacity-50"
          >
            Continue as guest
          </button>
        </div>
      </form>
    </div>
  )
}
