import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Code2, PanelLeftClose, PanelLeftOpen, Play } from 'lucide-react'
import { SketchCodeEditor } from '@/components/ide/SketchCodeEditor'
import { IdePreviewStage } from '@/components/ide/IdePreviewStage'
import { IdeRuntimeErrorBanner } from '@/components/ide/IdeRuntimeErrorBanner'
import {
  IDE_EDITOR_RATIO_MAX,
  IDE_EDITOR_RATIO_MIN,
  readEditorRatioPreference,
  writeEditorRatioPreference,
  type IdeFile,
} from '@/components/ide/ideFiles'
import type { PreviewRuntimeError } from '@/lib/previewErrors'
import { cn } from '@/lib/utils'

type MobileTab = 'code' | 'preview'

type IdeWorkspaceProps = {
  activeFile: IdeFile | null
  onChangeContent: (content: string) => void
  previewHtml: string | null
  previewNonce: number
  running: boolean
  previewPaused?: boolean
  runtimeError: PreviewRuntimeError | null
  onRestart: () => void
  onDismissError: () => void
  /** Called when preview pane size settles; skipped while runtimeError is set. */
  onPreviewResizeRestart: () => void
  emptyPreviewLabel?: string
  filesOpen: boolean
  onFilesOpenChange: (open: boolean) => void
}

export function IdeWorkspace({
  activeFile,
  onChangeContent,
  previewHtml,
  previewNonce,
  running,
  previewPaused = false,
  runtimeError,
  onRestart,
  onDismissError,
  onPreviewResizeRestart,
  emptyPreviewLabel,
  filesOpen,
  onFilesOpenChange,
}: IdeWorkspaceProps) {
  const [editorRatio, setEditorRatio] = useState(() => readEditorRatioPreference())
  const [splitting, setSplitting] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('code')
  const [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null)
  const splitRef = useRef<HTMLDivElement | null>(null)
  const editorRatioRef = useRef(editorRatio)
  const draggingSplit = useRef(false)
  const splitRaf = useRef(0)
  const previewRestartTimer = useRef(0)
  const runtimeErrorRef = useRef(runtimeError)
  runtimeErrorRef.current = runtimeError
  const onPreviewResizeRestartRef = useRef(onPreviewResizeRestart)
  onPreviewResizeRestartRef.current = onPreviewResizeRestart

  const schedulePreviewRestart = useCallback(() => {
    if (runtimeErrorRef.current) return
    if (previewRestartTimer.current) {
      window.clearTimeout(previewRestartTimer.current)
    }
    previewRestartTimer.current = window.setTimeout(() => {
      previewRestartTimer.current = 0
      if (runtimeErrorRef.current) return
      onPreviewResizeRestartRef.current()
    }, 140)
  }, [])

  function applySplitRatio(next: number) {
    const clamped = Math.min(
      IDE_EDITOR_RATIO_MAX,
      Math.max(IDE_EDITOR_RATIO_MIN, next),
    )
    editorRatioRef.current = clamped
    const el = splitRef.current
    if (el) {
      el.style.setProperty('--editor-grow', String(clamped))
      el.style.setProperty('--preview-grow', String(1 - clamped))
    }
    return clamped
  }

  function endSplitDrag() {
    if (!draggingSplit.current) return
    draggingSplit.current = false
    if (splitRaf.current) {
      cancelAnimationFrame(splitRaf.current)
      splitRaf.current = 0
    }
    const finalRatio = editorRatioRef.current
    setEditorRatio(finalRatio)
    setSplitting(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    writeEditorRatioPreference(finalRatio)
    schedulePreviewRestart()
  }

  useEffect(() => {
    editorRatioRef.current = editorRatio
    if (draggingSplit.current) return
    writeEditorRatioPreference(editorRatio)
  }, [editorRatio])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingSplit.current || !splitRef.current) return
      const rect = splitRef.current.getBoundingClientRect()
      if (rect.width < 40) return
      const usable = Math.max(1, rect.width - 6)
      const next = (e.clientX - rect.left) / usable
      if (splitRaf.current) cancelAnimationFrame(splitRaf.current)
      splitRaf.current = requestAnimationFrame(() => {
        applySplitRatio(next)
      })
    }
    function onUp() {
      endSplitDrag()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (splitRaf.current) cancelAnimationFrame(splitRaf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!previewHost || !previewHtml) return

    let lastW = 0
    let lastH = 0
    let primed = false

    const observer = new ResizeObserver(() => {
      const w = previewHost.clientWidth
      const h = previewHost.clientHeight
      if (!primed) {
        primed = true
        lastW = w
        lastH = h
        return
      }
      if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return
      lastW = w
      lastH = h
      if (draggingSplit.current) return
      schedulePreviewRestart()
    })

    observer.observe(previewHost)
    return () => {
      observer.disconnect()
      if (previewRestartTimer.current) {
        window.clearTimeout(previewRestartTimer.current)
        previewRestartTimer.current = 0
      }
    }
  }, [previewHost, previewHtml, schedulePreviewRestart])

  useEffect(() => {
    if (mobileTab !== 'preview') return
    schedulePreviewRestart()
  }, [mobileTab, schedulePreviewRestart])

  function startSplitDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    draggingSplit.current = true
    setSplitting(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    e.currentTarget.setPointerCapture(e.pointerId)
    if (splitRef.current) {
      const rect = splitRef.current.getBoundingClientRect()
      const usable = Math.max(1, rect.width - 6)
      applySplitRatio((e.clientX - rect.left) / usable)
    }
  }

  const handleHostReady = useCallback((host: HTMLDivElement | null) => {
    setPreviewHost(host)
  }, [])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Mobile Code / Preview tabs */}
      <div
        className="flex shrink-0 border-b border-border/70 bg-background/55 p-1 backdrop-blur-sm lg:hidden"
        role="tablist"
        aria-label="Editor views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'code'}
          onClick={() => setMobileTab('code')}
          className={cn(
            'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn px-3 py-2 text-xs font-medium transition-colors',
            mobileTab === 'code'
              ? 'bg-primary/15 text-primary'
              : 'text-muted hover:text-foreground',
          )}
        >
          <Code2 size={14} aria-hidden />
          Code
          {runtimeError ? (
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden />
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'preview'}
          onClick={() => setMobileTab('preview')}
          className={cn(
            'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn px-3 py-2 text-xs font-medium transition-colors',
            mobileTab === 'preview'
              ? 'bg-primary/15 text-primary'
              : 'text-muted hover:text-foreground',
          )}
        >
          <Play size={14} aria-hidden />
          Preview
          {runtimeError ? (
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden />
          ) : null}
        </button>
      </div>

      <div
        ref={splitRef}
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row',
          splitting && 'select-none',
        )}
        style={
          {
            '--editor-grow': editorRatio,
            '--preview-grow': 1 - editorRatio,
          } as CSSProperties
        }
      >
        <section
          className={cn(
            'min-h-0 min-w-0 flex-col border-border/70 bg-background/35 backdrop-blur-sm',
            'lg:flex lg:flex-[var(--editor-grow)_1_0%] lg:border-b-0',
            mobileTab === 'code' ? 'flex flex-1' : 'hidden lg:flex',
          )}
          role="tabpanel"
          aria-label="Code"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 font-mono text-xs text-muted">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onFilesOpenChange(!filesOpen)}
                className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-btn text-muted hover:bg-primary/10 hover:text-primary"
                aria-pressed={filesOpen}
                aria-label={filesOpen ? 'Hide files sidebar' : 'Show files sidebar'}
                title={filesOpen ? 'Hide files' : 'Show files'}
              >
                {filesOpen ? (
                  <PanelLeftClose size={14} aria-hidden />
                ) : (
                  <PanelLeftOpen size={14} aria-hidden />
                )}
              </button>
              <span className="truncate">{activeFile?.filename ?? '—'}</span>
              {runtimeError ? (
                <span className="shrink-0 rounded-btn border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-600 dark:text-rose-300">
                  Error
                </span>
              ) : null}
            </div>
            <span className="hidden shrink-0 text-[10px] uppercase tracking-wide lg:inline">
              Editor
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-full">
            {activeFile ? (
              <SketchCodeEditor
                key={activeFile.filename}
                filename={activeFile.filename}
                value={activeFile.content}
                onChange={onChangeContent}
                className="h-full"
              />
            ) : null}
          </div>
          {runtimeError ? (
            <IdeRuntimeErrorBanner
              error={runtimeError}
              onRestart={onRestart}
              onDismiss={onDismissError}
              variant="banner"
            />
          ) : null}
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor and preview"
          aria-valuemin={Math.round(IDE_EDITOR_RATIO_MIN * 100)}
          aria-valuemax={Math.round(IDE_EDITOR_RATIO_MAX * 100)}
          aria-valuenow={Math.round(editorRatio * 100)}
          tabIndex={0}
          onPointerDown={startSplitDrag}
          onPointerUp={endSplitDrag}
          onLostPointerCapture={endSplitDrag}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              const next = applySplitRatio(editorRatioRef.current - 0.03)
              setEditorRatio(next)
              schedulePreviewRestart()
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              const next = applySplitRatio(editorRatioRef.current + 0.03)
              setEditorRatio(next)
              schedulePreviewRestart()
            }
          }}
          className={cn(
            'group relative z-20 hidden w-1.5 shrink-0 cursor-col-resize touch-none bg-border/50',
            'hover:bg-primary/50 focus-visible:bg-primary/60 focus-visible:outline-none lg:block',
            splitting && 'bg-primary/60',
          )}
        >
          <span className="absolute inset-y-0 -left-2 -right-2" />
        </div>

        <IdePreviewStage
          previewHtml={previewHtml}
          previewNonce={previewNonce}
          running={running}
          previewPaused={previewPaused}
          runtimeError={runtimeError}
          splitting={splitting}
          emptyLabel={emptyPreviewLabel}
          onRestart={onRestart}
          onDismissError={onDismissError}
          onHostReady={handleHostReady}
          className={cn(
            'lg:flex lg:flex-[var(--preview-grow)_1_0%]',
            mobileTab === 'preview' ? 'flex flex-1' : 'hidden lg:flex',
          )}
        />
      </div>
    </div>
  )
}
