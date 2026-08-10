import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart, Maximize2, Play } from 'lucide-react'
import { useSketch } from '@/hooks/useSketches'
import { ApiError } from '@/api/client'
import { getGameScores } from '@/api/games'
import { forkSketch } from '@/api/sketches'
import { SketchCardView } from '@/components/SketchCardView'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { useGuest } from '@/guest/GuestProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
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
  const [favourited, setFavourited] = useState(false)
  const [stageFullscreen, setStageFullscreen] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const notFound = error instanceof ApiError && error.status === 404

  useDocumentTitle(
    sketch ? `${sketch.title} · Sketches101` : 'Sketch · Sketches101',
    sketch?.description?.slice(0, 160) ||
      'Interactive creative coding sketch on Sketches101.',
  )

  const embedSrc = useMemo(
    () => (sketch?.embed_url ? fullscreenEmbedSrc(sketch.embed_url) : null),
    [sketch?.embed_url],
  )

  const scoreboardSlug = (
    sketch?.scoreboard_slug ||
    sketch?.slug ||
    ''
  ).trim()

  const scoresQuery = useQuery({
    queryKey: ['game-scores', scoreboardSlug, 'detail'],
    queryFn: () => getGameScores(scoreboardSlug),
    enabled: Boolean(sketch?.is_game && scoreboardSlug),
    retry: false,
  })

  useEffect(() => {
    if (!sketch?.slug) return
    recordRecentView({
      slug: sketch.slug,
      title: sketch.title,
      thumb: sketch.thumbnail_card_url || sketch.thumbnail,
    })
    setFavourited(isBookmarked(sketch.slug))
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
        <h1 className="font-display text-2xl font-bold">Sketch not found</h1>
        <Link to="/gallery" className="mt-4 inline-block text-primary hover:underline">
          Back to gallery
        </Link>
      </div>
    )
  }

  const detail = sketch
  const isGame = Boolean(detail.is_game)
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

  function onToggleFavourite() {
    const next = toggleBookmark({
      slug: detail.slug,
      title: detail.title,
      thumb: detail.thumbnail_card_url || detail.thumbnail,
    })
    setFavourited(next.some((row) => row.slug === detail.slug))
  }

  return (
    <div className="relative bg-background">
      {/* Immersive interactive stage */}
      <section
        ref={stageRef}
        className={cn(
          'relative isolate overflow-hidden bg-[#0a0a0c]',
          stageFullscreen
            ? 'fixed inset-0 z-[80] h-dvh min-h-0 w-screen'
            : 'h-[min(62dvh,34rem)] min-h-[18rem]',
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

        {!stageFullscreen && embedSrc ? (
          <div className="absolute bottom-4 right-4 z-10 sm:bottom-5 sm:right-5">
            {isGame ? (
              <Link
                to={`/games/${sketch.slug}`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-white/20 bg-black/45 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/60"
              >
                <Play size={15} aria-hidden />
                Play
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void toggleStageFullscreen()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-white/20 bg-black/45 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/60"
                aria-pressed={false}
              >
                <Maximize2 size={15} aria-hidden />
                Fullscreen
              </button>
            )}
          </div>
        ) : null}
      </section>

      {/* Meta + description */}
      <div className="relative overflow-hidden border-t border-border">
        <SketchDetailAtmosphere />
        <div className="relative z-10 mx-auto max-w-[75rem] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <header className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-2xl space-y-3">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                {sketch.sketch_type_label}
                {sketch.fork_count > 0 ? ` · ${sketch.fork_count} forks` : ''}
              </p>
              <h1 className="font-display text-[clamp(1.85rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-tight text-foreground">
                {sketch.title}
              </h1>
              <p className="text-sm text-muted sm:text-base">
                by{' '}
                {sketch.author?.username ? (
                  <Link
                    to={`/makers/${encodeURIComponent(sketch.author.username)}`}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {author}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{author}</span>
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
              {isGame ? (
                <Link
                  to={`/games/${sketch.slug}`}
                  className={cn(primaryBtnClass, 'cursor-pointer gap-2')}
                >
                  <Play size={16} aria-hidden />
                  Play
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onToggleFavourite}
                className={cn(secondaryBtnClass, 'cursor-pointer gap-2')}
                aria-pressed={favourited}
              >
                <Heart
                  size={16}
                  className={favourited ? 'fill-primary text-primary' : undefined}
                  aria-hidden
                />
                {favourited ? 'Favourited' : 'Favourite'}
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
          </header>

          {forkError ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {forkError}
            </p>
          ) : null}

          {sketch.tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {sketch.tags.map((item) => (
                <Link
                  key={item.slug}
                  to={`/gallery?tag=${encodeURIComponent(item.slug)}`}
                  className="rounded-btn border border-border bg-surface/80 px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          ) : null}

          <section className="mt-10 max-w-3xl">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              About
            </p>
            <div className="mt-4 rounded-2xl border border-border bg-surface/70 p-5 sm:p-6">
              {sketch.description_html ? (
                <div
                  className="markdown-body text-sm leading-relaxed text-foreground sm:text-[0.95rem]"
                  dangerouslySetInnerHTML={{ __html: sketch.description_html }}
                />
              ) : sketch.description ? (
                <p className="text-sm leading-relaxed text-foreground sm:text-[0.95rem]">
                  {sketch.description}
                </p>
              ) : (
                <p className="text-sm text-muted">
                  {isGame
                    ? 'Play this game to set a high score on the leaderboard.'
                    : 'Move your pointer over the stage to interact with this sketch.'}
                </p>
              )}
            </div>
          </section>

          {isGame ? (
            <section className="mt-16 border-t border-border pt-10">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                Leaderboard
              </p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Top 5 high scores
                </h2>
                {scoresQuery.data?.me?.score != null ? (
                  <p className="text-sm text-muted">
                    Your best{' '}
                    <span className="font-display text-base font-bold tabular-nums text-foreground">
                      {scoresQuery.data.me.score.toLocaleString()}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface/70">
                {scoresQuery.isPending ? (
                  <p className="px-5 py-10 text-center text-sm text-muted">
                    Loading scores…
                  </p>
                ) : scoresQuery.isError ? (
                  <p className="px-5 py-10 text-center text-sm text-muted">
                    No scoreboard for this game yet.
                  </p>
                ) : (scoresQuery.data?.results ?? []).length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-muted">Be the first on the board.</p>
                    <Link
                      to={`/games/${sketch.slug}`}
                      className={cn(primaryBtnClass, 'mt-4 inline-flex gap-2')}
                    >
                      <Play size={16} aria-hidden />
                      Play
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[20rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-[11px] font-mono uppercase tracking-[0.14em] text-muted">
                          <th className="px-4 py-3 font-medium sm:px-5">Rank</th>
                          <th className="px-4 py-3 font-medium sm:px-5">Player</th>
                          <th className="px-4 py-3 text-right font-medium sm:px-5">
                            Score
                          </th>
                          <th className="hidden px-4 py-3 text-right font-medium sm:table-cell sm:px-5">
                            Played
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(scoresQuery.data?.results ?? []).slice(0, 5).map((row, index) => {
                          const name =
                            row.user?.display_name ||
                            row.user?.username ||
                            'Player'
                          const isYours = scoresQuery.data?.me?.id === row.id
                          const played = row.played_at
                            ? new Date(row.played_at).toLocaleDateString()
                            : '—'
                          return (
                            <tr
                              key={row.id}
                              className={cn(
                                'border-b border-border/70 last:border-0',
                                index === 0 && 'bg-primary/5',
                                isYours && 'bg-primary/10',
                              )}
                            >
                              <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted sm:px-5">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground sm:px-5">
                                {row.user?.username ? (
                                  <Link
                                    to={`/makers/${encodeURIComponent(row.user.username)}`}
                                    className="hover:text-primary"
                                  >
                                    {name}
                                    {isYours ? (
                                      <span className="ml-2 text-xs font-normal text-primary">
                                        you
                                      </span>
                                    ) : null}
                                  </Link>
                                ) : (
                                  name
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-display text-base font-bold tabular-nums text-foreground sm:px-5">
                                {row.score.toLocaleString()}
                              </td>
                              <td className="hidden px-4 py-3 text-right text-muted sm:table-cell sm:px-5">
                                {played}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section className="mt-16 border-t border-border pt-10">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                Discover
              </p>
              <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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
            <section className="mt-16 border-t border-border pt-10">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                Community
              </p>
              <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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
