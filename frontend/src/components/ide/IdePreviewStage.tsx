import { useEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { IdeRuntimeErrorBanner } from '@/components/ide/IdeRuntimeErrorBanner'
import type { PreviewRuntimeError } from '@/lib/previewErrors'
import { cn } from '@/lib/utils'

type IdePreviewStageProps = {
  previewHtml: string | null
  previewNonce: number
  running: boolean
  runtimeError: PreviewRuntimeError | null
  splitting?: boolean
  emptyLabel?: string
  onRestart: () => void
  onDismissError: () => void
  onHostReady?: (host: HTMLDivElement | null) => void
  className?: string
}

export function IdePreviewStage({
  previewHtml,
  previewNonce,
  running,
  runtimeError,
  splitting = false,
  emptyLabel = 'Preparing preview…',
  onRestart,
  onDismissError,
  onHostReady,
  className,
}: IdePreviewStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [stageFullscreen, setStageFullscreen] = useState(false)

  useEffect(() => {
    onHostReady?.(hostRef.current)
    return () => onHostReady?.(null)
  }, [onHostReady, runtimeError, previewHtml])

  useEffect(() => {
    function syncFullscreen() {
      const stage = stageRef.current
      setStageFullscreen(Boolean(stage && document.fullscreenElement === stage))
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    if (!stageFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setStageFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stageFullscreen])

  async function togglePreviewFullscreen() {
    const stage = stageRef.current
    if (!stage) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      await stage.requestFullscreen()
      setStageFullscreen(true)
    } catch {
      setStageFullscreen((v) => !v)
    }
  }

  return (
    <section
      ref={stageRef}
      className={cn(
        'flex min-h-[40vh] min-w-0 flex-1 flex-col bg-zinc-100 lg:min-h-0 dark:bg-[#0a0a0c]',
        stageFullscreen && 'fixed inset-0 z-[80] min-h-0',
        className,
      )}
    >
      {!stageFullscreen ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 py-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 text-foreground/80">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                runtimeError ? 'bg-rose-400' : 'bg-primary',
              )}
            />
            {runtimeError ? 'Preview error' : 'Preview'}
          </span>
          <button
            type="button"
            onClick={() => void togglePreviewFullscreen()}
            disabled={Boolean(runtimeError)}
            className="inline-flex cursor-pointer items-center gap-1 text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Maximize2 size={13} aria-hidden />
            Fullscreen
          </button>
        </div>
      ) : null}
      <div ref={hostRef} className="relative min-h-0 flex-1">
        {runtimeError ? (
          <IdeRuntimeErrorBanner
            error={runtimeError}
            onRestart={onRestart}
            onDismiss={onDismissError}
            variant="panel"
          />
        ) : previewHtml ? (
          <iframe
            key={`preview#${previewNonce}`}
            title="Sketch preview"
            srcDoc={previewHtml}
            className={cn(
              'absolute inset-0 h-full w-full border-0',
              splitting && 'pointer-events-none',
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            {running ? 'Starting preview…' : emptyLabel}
          </div>
        )}
      </div>
    </section>
  )
}
