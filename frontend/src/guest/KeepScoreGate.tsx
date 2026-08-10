type KeepScoreGateProps = {
  open: boolean
  game: string
  score: number
  onKeep: () => void
  onDismiss: () => void
}

export function KeepScoreGate({
  open,
  game,
  score,
  onKeep,
  onDismiss,
}: KeepScoreGateProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[1px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keep-score-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Dismiss"
        onClick={onDismiss}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div
          className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-transparent"
          aria-hidden
        />
        <div className="p-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            New personal best
          </p>
          <h2
            id="keep-score-title"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground"
          >
            Keep this score?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            <span className="font-mono text-foreground">
              {score.toLocaleString()}
            </span>{' '}
            on <span className="text-foreground">{game}</span> is saved on this
            device only. Sign in to keep it on your account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-btn bg-primary px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover"
              onClick={onKeep}
            >
              Sign in to keep
            </button>
            <button
              type="button"
              className="rounded-btn border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground"
              onClick={onDismiss}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
