import { AlertTriangle, RotateCcw, X } from 'lucide-react'
import {
  formatPreviewError,
  type PreviewRuntimeError,
} from '@/lib/previewErrors'
import { cn } from '@/lib/utils'

type IdeRuntimeErrorBannerProps = {
  error: PreviewRuntimeError
  onRestart: () => void
  onDismiss: () => void
  /** Compact strip for the code pane; full fills the preview stage. */
  variant?: 'banner' | 'panel'
  className?: string
}

export function IdeRuntimeErrorBanner({
  error,
  onRestart,
  onDismiss,
  variant = 'banner',
  className,
}: IdeRuntimeErrorBannerProps) {
  const title =
    error.kind === 'processing-mismatch' ? 'Sketch type mismatch' : 'Sketch error'

  if (variant === 'panel') {
    return (
      <div
        className={cn(
          'absolute inset-0 flex flex-col overflow-hidden bg-surface dark:bg-[#0c0a12]',
          className,
        )}
        role="alert"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 0%, color-mix(in srgb, #7b61ff 18%, transparent), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative flex min-h-0 flex-1 flex-col p-4 sm:p-5">
          <Header title={title} onDismiss={onDismiss} />
          <div className="min-h-0 flex-1 overflow-auto rounded-btn border border-primary/20 bg-background px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(123,97,255,0.06)] dark:bg-black/35">
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-rose-700 dark:text-rose-200/90">
              {formatPreviewError(error)}
            </pre>
          </div>
          <Actions onRestart={onRestart} onDismiss={onDismiss} className="mt-3" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-2 border-t border-rose-400/25 bg-rose-500/[0.07] px-3 py-2.5',
        className,
      )}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle
            size={14}
            className="shrink-0 text-rose-600 dark:text-rose-300"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{title}</p>
            <p className="text-[10px] text-muted">
              Preview stopped · fix the code or restart
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-btn text-muted hover:bg-background hover:text-foreground"
          aria-label="Dismiss error"
          title="Dismiss"
        >
          <X size={13} aria-hidden />
        </button>
      </div>
      <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-btn border border-rose-400/20 bg-background/80 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-rose-700 dark:bg-black/35 dark:text-rose-200/90">
        {formatPreviewError(error)}
      </pre>
      <Actions onRestart={onRestart} onDismiss={onDismiss} />
    </div>
  )
}

function Header({
  title,
  onDismiss,
}: {
  title: string
  onDismiss: () => void
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn border border-rose-400/30 bg-rose-500/10 text-rose-600 dark:text-rose-300">
          <AlertTriangle size={15} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-foreground">
            {title}
          </p>
          <p className="text-[11px] text-muted">
            Preview stopped · fix the code or restart
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-btn text-muted hover:bg-background hover:text-foreground"
        aria-label="Dismiss error"
        title="Dismiss"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}

function Actions({
  onRestart,
  onDismiss,
  className,
}: {
  onRestart: () => void
  onDismiss: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={onRestart}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3 text-xs font-medium text-[var(--color-on-primary)] hover:bg-primary-hover"
      >
        <RotateCcw size={12} aria-hidden />
        Restart sketch
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-8 cursor-pointer items-center rounded-btn border border-border px-3 text-xs text-muted hover:border-primary/30 hover:text-foreground"
      >
        Dismiss
      </button>
    </div>
  )
}
