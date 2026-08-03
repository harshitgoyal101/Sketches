import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { ApiError } from '@/api/client'
import {
  createPreview,
  getManagedSketch,
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
} from '@/components/ide/ideFiles'
import { SketchIdeShell } from '@/components/ide/SketchIdeShell'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import {
  looksLikeProcessingSyntax,
  resolvePreviewError,
  PROCESSING_IN_P5_MESSAGE,
  type PreviewRuntimeError,
} from '@/lib/previewErrors'
import { cn, toEmbedSrc } from '@/lib/utils'
import type { SourceFile } from '@/types/sketch'

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
  const [filesOpen, setFilesOpen] = useState(() => readFilesOpenPreference())
  const [runtimeError, setRuntimeError] = useState<PreviewRuntimeError | null>(
    null,
  )
  const runtimeErrorRef = useRef<PreviewRuntimeError | null>(null)
  runtimeErrorRef.current = runtimeError
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
    setActiveFilename(
      nextFiles.find((f) => f.is_main)?.filename ?? nextFiles[0]?.filename ?? '',
    )
    setDeletedAssetIds([])
    setDirty(false)
    setError(null)
    setStatus(null)
  }, [sketchQuery.data, slug, dirty])

  useEffect(() => {
    writeFilesOpenPreference(filesOpen)
  }, [filesOpen])

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
        asset_id: null,
      },
    ])
    setActiveFilename(name)
    setDirty(true)
  }, [files])

  const deleteFile = useCallback(
    (filename: string) => {
      const target = files.find((f) => f.filename === filename)
      if (!target || target.is_main) return
      if (target.asset_id != null) {
        setDeletedAssetIds((prev) => [...prev, target.asset_id as number])
      }
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
      setPreviewUrl(toEmbedSrc(url))
      setPreviewNonce((n) => n + 1)
      setStatus('Live')
    } catch (err) {
      if (runIdRef.current !== thisRun) return
      setError(err instanceof ApiError ? err.message : 'Preview failed')
    } finally {
      if (runIdRef.current === thisRun) setRunning(false)
    }
  }, [files, mainFile, sketchQuery.data])

  useEffect(() => {
    if (!mainFile || !sketchQuery.data) return
    const timer = window.setTimeout(() => {
      void runPreview()
    }, IDE_AUTO_RUN_MS)
    return () => window.clearTimeout(timer)
  }, [files, mainFile, runPreview, sketchQuery.data?.slug])

  const restartPreview = useCallback(() => {
    if (!previewUrl) {
      void runPreview()
      return
    }
    setRuntimeError(null)
    setPreviewNonce((n) => n + 1)
    setStatus('Restarted')
  }, [previewUrl, runPreview])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'sketch-preview-restart') {
        if (runtimeErrorRef.current) return
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
          sketchQuery.data?.sketch_type ?? 'p5js',
          mainFile?.content ?? '',
        ),
      )
      setStatus('Error')
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
      await runPreview()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }, [deletedAssetIds, files, mainFile, runPreview, sketchQuery, slug, title])

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

  return (
    <SketchIdeShell
      eyebrow={sketchQuery.data?.sketch_type_label ?? 'Editor'}
      title={title}
      onTitleChange={(next) => {
        setTitle(next)
        setDirty(true)
      }}
      running={running}
      status={status}
      dirty={dirty}
      error={error}
      loading={sketchQuery.isPending && !sketchQuery.data}
      loadingLabel="Loading editor…"
      toolbar={
        <>
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
            onClick={() => void save()}
            disabled={saving || !dirty}
            className={cn(primaryBtnClass, 'h-8 cursor-pointer !px-3 !py-1 text-xs')}
            title="Save (Ctrl/⌘S)"
          >
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
          {slug ? (
            <Link
              to={`/sketches/${slug}/settings`}
              className={cn(secondaryBtnClass, 'h-8 cursor-pointer !px-2.5 !py-1 text-xs')}
            >
              Settings
            </Link>
          ) : null}
          {slug ? (
            <Link
              to={`/sketches/${slug}`}
              className={cn(secondaryBtnClass, 'h-8 cursor-pointer !px-2.5 !py-1 text-xs')}
            >
              View
            </Link>
          ) : null}
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
      previewUrl={previewUrl}
      previewNonce={previewNonce}
      runtimeError={runtimeError}
      onRestart={restartPreview}
      onDismissError={() => setRuntimeError(null)}
      onPreviewResizeRestart={restartPreview}
      onSave={save}
    />
  )
}
