import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Trophy, X } from 'lucide-react'
import { useSketch } from '@/hooks/useSketches'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getGameScores } from '@/api/games'
import { ApiError } from '@/api/client'
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

type ScoreToast = {
  score: number
  isPersonalBest: boolean
  needsSignIn: boolean
}

/**
 * Immersive play surface for is_game sketches.
 * Exit returns to the game details page (/sketches/:slug).
 */
export function GamePlayPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: sketch, isPending, error } = useSketch(slug)
  const [boardOpen, setBoardOpen] = useState(false)
  const [toast, setToast] = useState<ScoreToast | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const notFound = error instanceof ApiError && error.status === 404
  const notGame = Boolean(sketch && !sketch.is_game)

  const scoreboardSlug =
    (sketch?.scoreboard_slug || sketch?.slug || '').trim() || slug || ''

  const scoresQuery = useQuery({
    queryKey: ['game-scores', scoreboardSlug, 'play'],
    queryFn: () => getGameScores(scoreboardSlug),
    enabled: Boolean(scoreboardSlug) && Boolean(sketch?.is_game),
    retry: false,
  })

  useDocumentTitle(
    sketch ? `${sketch.title} · Play · Sketches101` : 'Play · Sketches101',
    sketch
      ? `Play ${sketch.title} fullscreen on Sketches101.`
      : 'Play creative coding games on Sketches101.',
  )

  const embedSrc = useMemo(
    () => (sketch?.embed_url ? fullscreenEmbedSrc(sketch.embed_url) : null),
    [sketch?.embed_url],
  )

  const topScores = (scoresQuery.data?.results ?? []).slice(0, 8)
  const myBest = scoresQuery.data?.me?.score ?? null

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    function onScore(event: Event) {
      const detail = (event as CustomEvent<ScoreToast & { game?: string }>).detail
      if (!detail || typeof detail.score !== 'number') return
      if (detail.game && scoreboardSlug && detail.game !== scoreboardSlug) return
      setToast({
        score: detail.score,
        isPersonalBest: Boolean(detail.isPersonalBest),
        needsSignIn: Boolean(detail.needsSignIn),
      })
      void queryClient.invalidateQueries({
        queryKey: ['game-scores', scoreboardSlug],
      })
    }
    window.addEventListener('sketches101-score-recorded', onScore)
    return () => window.removeEventListener('sketches101-score-recorded', onScore)
  }, [queryClient, scoreboardSlug])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  async function exitPlay() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        /* ignore */
      }
    }
    navigate(slug ? `/sketches/${slug}` : '/games')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void exitPlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, slug])

  if (isPending) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0a0a0c] text-sm text-white/60">
        Loading game…
      </div>
    )
  }

  if (notFound || notGame || !sketch) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Game not found</h1>
        <Link to="/games" className="mt-4 inline-block text-primary hover:underline">
          Back to Games
        </Link>
      </div>
    )
  }

  const chromeBtn =
    'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-btn border border-white/25 bg-black/55 px-3 py-2.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/15 touch-manipulation'

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-[80] flex h-dvh w-screen flex-col bg-[#0a0a0c]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/75 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4"
      >
        <div className="pointer-events-auto min-w-0">
          <p className="truncate font-display text-sm font-bold text-white sm:text-base">
            {sketch.title}
          </p>
          <p className="truncate text-xs text-white/55">
            by {sketch.author?.username ?? 'anonymous'}
            {myBest != null ? ` · Your best ${myBest.toLocaleString()}` : ''}
          </p>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setBoardOpen((v) => !v)}
            className={chromeBtn}
            aria-expanded={boardOpen}
            aria-label={boardOpen ? 'Hide leaderboard' : 'Show leaderboard'}
          >
            <Trophy size={16} aria-hidden />
            <span className="hidden sm:inline">Scores</span>
            {boardOpen ? (
              <ChevronUp size={14} aria-hidden />
            ) : (
              <ChevronDown size={14} aria-hidden />
            )}
          </button>
          {sketch.can_edit ? (
            <Link to={`/sketches/${sketch.slug}/edit`} className={chromeBtn}>
              Edit
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void exitPlay()}
            className={chromeBtn}
            aria-label="Exit game"
          >
            <X size={16} aria-hidden />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {boardOpen ? (
        <div className="pointer-events-auto absolute right-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.75rem))] z-30 w-[min(100%-1.5rem,18rem)] overflow-hidden rounded-xl border border-white/15 bg-black/80 shadow-xl backdrop-blur-md sm:right-4">
          <div className="border-b border-white/10 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
              Leaderboard
            </p>
            {myBest != null ? (
              <p className="mt-1 text-sm text-white">
                Your best:{' '}
                <span className="font-semibold tabular-nums">
                  {myBest.toLocaleString()}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/55">Play to set a personal best.</p>
            )}
          </div>
          {scoresQuery.isPending ? (
            <p className="px-3 py-4 text-xs text-white/50">Loading scores…</p>
          ) : scoresQuery.isError ? (
            <p className="px-3 py-4 text-xs text-white/50">
              No scoreboard for this game yet.
            </p>
          ) : topScores.length === 0 ? (
            <p className="px-3 py-4 text-xs text-white/50">Be the first on the board.</p>
          ) : (
            <ol className="max-h-56 overflow-y-auto py-1">
              {topScores.map((row, index) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-white/90"
                >
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-mono text-xs text-white/40">
                      {index + 1}
                    </span>
                    {row.user?.display_name || row.user?.username || 'Player'}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {row.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}

      {toast ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4',
            'bottom-[max(1.25rem,env(safe-area-inset-bottom))]',
          )}
          role="status"
        >
          <div className="rounded-xl border border-white/20 bg-black/85 px-4 py-3 text-center text-sm text-white shadow-lg backdrop-blur-md">
            {toast.isPersonalBest ? (
              <p className="font-semibold text-primary">New personal best</p>
            ) : (
              <p className="font-semibold">Score submitted</p>
            )}
            <p className="mt-0.5 tabular-nums text-white/90">
              {toast.score.toLocaleString()}
            </p>
            {toast.needsSignIn ? (
              <p className="mt-1 text-xs text-white/55">
                Sign in to keep it on your account.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {embedSrc ? (
        <iframe
          ref={iframeRef}
          title={sketch.title}
          src={embedSrc}
          className="h-full w-full flex-1 border-0"
          allow="autoplay; fullscreen"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-white/50">
          No playable preview
        </div>
      )}
    </div>
  )
}
