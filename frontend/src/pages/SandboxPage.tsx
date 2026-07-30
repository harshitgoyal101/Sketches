import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPreview, getStarters } from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import { SketchCodeEditor } from '@/components/ide/SketchCodeEditor'
import { useGuest } from '@/guest/GuestProvider'
import type { GuestDraft } from '@/guest/types'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import {
  formatPreviewError,
  looksLikeProcessingSyntax,
  resolvePreviewError,
  PROCESSING_IN_P5_MESSAGE,
  type PreviewRuntimeError,
} from '@/lib/previewErrors'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

const SANDBOX_CLIENT_ID = 'sandbox-default'

type LocalFile = {
  filename: string
  content: string
  language: string
  is_main: boolean
  asset_type: string
}

function inferAssetType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.pde')) {
    return 'js'
  }
  return 'other'
}

function uniqueFilename(existing: string[], base: string): string {
  if (!existing.includes(base)) return base
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  let n = 2
  while (existing.includes(`${stem}${n}${ext}`)) n += 1
  return `${stem}${n}${ext}`
}

const DEFAULT_P5 = `function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(20);
  fill(123, 97, 255);
  noStroke();
  circle(mouseX, mouseY, 40);
}
`

export function SandboxPage() {
  const { isAuthenticated } = useAuth()
  const { guest, isReady, requireAuth, saveDraft, getDraft, recordScore } =
    useGuest()
  const startersQuery = useQuery({
    queryKey: ['starters'],
    queryFn: getStarters,
  })

  const [title, setTitle] = useState('Sandbox sketch')
  const [sketchType, setSketchType] = useState('p5js')
  const [files, setFiles] = useState<LocalFile[]>([])
  const [activeFilename, setActiveFilename] = useState('')
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewNonce, setPreviewNonce] = useState(0)
  const [runtimeError, setRuntimeError] = useState<PreviewRuntimeError | null>(null)
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null)
  const runIdRef = useRef(0)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!isReady || hydrated.current) return
    hydrated.current = true
    const existing = getDraft(SANDBOX_CLIENT_ID)
    if (existing && existing.files.length) {
      setTitle(existing.title)
      setSketchType(existing.sketch_type || 'p5js')
      const nextFiles = existing.files.map((f) => ({
        filename: f.filename,
        content: f.content,
        language: f.language || 'javascript',
        is_main: f.is_main,
        asset_type: f.asset_type || inferAssetType(f.filename),
      }))
      setFiles(nextFiles)
      setActiveFilename(
        nextFiles.find((f) => f.is_main)?.filename ?? nextFiles[0]?.filename ?? '',
      )
      return
    }
    const starter = startersQuery.data?.p5js
    const code = starter?.code || DEFAULT_P5
    const filename = starter?.filename || 'sketch.js'
    setFiles([
      {
        filename,
        content: code,
        language: 'javascript',
        is_main: true,
        asset_type: 'js',
      },
    ])
    setActiveFilename(filename)
  }, [getDraft, isReady, startersQuery.data])

  const activeFile = useMemo(
    () => files.find((file) => file.filename === activeFilename) ?? null,
    [files, activeFilename],
  )
  const mainFile = useMemo(
    () => files.find((file) => file.is_main) ?? files[0] ?? null,
    [files],
  )

  const updateActiveContent = useCallback(
    (content: string) => {
      setFiles((prev) =>
        prev.map((file) =>
          file.filename === activeFilename ? { ...file, content } : file,
        ),
      )
      setDirty(true)
      setStatus(null)
    },
    [activeFilename],
  )

  const addFile = useCallback(() => {
    const name = uniqueFilename(
      files.map((f) => f.filename),
      'helper.js',
    )
    setFiles((prev) => [
      ...prev,
      {
        filename: name,
        content: '',
        language: 'javascript',
        is_main: false,
        asset_type: inferAssetType(name),
      },
    ])
    setActiveFilename(name)
    setDirty(true)
  }, [files])

  const deleteActiveFile = useCallback(() => {
    if (!activeFile || activeFile.is_main) return
    const remaining = files.filter((f) => f.filename !== activeFilename)
    setFiles(remaining)
    setActiveFilename(
      remaining.find((f) => f.is_main)?.filename ?? remaining[0]?.filename ?? '',
    )
    setDirty(true)
  }, [activeFile, activeFilename, files])

  const runPreview = useCallback(async () => {
    if (!mainFile) return
    setRunning(true)
    setError(null)
    setRuntimeError(null)
    runIdRef.current += 1
    const thisRun = runIdRef.current

    if (sketchType === 'p5js' && looksLikeProcessingSyntax(mainFile.content)) {
      setRuntimeError({
        message: PROCESSING_IN_P5_MESSAGE,
        kind: 'processing-mismatch',
      })
    }

    try {
      const url = await createPreview({
        sketch_type: sketchType,
        main_code: mainFile.content,
        assets: files
          .filter((f) => !f.is_main)
          .map((f) => ({
            asset_type: f.asset_type || inferAssetType(f.filename),
            content: f.content,
          })),
        mode: 'live',
        run_id: thisRun,
      })
      if (runIdRef.current !== thisRun) return
      setPreviewUrl(url)
      setPreviewNonce((n) => n + 1)
      setStatus('Preview updated')
    } catch (err) {
      if (runIdRef.current !== thisRun) return
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      if (runIdRef.current === thisRun) setRunning(false)
    }
  }, [files, mainFile, sketchType])

  const restartPreview = useCallback(() => {
    if (!previewUrl) {
      void runPreview()
      return
    }
    setRuntimeError(null)
    const frame = previewIframeRef.current
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage({ type: 'sketch-restart' }, '*')
      setStatus('Preview restarted')
      return
    }
    setPreviewNonce((n) => n + 1)
    setStatus('Preview restarted')
  }, [previewUrl, runPreview])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'sketch-preview-restart') {
        restartPreview()
        return
      }
      if (data.type !== 'sketch-preview-error') return
      if (data.runId != null && data.runId !== runIdRef.current) return
      setRuntimeError(
        resolvePreviewError(
          {
            message: data.message || 'Sketch error',
            source: data.source,
            line: data.line,
            col: data.col,
            stack: data.stack,
          },
          sketchType,
          mainFile?.content ?? '',
        ),
      )
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [mainFile?.content, restartPreview, sketchType])

  const persistLocal = useCallback(async () => {
    if (!mainFile || !guest) return
    const draft: GuestDraft = {
      client_id: SANDBOX_CLIENT_ID,
      title: title.trim() || 'Sandbox sketch',
      sketch_type: sketchType,
      entry_filename: mainFile.filename,
      files: files.map((f) => ({
        filename: f.filename,
        content: f.content,
        language: f.language,
        is_main: f.is_main,
        asset_type: f.asset_type,
      })),
      updated_at: new Date().toISOString(),
    }
    await saveDraft(draft)
  }, [files, guest, mainFile, saveDraft, sketchType, title])

  const onSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await persistLocal()
      setDirty(false)
      setStatus('Saved locally')
      if (!isAuthenticated) {
        requireAuth({ type: 'save', clientId: SANDBOX_CLIENT_ID })
      }
    } catch {
      setError('Could not save draft locally')
    } finally {
      setSaving(false)
    }
  }, [isAuthenticated, persistLocal, requireAuth])

  // Autosave drafts while guest
  useEffect(() => {
    if (!dirty || !guest || !mainFile) return
    const t = window.setTimeout(() => {
      void persistLocal().then(() => setStatus('Draft autosaved'))
    }, 800)
    return () => window.clearTimeout(t)
  }, [dirty, guest, mainFile, persistLocal])

  useEffect(() => {
    if (!mainFile || previewUrl) return
    void runPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainFile?.filename])

  if (!isReady) {
    return (
      <p className="px-6 py-16 text-center text-sm text-muted">Loading sandbox…</p>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setDirty(true)
            }}
            className="min-w-[12rem] flex-1 rounded-btn border border-border bg-surface px-3 py-2 font-display text-base font-semibold text-foreground"
            aria-label="Sketch title"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runPreview()}
              disabled={running || !mainFile}
              className={secondaryBtnClass}
            >
              {running ? 'Running…' : 'Run'}
            </button>
            <button
              type="button"
              onClick={restartPreview}
              disabled={running || !mainFile}
              className={secondaryBtnClass}
            >
              Restart
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
              className={primaryBtnClass}
            >
              {saving ? 'Saving…' : isAuthenticated ? 'Save to account' : 'Save'}
            </button>
            <button
              type="button"
              className={secondaryBtnClass}
              onClick={() => {
                void recordScore({
                  game: 'sandbox-score',
                  score: Math.floor(Math.random() * 900) + 100,
                  played_at: new Date().toISOString(),
                })
              }}
              title="Demo: post a local high score (Sprint 2)"
            >
              Demo score
            </button>
            <Link to="/gallery" className={secondaryBtnClass}>
              Gallery
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-2 flex max-w-[1400px] flex-wrap items-center gap-3 text-xs text-muted">
          <span>Sandbox · {sketchType}</span>
          {!isAuthenticated ? (
            <span>Playing as {guest?.displayName ?? 'guest'} — sign in to keep forever</span>
          ) : null}
          {dirty ? <span className="text-primary">Unsaved changes</span> : null}
          {status ? <span className="text-primary">{status}</span> : null}
          {error ? (
            <span className="text-destructive" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_minmax(280px,1fr)]">
        <aside className="border-b border-border p-3 lg:border-b-0 lg:border-r">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Files
            </p>
            <button
              type="button"
              onClick={addFile}
              className="text-xs text-primary hover:underline"
            >
              Add
            </button>
          </div>
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file.filename}>
                <button
                  type="button"
                  onClick={() => setActiveFilename(file.filename)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-btn px-2 py-1.5 text-left text-sm',
                    file.filename === activeFilename
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted hover:bg-surface hover:text-foreground',
                  )}
                >
                  <span className="truncate font-mono text-xs">{file.filename}</span>
                  {file.is_main ? (
                    <span className="ml-2 shrink-0 text-[10px] uppercase">main</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          {activeFile && !activeFile.is_main ? (
            <button
              type="button"
              onClick={deleteActiveFile}
              className="mt-4 text-xs text-destructive hover:underline"
            >
              Delete file
            </button>
          ) : null}
        </aside>

        <section className="flex min-h-[320px] flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-3 py-2 font-mono text-xs text-muted">
            {activeFile?.filename ?? '—'}
          </div>
          <div className="min-h-[320px] flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor]:outline-none">
            {activeFile ? (
              <SketchCodeEditor
                key={activeFile.filename}
                filename={activeFile.filename}
                value={activeFile.content}
                onChange={updateActiveContent}
                className="h-full min-h-[320px]"
              />
            ) : null}
          </div>
        </section>

        <section className="flex min-h-[280px] flex-col bg-background">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-muted">
            <span>Live preview</span>
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Open fullscreen
              </a>
            ) : null}
          </div>
          {runtimeError ? (
            <div
              className="border-b border-destructive/40 bg-destructive/10 px-3 py-2"
              role="alert"
            >
              <pre className="max-h-36 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-destructive">
                {formatPreviewError(runtimeError)}
              </pre>
            </div>
          ) : null}
          <div className="relative min-h-[280px] flex-1 bg-[#111]">
            {previewUrl ? (
              <iframe
                ref={previewIframeRef}
                key={`${previewUrl}#${previewNonce}`}
                title="Sketch preview"
                src={previewUrl}
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                {running ? 'Starting preview…' : 'Run to preview'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
