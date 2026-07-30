import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import {
  createPreview,
  getManagedSketch,
  saveSketchSource,
} from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import { SketchCodeEditor } from '@/components/ide/SketchCodeEditor'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import {
  formatPreviewError,
  looksLikeProcessingSyntax,
  resolvePreviewError,
  PROCESSING_IN_P5_MESSAGE,
  type PreviewRuntimeError,
} from '@/lib/previewErrors'
import { cn } from '@/lib/utils'
import type { SourceFile } from '@/types/sketch'

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

function filesFromSketch(sketch: {
  files?: SourceFile[]
  entry_filename: string
  code: string
}): SourceFile[] {
  if (sketch.files && sketch.files.length > 0) {
    return sketch.files.map((file) => ({ ...file }))
  }
  return [
    {
      filename: sketch.entry_filename || 'sketch.js',
      content: sketch.code || '',
      language: 'javascript',
      is_main: true,
      asset_type: 'js',
      asset_id: null,
    },
  ]
}

export function EditSketchPage() {
  const { slug } = useParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const sketchQuery = useQuery({
    queryKey: ['managed-sketch', slug],
    queryFn: () => getManagedSketch(slug!),
    enabled: Boolean(slug) && isAuthenticated,
  })

  const [title, setTitle] = useState('')
  const [files, setFiles] = useState<SourceFile[]>([])
  const [activeFilename, setActiveFilename] = useState('')
  const [deletedAssetIds, setDeletedAssetIds] = useState<number[]>([])
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
  const initializedSlug = useRef<string | null>(null)

  useEffect(() => {
    const sketch = sketchQuery.data
    if (!sketch || !slug) return
    if (initializedSlug.current === slug && dirty) return
    initializedSlug.current = slug
    setTitle(sketch.title)
    const nextFiles = filesFromSketch(sketch)
    setFiles(nextFiles)
    setActiveFilename(nextFiles.find((f) => f.is_main)?.filename ?? nextFiles[0]?.filename ?? '')
    setDeletedAssetIds([])
    setDirty(false)
    setError(null)
    setStatus(null)
  }, [sketchQuery.data, slug, dirty])

  const activeFile = useMemo(
    () => files.find((file) => file.filename === activeFilename) ?? null,
    [files, activeFilename],
  )

  const mainFile = useMemo(
    () => files.find((file) => file.is_main) ?? files[0] ?? null,
    [files],
  )

  const updateActiveContent = useCallback((content: string) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.filename === activeFilename ? { ...file, content } : file,
      ),
    )
    setDirty(true)
    setStatus(null)
  }, [activeFilename])

  const renameActiveFile = useCallback(
    (nextName: string) => {
      const trimmed = nextName.trim()
      if (!trimmed || !activeFile || activeFile.is_main) return
      if (files.some((f) => f.filename === trimmed && f.filename !== activeFilename)) {
        setError('A file with that name already exists.')
        return
      }
      setFiles((prev) =>
        prev.map((file) =>
          file.filename === activeFilename
            ? {
                ...file,
                filename: trimmed,
                asset_type: inferAssetType(trimmed),
              }
            : file,
        ),
      )
      setActiveFilename(trimmed)
      setDirty(true)
    },
    [activeFile, activeFilename, files],
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
        asset_id: null,
      },
    ])
    setActiveFilename(name)
    setDirty(true)
  }, [files])

  const deleteActiveFile = useCallback(() => {
    if (!activeFile || activeFile.is_main) return
    if (activeFile.asset_id != null) {
      setDeletedAssetIds((prev) => [...prev, activeFile.asset_id as number])
    }
    const remaining = files.filter((f) => f.filename !== activeFilename)
    setFiles(remaining)
    setActiveFilename(remaining.find((f) => f.is_main)?.filename ?? remaining[0]?.filename ?? '')
    setDirty(true)
  }, [activeFile, activeFilename, files])

  const runPreview = useCallback(async () => {
    if (!mainFile || !sketchQuery.data) return
    setRunning(true)
    setError(null)
    setRuntimeError(null)
    runIdRef.current += 1
    const thisRun = runIdRef.current

    if (
      sketchQuery.data.sketch_type === 'p5js' &&
      looksLikeProcessingSyntax(mainFile.content)
    ) {
      setRuntimeError({
        message: PROCESSING_IN_P5_MESSAGE,
        kind: 'processing-mismatch',
      })
    }

    try {
      const url = await createPreview({
        sketch_type: sketchQuery.data.sketch_type,
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
      setError(err instanceof ApiError ? err.message : 'Preview failed')
    } finally {
      if (runIdRef.current === thisRun) setRunning(false)
    }
  }, [files, mainFile, sketchQuery.data])

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

  // Runtime errors from embed (error-reporter.js)
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
      const sketchType = sketchQuery.data?.sketch_type ?? 'p5js'
      const mainCode = mainFile?.content ?? ''
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
          mainCode,
        ),
      )
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [mainFile?.content, restartPreview, sketchQuery.data?.sketch_type])

  const save = useCallback(async () => {
    if (!slug || !mainFile) return
    setSaving(true)
    setError(null)
    try {
      const sketch = await saveSketchSource(slug, {
        title,
        entry_filename: mainFile.filename,
        files,
        deleted_asset_ids: deletedAssetIds,
      })
      initializedSlug.current = slug
      setFiles(filesFromSketch(sketch))
      setDeletedAssetIds([])
      setDirty(false)
      setStatus('Saved')
      setTitle(sketch.title)
      await sketchQuery.refetch()
      // Refresh preview after save
      await runPreview()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }, [deletedAssetIds, files, mainFile, runPreview, sketchQuery, slug, title])

  // Auto-run once when sketch loads
  useEffect(() => {
    if (!sketchQuery.data || !mainFile) return
    if (previewUrl) return
    void runPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketchQuery.data?.slug])

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (sketchQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Cannot open editor</h1>
        <p className="mt-2 text-sm text-muted">
          {sketchQuery.error instanceof ApiError
            ? sketchQuery.error.message
            : 'Something went wrong.'}
        </p>
        <Link to="/account" className="mt-4 inline-block text-primary hover:underline">
          Back to account
        </Link>
      </div>
    )
  }

  const sketch = sketchQuery.data

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
              title="Restart the current preview without recompiling"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !dirty}
              className={primaryBtnClass}
            >
              {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
            </button>
            {slug ? (
              <Link to={`/sketches/${slug}/settings`} className={secondaryBtnClass}>
                Settings
              </Link>
            ) : null}
            {slug ? (
              <Link to={`/sketches/${slug}`} className={secondaryBtnClass}>
                View
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mx-auto mt-2 flex max-w-[1400px] items-center gap-3 text-xs text-muted">
          <span>{sketch?.sketch_type_label ?? '…'}</span>
          {dirty ? <span className="text-primary">Unsaved changes</span> : null}
          {status ? <span className="text-primary">{status}</span> : null}
          {error ? (
            <span className="text-destructive" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </div>

      {sketchQuery.isPending && !sketch ? (
        <p className="px-6 py-10 text-sm text-muted">Loading editor…</p>
      ) : (
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
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <label className="block text-xs text-muted">
                  Rename
                  <input
                    className="mt-1 w-full rounded-btn border border-border bg-surface px-2 py-1.5 font-mono text-xs text-foreground"
                    defaultValue={activeFile.filename}
                    key={activeFile.filename}
                    onBlur={(e) => renameActiveFile(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameActiveFile((e.target as HTMLInputElement).value)
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={deleteActiveFile}
                  className="text-xs text-destructive hover:underline"
                >
                  Delete file
                </button>
              </div>
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
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-destructive">
                    {runtimeError.kind === 'processing-mismatch'
                      ? 'Sketch type mismatch'
                      : 'Sketch error'}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-foreground"
                    onClick={() => setRuntimeError(null)}
                  >
                    Dismiss
                  </button>
                </div>
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
      )}
    </div>
  )
}
