import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Sparkles } from 'lucide-react'
import { ApiError } from '@/api/client'
import {
  deleteSketch,
  getManageTags,
  getSketchSettings,
  createPreview,
  publishSketch,
  updateSketchSettings,
  uploadSketchAppIcon,
  uploadSketchThumbnail,
} from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import {
  dangerBtnClass,
  fieldError,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/lib/form'
import {
  APP_ICON_CAPTURE_SIZE,
  THUMBNAIL_CAPTURE_SIZE,
  blobToFile,
  blobToSquareIcon,
  captureFromEmbedUrl,
} from '@/lib/sketchCapture'
import { cn } from '@/lib/utils'

export function SketchSettingsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const isSetup = searchParams.get('setup') === '1'
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const settingsQuery = useQuery({
    queryKey: ['sketch-settings', slug],
    queryFn: () => getSketchSettings(slug!),
    enabled: Boolean(slug) && isAuthenticated,
  })
  const tagsQuery = useQuery({
    queryKey: ['manage-tags'],
    queryFn: getManageTags,
    enabled: isAuthenticated,
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('draft')
  const [isGame, setIsGame] = useState(false)
  const [scoreboardSlug, setScoreboardSlug] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [appIconPreview, setAppIconPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [generatingThumb, setGeneratingThumb] = useState(false)
  const [generatingIcon, setGeneratingIcon] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const sketch = settingsQuery.data?.sketch
    if (!sketch) return
    setTitle(sketch.title)
    setDescription(sketch.description)
    setStatus(sketch.status)
    setIsGame(Boolean(sketch.is_game))
    setScoreboardSlug(sketch.scoreboard_slug || sketch.slug || '')
    setSelectedTags(sketch.tags.map((t) => t.slug))
    setThumbnailPreview(sketch.thumbnail_card_url || sketch.thumbnail)
    setAppIconPreview(sketch.app_icon)
  }, [settingsQuery.data])

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (settingsQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Cannot open settings</h1>
        <p className="mt-2 text-sm text-muted">
          {settingsQuery.error instanceof ApiError
            ? settingsQuery.error.message
            : 'Something went wrong.'}
        </p>
        <Link to="/account" className="mt-4 inline-block text-primary hover:underline">
          Back to account
        </Link>
      </div>
    )
  }

  function toggleTag(tagSlug: string) {
    setSelectedTags((prev) =>
      prev.includes(tagSlug)
        ? prev.filter((s) => s !== tagSlug)
        : [...prev, tagSlug],
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!slug) return
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    setMessage(null)
    try {
      const payload: {
        title: string
        description: string
        tags: string[]
        status?: string
        is_game: boolean
        scoreboard_slug?: string
      } = {
        title,
        description,
        tags: selectedTags,
        is_game: isGame,
      }
      if (isGame) {
        payload.scoreboard_slug = scoreboardSlug.trim()
      }
      if (settingsQuery.data?.is_admin) {
        payload.status = status
      }
      await updateSketchSettings(slug, payload)
      setMessage('Settings saved.')
      await settingsQuery.refetch()
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Could not save settings.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function onPublish() {
    if (!slug) return
    setPublishing(true)
    setFormError(null)
    setMessage(null)
    try {
      await publishSketch(slug)
      setMessage('Published.')
      setStatus('published')
      await settingsQuery.refetch()
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message)
      else setFormError('Could not publish.')
    } finally {
      setPublishing(false)
    }
  }

  async function onDelete() {
    if (!slug) return
    const current = settingsQuery.data?.sketch
    if (!current) return
    const kind = current.is_game ? 'game' : 'sketch'
    const confirmed = window.confirm(
      `Delete “${current.title}” permanently? This ${kind} cannot be recovered.`,
    )
    if (!confirmed) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSketch(slug)
      await queryClient.invalidateQueries({ queryKey: ['account-sketches'] })
      await queryClient.invalidateQueries({ queryKey: ['sketches'] })
      await queryClient.invalidateQueries({ queryKey: ['games'] })
      navigate('/account', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setDeleteError(err.message)
      else setDeleteError('Could not delete.')
      setDeleting(false)
    }
  }

  async function onThumbnailChange(file: File | null) {
    if (!file || !slug) return
    setUploading(true)
    setFormError(null)
    setMessage(null)
    try {
      const result = await uploadSketchThumbnail(slug, file)
      setThumbnailPreview(result.thumbnail_card_url || result.url)
      setMessage('Thumbnail updated.')
      await settingsQuery.refetch()
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message)
      else setFormError('Could not upload thumbnail.')
    } finally {
      setUploading(false)
    }
  }

  async function onAppIconChange(file: File | null) {
    if (!file || !slug) return
    setUploadingIcon(true)
    setFormError(null)
    setMessage(null)
    try {
      const result = await uploadSketchAppIcon(slug, file)
      setAppIconPreview(result.app_icon || result.url)
      setMessage('App icon updated.')
      await settingsQuery.refetch()
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message)
      else setFormError('Could not upload app icon.')
    } finally {
      setUploadingIcon(false)
    }
  }

  async function resolveCaptureUrl(): Promise<string> {
    const sketch = settingsQuery.data?.sketch
    if (!sketch) {
      throw new Error('Sketch is still loading.')
    }

    const files =
      sketch.files && sketch.files.length > 0
        ? sketch.files
        : [
            {
              filename: sketch.entry_filename || 'sketch.js',
              content: sketch.code || '',
              language: 'javascript',
              is_main: true,
              asset_type: 'js',
              asset_id: null,
            },
          ]
    const main = files.find((f) => f.is_main) ?? files[0]
    if (main?.content?.trim()) {
      try {
        return (
          await createPreview({
            sketch_type: sketch.sketch_type,
            main_code: main.content,
            assets: files
              .filter((f) => !f.is_main)
              .map((f) => ({
                asset_type: f.asset_type || 'js',
                content: f.content,
              })),
            mode: 'fullscreen',
            run_id: Date.now(),
          })
        ).url
      } catch {
        /* fall through to saved embed */
      }
    }

    if (sketch.embed_url) return sketch.embed_url
    throw new Error('No runnable sketch source found. Open the editor and save first.')
  }

  async function onGenerateThumbnail() {
    if (!slug) return
    setGeneratingThumb(true)
    setFormError(null)
    setMessage('Capturing thumbnail…')
    try {
      const captureUrl = await resolveCaptureUrl()
      const blob = await captureFromEmbedUrl(captureUrl, THUMBNAIL_CAPTURE_SIZE)
      const file = blobToFile(blob, 'thumbnail.png')
      const result = await uploadSketchThumbnail(slug, file)
      setThumbnailPreview(result.thumbnail_card_url || result.url)
      setMessage('Thumbnail generated.')
      await settingsQuery.refetch()
    } catch (err) {
      setMessage(null)
      setFormError(
        err instanceof Error
          ? err.message
          : 'Could not generate a thumbnail from the sketch.',
      )
    } finally {
      setGeneratingThumb(false)
    }
  }

  async function onGenerateIcon() {
    if (!slug) return
    setGeneratingIcon(true)
    setFormError(null)
    setMessage('Capturing icon…')
    try {
      const captureUrl = await resolveCaptureUrl()
      const captured = await captureFromEmbedUrl(captureUrl, APP_ICON_CAPTURE_SIZE)
      const iconBlob = await blobToSquareIcon(captured)
      const file = blobToFile(iconBlob, 'app-icon.png')
      const result = await uploadSketchAppIcon(slug, file)
      setAppIconPreview(result.app_icon || result.url)
      setMessage('App icon generated.')
      await settingsQuery.refetch()
    } catch (err) {
      setMessage(null)
      setFormError(
        err instanceof Error
          ? err.message
          : 'Could not generate an app icon from the sketch.',
      )
    } finally {
      setGeneratingIcon(false)
    }
  }

  const sketch = settingsQuery.data?.sketch
  const isAdmin = settingsQuery.data?.is_admin ?? false
  const canGenerate = Boolean(
    sketch?.embed_url || sketch?.code || (sketch?.files && sketch.files.length > 0),
  )
  const busyMedia = uploading || uploadingIcon || generatingThumb || generatingIcon

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {isSetup ? 'Setup' : 'Settings'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {sketch?.title ?? 'Loading…'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Description, tags, thumbnail, and mobile app icon.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {slug ? (
            <Link to={`/sketches/${slug}/edit`} className={secondaryBtnClass}>
              Edit source
            </Link>
          ) : null}
          {slug ? (
            <Link to={`/sketches/${slug}`} className={secondaryBtnClass}>
              View
            </Link>
          ) : null}
        </div>
      </div>

      {settingsQuery.isPending && !sketch ? (
        <p className="text-sm text-muted">Loading settings…</p>
      ) : (
        <form className="space-y-6" onSubmit={onSubmit}>
          <label className={labelClass}>
            <span className="text-muted">Title</span>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {fieldError(fieldErrors, 'title') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'title')}
              </span>
            ) : null}
          </label>

          <label className={labelClass}>
            <span className="text-muted">Description (markdown)</span>
            <textarea
              className={`${inputClass} min-h-[160px]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a markdown description…"
            />
            {fieldError(fieldErrors, 'description') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'description')}
              </span>
            ) : null}
          </label>

          <div className="space-y-3">
            <p className="text-sm text-muted">Tags</p>
            <div className="flex flex-wrap gap-2">
              {(tagsQuery.data ?? []).map((tag) => {
                const active = selectedTags.includes(tag.slug)
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => toggleTag(tag.slug)}
                    className={cn(
                      'rounded-btn border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-muted hover:text-foreground',
                    )}
                  >
                    {tag.name}
                  </button>
                )
              })}
              {!tagsQuery.isPending && (tagsQuery.data?.length ?? 0) === 0 ? (
                <span className="text-xs text-muted">No tags available yet.</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Thumbnail</p>
              <p className="mt-1 text-xs text-muted">
                Gallery card image · 16:10. Captures in your browser (~a few seconds).
              </p>
            </div>
            {thumbnailPreview ? (
              <div className="aspect-[16/10] w-full max-w-md overflow-hidden rounded-xl border border-border bg-[#0d0d0d]">
                <img
                  src={thumbnailPreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[16/10] w-full max-w-md items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
                No thumbnail yet
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canGenerate || busyMedia}
                onClick={() => void onGenerateThumbnail()}
                className={cn(primaryBtnClass, 'gap-1.5')}
              >
                <Sparkles size={15} aria-hidden />
                {generatingThumb
                  ? 'Generating…'
                  : thumbnailPreview
                    ? 'Regenerate thumbnail'
                    : 'Generate thumbnail'}
              </button>
              <label
                className={cn(
                  secondaryBtnClass,
                  'cursor-pointer gap-1.5',
                  busyMedia && 'pointer-events-none opacity-60',
                )}
              >
                <ImagePlus size={15} aria-hidden />
                {uploading ? 'Uploading…' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busyMedia}
                  onChange={(e) =>
                    void onThumbnailChange(e.target.files?.[0] ?? null)
                  }
                />
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-foreground">App icon</p>
              <p className="mt-1 text-xs text-muted">
                Mobile gallery list mark · square 192×192. Captures in your browser.
              </p>
            </div>
            <div className="flex items-end gap-4">
              {appIconPreview ? (
                <img
                  src={appIconPreview}
                  alt=""
                  className="sketch-app-icon shrink-0"
                />
              ) : (
                <div className="sketch-app-icon shrink-0 text-[0.7rem] !text-muted">
                  —
                </div>
              )}
              <p className="pb-1 text-[11px] text-muted">
                Preview at list size (3.25rem)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canGenerate || busyMedia}
                onClick={() => void onGenerateIcon()}
                className={cn(primaryBtnClass, 'gap-1.5')}
              >
                <Sparkles size={15} aria-hidden />
                {generatingIcon
                  ? 'Generating…'
                  : appIconPreview
                    ? 'Regenerate icon'
                    : 'Generate icon'}
              </button>
              <label
                className={cn(
                  secondaryBtnClass,
                  'cursor-pointer gap-1.5',
                  busyMedia && 'pointer-events-none opacity-60',
                )}
              >
                <ImagePlus size={15} aria-hidden />
                {uploadingIcon ? 'Uploading…' : 'Upload icon'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busyMedia}
                  onChange={(e) =>
                    void onAppIconChange(e.target.files?.[0] ?? null)
                  }
                />
              </label>
            </div>
          </div>

          {isAdmin ? (
            <label className={labelClass}>
              <span className="text-muted">Status (staff)</span>
              <select
                className={inputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {(settingsQuery.data?.status_choices ?? []).map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-muted">
              Status:{' '}
              <span className="font-medium text-foreground">{status}</span>
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-btn border border-border/80 bg-background/40 px-3 py-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
              checked={isGame}
              onChange={(e) => setIsGame(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                List as game
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Play-only on the Games page — visitors cannot see source, fork, or
                open the editor.
              </span>
            </span>
          </label>

          {isGame ? (
            <label className={labelClass}>
              <span className="text-muted">Scoreboard slug</span>
              <input
                className={inputClass}
                value={scoreboardSlug}
                onChange={(e) => setScoreboardSlug(e.target.value)}
                placeholder={slug || 'game-slug'}
              />
              <span className="mt-1 block text-xs text-muted">
                Must match the <code className="text-foreground">game</code> field in{' '}
                <code className="text-foreground">sketches101-score</code> postMessage.
                Defaults to this sketch&apos;s slug.
              </span>
            </label>
          ) : null}

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-primary" role="status">
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className={primaryBtnClass}>
              {submitting ? 'Saving…' : 'Save settings'}
            </button>
            {status !== 'published' ? (
              <button
                type="button"
                disabled={publishing}
                onClick={() => void onPublish()}
                className={secondaryBtnClass}
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            ) : null}
          </div>
        </form>
      )}

      {sketch ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Delete {sketch.is_game ? 'game' : 'sketch'}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Permanently remove this {sketch.is_game ? 'game' : 'sketch'} and its
            files. Owners and admins can delete. This cannot be undone.
          </p>
          {deleteError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={deleting || busyMedia}
            onClick={() => void onDelete()}
            className={`${dangerBtnClass} mt-4`}
          >
            {deleting
              ? 'Deleting…'
              : `Delete ${sketch.is_game ? 'game' : 'sketch'}`}
          </button>
        </section>
      ) : null}
    </div>
  )
}
