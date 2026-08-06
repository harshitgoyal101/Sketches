import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, Maximize2 } from 'lucide-react'
import { useSketch } from '@/hooks/useSketches'
import { ApiError } from '@/api/client'
import { forkSketch } from '@/api/sketches'
import { SketchCardView } from '@/components/SketchCardView'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { useGuest } from '@/guest/GuestProvider'
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks'
import { recordRecentView } from '@/lib/recentViews'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import { cn, toEmbedSrc } from '@/lib/utils'

function fullscreenEmbedSrc(url: string): string {
  const path = toEmbedSrc(url)
  try {
    const parsed = new URL(path, window.location.origin)
    parsed.searchParams.set('fullscreen', '1')
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return path.includes('?') ? `${path}&fullscreen=1` : `${path}?fullscreen=1`
  }
}

export function SketchDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { requireAuth } = useGuest()
  const { data: sketch, isPending, error, refetch } = useSketch(slug)
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [stageFullscreen, setStageFullscreen] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const notFound = error instanceof ApiError && error.status === 404

  const embedSrc = useMemo(
    () => (sketch?.embed_url ? fullscreenEmbedSrc(sketch.embed_url) : null),
    [sketch?.embed_url],
  )

  useEffect(() => {
    if (!sketch?.slug) return
    recordRecentView({
      slug: sketch.slug,
      title: sketch.title,
      thumb: sketch.thumbnail_card_url || sketch.thumbnail,
    })
    setSaved(isBookmarked(sketch.slug))
  }, [sketch])

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

  async function toggleStageFullscreen() {
    const stage = stageRef.current
    if (!stage) return

    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen()
        setStageFullscreen(false)
        return
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      await stage.requestFullscreen()
      setStageFullscreen(true)
    } catch {
      // Fallback: CSS viewport takeover when Fullscreen API is blocked
      setStageFullscreen((v) => !v)
    }
  }

  // Forward pointer into the embed so the page can still scroll over the stage
  // (iframe uses pointer-events: none unless fullscreen). In fullscreen the
  // iframe gets native mouse events — do not forward, or stale _parentMouse*
  // overrides live mouseX/mouseY in sketch pointer helpers.
  useEffect(() => {
    if (!embedSrc || stageFullscreen) return

    function sendPointer(clientX: number, clientY: number, phase: string) {
      const iframe = iframeRef.current
      const stage = stageRef.current
      if (!iframe?.contentWindow || !stage) return
      const rect = stage.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const x = clientX - rect.left
      const y = clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      iframe.contentWindow.postMessage({ type: 'sketch-mouse', x, y, phase }, '*')
    }

    const onMove = (e: PointerEvent) => sendPointer(e.clientX, e.clientY, 'move')
    const onDown = (e: PointerEvent) => {
      if (stageRef.current?.contains(e.target as Node)) {
        sendPointer(e.clientX, e.clientY, 'start')
      }
    }
    const onUp = (e: PointerEvent) => sendPointer(e.clientX, e.clientY, 'end')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [embedSrc, stageFullscreen])

  // Tell the embed to drop parent-forwarded coords when entering fullscreen
  // so pointer helpers fall back to native mouseX/mouseY.
  useEffect(() => {
    if (!stageFullscreen) return
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.postMessage({ type: 'sketch-mouse-clear' }, '*')
  }, [stageFullscreen])

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted">
        Loading sketch…
      </div>
    )
  }

  if (notFound || !sketch) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Sketch not found</h1>
        <Link to="/gallery" className="mt-4 inline-block text-primary hover:underline">
          Back to gallery
        </Link>
      </div>
    )
  }

  if (sketch.is_game && slug) {
    return <Navigate to={`/games/${slug}`} replace />
  }

  const detail = sketch
  const thumb = detail.thumbnail_card_url || detail.thumbnail
  const author = detail.author?.username ?? 'anonymous'
  const related = detail.related ?? []
  const forks = detail.forks ?? []

  async function onFork() {
    if (!slug) return
    if (!requireAuth({ type: 'fork', sourceSlug: slug })) {
      return
    }
    setForking(true)
    setForkError(null)
    try {
      const fork = await forkSketch(slug)
      navigate(`/sketches/${fork.slug}/edit`)
    } catch (err) {
      setForkError(err instanceof ApiError ? err.message : 'Fork failed')
    } finally {
      setForking(false)
      void refetch()
    }
  }

  function onToggleSave() {
    const next = toggleBookmark({
      slug: detail.slug,
      title: detail.title,
      thumb: detail.thumbnail_card_url || detail.thumbnail,
    })
    setSaved(next.some((row) => row.slug === detail.slug))
  }

  return (
    <div className="relative">
      {/* Immersive interactive stage */}
      <section
        ref={stageRef}
        className={cn(
          'relative isolate overflow-hidden bg-[#0a0a0c]',
          stageFullscreen
            ? 'fixed inset-0 z-[80] h-dvh min-h-0 w-screen'
            : 'h-[min(52dvh,26rem)] min-h-[16rem]',
        )}
      >
        {embedSrc ? (
          <iframe
            ref={iframeRef}
            title={sketch.title}
            src={embedSrc}
            className={cn(
              'absolute inset-0 h-full w-full border-0',
              // Let wheel/touch scroll the page; interaction is forwarded via postMessage
              !stageFullscreen && 'pointer-events-none',
            )}
            allow="autoplay"
            tabIndex={stageFullscreen ? 0 : -1}
          />
        ) : thumb ? (
          <img
            src={thumb}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
            No preview
          </div>
        )}

        {!stageFullscreen ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background via-background/75 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
              <div className="mx-auto flex max-w-[75rem] flex-col gap-4 px-4 pb-8 pt-16 sm:px-6 lg:px-8">
                <div className="pointer-events-auto flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                      {sketch.sketch_type_label}
                      {sketch.fork_count > 0
                        ? ` · ${sketch.fork_count} forks`
                        : ''}
                    </p>
                    <h1 className="font-display text-[clamp(1.65rem,3.8vw,2.5rem)] font-semibold leading-[1.05] tracking-tight text-foreground">
                      {sketch.title}
                    </h1>
                    <p className="text-sm text-muted">
                      by{' '}
                      {sketch.author?.username ? (
                        <Link
                          to={`/makers/${encodeURIComponent(sketch.author.username)}`}
                          className="text-foreground/90 transition-colors hover:text-primary"
                        >
                          {author}
                        </Link>
                      ) : (
                        author
                      )}
                    </p>
                    {sketch.forked_from ? (
                      <p className="text-sm text-muted">
                        Based on{' '}
                        <Link
                          to={`/sketches/${sketch.forked_from.slug}`}
                          className="text-primary hover:underline"
                        >
                          {sketch.forked_from.title}
                        </Link>
                        {sketch.forked_from.author?.username ? (
                          <>
                            {' '}
                            by{' '}
                            <Link
                              to={`/makers/${encodeURIComponent(sketch.forked_from.author.username)}`}
                              className="hover:text-primary"
                            >
                              {sketch.forked_from.author.username}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {embedSrc ? (
                      <button
                        type="button"
                        onClick={() => void toggleStageFullscreen()}
                        className={cn(secondaryBtnClass, 'cursor-pointer gap-2')}
                        aria-pressed={false}
                      >
                        <Maximize2 size={15} aria-hidden />
                        Fullscreen
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={onToggleSave}
                      className={cn(secondaryBtnClass, 'cursor-pointer gap-2')}
                      aria-pressed={saved}
                    >
                      <Bookmark
                        size={16}
                        className={
                          saved ? 'fill-primary text-primary' : undefined
                        }
                        aria-hidden
                      />
                      {saved ? 'Saved' : 'Save'}
                    </button>
                    {sketch.can_edit ? (
                      <>
                        <Link
                          to={`/sketches/${sketch.slug}/edit`}
                          className={cn(secondaryBtnClass, 'cursor-pointer')}
                        >
                          Open IDE
                        </Link>
                        <Link
                          to={`/sketches/${sketch.slug}/settings`}
                          className={cn(secondaryBtnClass, 'cursor-pointer')}
                        >
                          Settings
                        </Link>
                      </>
                    ) : null}
                    {sketch.can_fork ? (
                      <button
                        type="button"
                        onClick={() => void onFork()}
                        disabled={forking}
                        className={cn(primaryBtnClass, 'cursor-pointer')}
                      >
                        {forking ? 'Forking…' : 'Fork'}
                      </button>
                    ) : null}
                  </div>
                </div>
                {forkError ? (
                  <p
                    className="pointer-events-auto text-sm text-destructive"
                    role="alert"
                  >
                    {forkError}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </section>

      {/* Content over interactive atmosphere */}
      <div className="relative overflow-hidden border-t border-border">
        <SketchDetailAtmosphere />
        <div className="relative z-10 mx-auto max-w-[75rem] px-4 py-12 sm:px-6 lg:px-8">
          {sketch.tags.length > 0 ? (
            <div className="mb-8 flex flex-wrap gap-2">
              {sketch.tags.map((item) => (
                <Link
                  key={item.slug}
                  to={`/gallery?tag=${encodeURIComponent(item.slug)}`}
                  className="rounded-btn border border-border/80 bg-background/50 px-2.5 py-1 text-xs text-muted backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          ) : null}

          {sketch.description_html ? (
            <div
              className="markdown-body max-w-3xl text-sm leading-relaxed text-muted"
              dangerouslySetInnerHTML={{ __html: sketch.description_html }}
            />
          ) : sketch.description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              {sketch.description}
            </p>
          ) : (
            <p className="max-w-3xl text-sm text-muted">
              Move your pointer over the stage to interact with this sketch.
            </p>
          )}

          {related.length > 0 ? (
            <section className="mt-16">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Discover
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
                More like this
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((item) => (
                  <SketchCardView key={item.id} sketch={item} />
                ))}
              </div>
            </section>
          ) : null}

          {forks.length > 0 ? (
            <section className="mt-16">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Community
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
                Remixes
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {forks.map((item) => (
                  <SketchCardView key={item.id} sketch={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
