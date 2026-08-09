import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

type GuestNameGateProps = {
  open: boolean
  onSubmit: (name: string) => void
}

export function GuestNameGate({ open, onSubmit }: GuestNameGateProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSubmit('Guest')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onSubmit])

  if (!open) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  function handleClose() {
    onSubmit('Guest')
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
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <div
          className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-transparent"
          aria-hidden
        />
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-4 rounded-btn p-1.5 text-foreground/80 transition-colors hover:bg-background hover:text-foreground"
          aria-label="Close and continue as Guest"
        >
          <X size={18} />
        </button>
        <div className="p-6 sm:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary font-bold">
            Welcome
          </p>
          <h2
            id="guest-name-title"
            className="mt-2 pr-8 font-display text-2xl font-semibold tracking-tight text-foreground"
          >
            What should we call you?
          </h2>
          <label className="mt-6 block space-y-1.5 text-sm">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              placeholder="Name..."
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
