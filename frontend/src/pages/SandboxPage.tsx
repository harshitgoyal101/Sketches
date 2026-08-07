import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { ApiError } from '@/api/client'
import {
  createPreview,
  createSketch,
  getStarters,
  saveSketchSource,
} from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import {
  IDE_AUTO_RUN_MS,
  inferAssetType,
  languageFromFilename,
  readFilesOpenPreference,
  uniqueFilename,
  writeFilesOpenPreference,
  type IdeFile,
} from '@/components/ide/ideFiles'
import { SketchIdeShell } from '@/components/ide/SketchIdeShell'
import { useGuest } from '@/guest/GuestProvider'
import type { GuestDraft } from '@/guest/types'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import {
  looksLikeProcessingSyntax,
  resolvePreviewError,
  PROCESSING_IN_P5_MESSAGE,
  type PreviewRuntimeError,
} from '@/lib/previewErrors'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

const SANDBOX_CLIENT_ID = 'sandbox-default'
const SANDBOX_SLUG_KEY = 'sketches101-sandbox-slug'

const DEFAULT_P5 = `function setup() {
  createCanvas(windowWidth, windowHeight);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
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
  const navigate = useNavigate()
  const { guest, isReady, requireAuth, saveDraft, getDraft, recordScore } =
    useGuest()
  const startersQuery = useQuery({
    queryKey: ['starters'],
    queryFn: getStarters,
  })

  const [title, setTitle] = useState('Sandbox sketch')
  const [sketchType, setSketchType] = useState('p5js')
  const [files, setFiles] = useState<IdeFile[]>([])
  const [activeFilename, setActiveFilename] = useState('')
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [accountSlug, setAccountSlug] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SANDBOX_SLUG_KEY)
    } catch {
      return null
    }
  })
  const [running, setRunning] = useState(false)
  const [previewPaused, setPreviewPaused] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewNonce, setPreviewNonce] = useState(0)
  const [filesOpen, setFilesOpen] = useState(() => readFilesOpenPreference())
  const [runtimeError, setRuntimeError] = useState<PreviewRuntimeError | null>(
    null,
  )
  const runtimeErrorRef = useRef<PreviewRuntimeError | null>(null)
  runtimeErrorRef.current = runtimeError
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
        nextFiles.find((f) => f.is_main)?.filename ??
          nextFiles[0]?.filename ??
          '',
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

  const deleteFile = useCallback(
    (filename: string) => {
      const target = files.find((f) => f.filename === filename)
      if (!target || target.is_main) return
      const remaining = files.filter((f) => f.filename !== filename)
      setFiles(remaining)
      if (activeFilename === filename) {
        setActiveFilename(
          remaining.find((f) => f.is_main)?.filename ??
            remaining[0]?.filename ??
            '',
        )
      }
      setDirty(true)
    },
    [activeFilename, files],
  )

  const renameFile = useCallback(
    (from: string, to: string) => {
      const target = files.find((f) => f.filename === from)
      if (!target || target.is_main) return false
      if (files.some((f) => f.filename === to)) {
        setError('A file with that name already exists.')
        return false
      }
      setFiles((prev) =>
        prev.map((file) =>
          file.filename === from
            ? {
                ...file,
                filename: to,
                language: languageFromFilename(to),
                asset_type: inferAssetType(to),
              }
            : file,
        ),
      )
      if (activeFilename === from) setActiveFilename(to)
      setDirty(true)
      setError(null)
      return true
    },
    [activeFilename, files],
  )

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
      const preview = await createPreview({
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
      setPreviewHtml(preview.html)
      setPreviewNonce((n) => n + 1)
      setStatus('Live')
    } catch (err) {
      if (runIdRef.current !== thisRun) return
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      if (runIdRef.current === thisRun) setRunning(false)
    }
  }, [files, mainFile, sketchType])

  useEffect(() => {
    if (!mainFile || previewPaused) return
    const timer = window.setTimeout(() => {
      void runPreview()
    }, IDE_AUTO_RUN_MS)
    return () => window.clearTimeout(timer)
  }, [files, sketchType, mainFile, previewPaused, runPreview])

  const togglePreviewPause = useCallback(() => {
    setPreviewPaused((paused) => {
      const next = !paused
      if (next) {
        setStatus('Paused')
        setRunning(false)
      } else {
        setStatus('Live')
        queueMicrotask(() => {
          void runPreview()
        })
      }
      return next
    })
  }, [runPreview])

  const restartPreview = useCallback(() => {
    if (!previewHtml) {
      void runPreview()
      return
    }
    setRuntimeError(null)
    setPreviewNonce((n) => n + 1)
    setStatus(previewPaused ? 'Paused' : 'Restarted')
  }, [previewHtml, previewPaused, runPreview])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'sketch-preview-restart') {
        if (runtimeErrorRef.current || previewPaused) return
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
      setStatus('Error')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [mainFile?.content, previewPaused, restartPreview, sketchType])

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

  const saveToAccount = useCallback(async () => {
    if (!mainFile) return
    const sketchTitle = title.trim() || 'Sandbox sketch'
    const sourceFiles = files.map((f) => ({
      filename: f.filename,
      content: f.content,
      language: f.language,
      is_main: f.is_main,
      asset_type: f.asset_type,
      asset_id: null as number | null,
    }))

    let slug = accountSlug
    if (slug) {
      try {
        await saveSketchSource(slug, {
          title: sketchTitle,
          entry_filename: mainFile.filename,
          files: sourceFiles,
        })
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          slug = null
        } else {
          throw err
        }
      }
    }

    if (!slug) {
      const created = await createSketch({
        title: sketchTitle,
        sketch_type: sketchType,
        entry_filename: mainFile.filename,
        code: mainFile.content,
      })
      slug = created.slug
      if (files.length > 1 || files.some((f) => !f.is_main)) {
        await saveSketchSource(slug, {
          title: sketchTitle,
          entry_filename: mainFile.filename,
          files: sourceFiles,
        })
      }
      setAccountSlug(slug)
      try {
        sessionStorage.setItem(SANDBOX_SLUG_KEY, slug)
      } catch {
        /* ignore */
      }
    }

    setDirty(false)
    setStatus('Saved to account')
    navigate(`/sketches/${slug}/edit`, { replace: true })
  }, [accountSlug, files, mainFile, navigate, sketchType, title])

  const onSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      if (isAuthenticated) {
        await saveToAccount()
        return
      }
      await persistLocal()
      setDirty(false)
      setStatus('Saved locally')
      requireAuth({ type: 'save', clientId: SANDBOX_CLIENT_ID })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isAuthenticated
            ? 'Could not save to account'
            : 'Could not save draft locally',
      )
    } finally {
      setSaving(false)
    }
  }, [isAuthenticated, persistLocal, requireAuth, saveToAccount])

  useEffect(() => {
    writeFilesOpenPreference(filesOpen)
  }, [filesOpen])

  useEffect(() => {
    if (!dirty || !guest || !mainFile) return
    const t = window.setTimeout(() => {
      void persistLocal().then(() => setStatus('Draft autosaved'))
    }, 800)
    return () => window.clearTimeout(t)
  }, [dirty, guest, mainFile, persistLocal])

  if (!isReady) {
    return (
      <p className="px-6 py-16 text-center text-sm text-muted">
        Loading sandbox…
      </p>
    )
  }

  return (
    <SketchIdeShell
      eyebrow="Sandbox"
      title={title}
      onTitleChange={(next) => {
        setTitle(next)
        setDirty(true)
      }}
      running={running}
      previewPaused={previewPaused}
      status={status}
      dirty={dirty}
      error={error}
      toolbar={
        <>
          <button
            type="button"
            onClick={togglePreviewPause}
            disabled={!mainFile}
            className={cn(secondaryBtnClass, 'h-8 cursor-pointer gap-1.5 !px-2.5 !py-1 text-xs')}
            title={
              previewPaused
                ? 'Resume live preview (auto-reload while editing)'
                : 'Pause live preview (stop auto-reload while editing)'
            }
            aria-pressed={previewPaused}
          >
            {previewPaused ? (
              <Play size={13} aria-hidden />
            ) : (
              <Pause size={13} aria-hidden />
            )}
            {previewPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={restartPreview}
            disabled={!mainFile}
            className={cn(secondaryBtnClass, 'h-8 cursor-pointer gap-1.5 !px-2.5 !py-1 text-xs')}
            title="Restart preview"
          >
            <RotateCcw size={13} aria-hidden />
            Restart
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className={cn(primaryBtnClass, 'h-8 cursor-pointer !px-3 !py-1 text-xs')}
            title="Save (Ctrl/⌘S)"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link
            to="/gallery"
            className={cn(secondaryBtnClass, 'h-8 cursor-pointer !px-2.5 !py-1 text-xs')}
          >
            Gallery
          </Link>
        </>
      }
      files={files}
      activeFilename={activeFilename}
      filesOpen={filesOpen}
      onFilesOpenChange={setFilesOpen}
      onSelectFile={setActiveFilename}
      onAddFile={addFile}
      onRenameFile={renameFile}
      onDeleteFile={deleteFile}
      onRenameError={(message) => setError(message)}
      activeFile={activeFile}
      onChangeContent={updateActiveContent}
      previewHtml={previewHtml}
      previewNonce={previewNonce}
      runtimeError={runtimeError}
      onRestart={restartPreview}
      onDismissError={() => setRuntimeError(null)}
      onPreviewResizeRestart={previewPaused ? () => {} : restartPreview}
      onSave={onSave}
      footer={
        <button
          type="button"
          className="sr-only"
          tabIndex={-1}
          onClick={() => {
            void recordScore({
              game: 'sandbox-score',
              score: Math.floor(Math.random() * 900) + 100,
              played_at: new Date().toISOString(),
            })
          }}
        >
          Demo score
        </button>
      }
    />
  )
}
