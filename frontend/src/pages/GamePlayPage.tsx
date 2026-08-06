import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { useSketch } from '@/hooks/useSketches'
import { ApiError } from '@/api/client'
import { toEmbedSrc } from '@/lib/utils'

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

/**
 * Immersive play surface for is_game sketches — no detail page.
 * Lands directly in fullscreen; exit returns to /games.
 */
export function GamePlayPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: sketch, isPending, error } = useSketch(slug)
  const [browserFs, setBrowserFs] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const enteredRef = useRef(false)
  const notFound = error instanceof ApiError && error.status === 404
  const notGame = Boolean(sketch && !sketch.is_game)

  const embedSrc = useMemo(
    () => (sketch?.embed_url ? fullscreenEmbedSrc(sketch.embed_url) : null),
    [sketch?.embed_url],
  )

  useEffect(() => {
    function syncFullscreen() {
      const stage = stageRef.current
      setBrowserFs(Boolean(stage && document.fullscreenElement === stage))
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

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

  // Best-effort browser fullscreen; CSS fixed overlay always covers the viewport.
  useEffect(() => {
    if (!embedSrc || enteredRef.current) return
    enteredRef.current = true
    const stage = stageRef.current
    if (!stage) return
    void stage.requestFullscreen?.().catch(() => {})
  }, [embedSrc])

  async function toggleBrowserFullscreen() {
    const stage = stageRef.current
    if (!stage) return
    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen()
        return
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      await stage.requestFullscreen()
    } catch {
      /* ignore */
    }
  }

  async function exitPlay() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        /* ignore */
      }
    }
    navigate('/games')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        void exitPlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

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
        <h1 className="font-display text-2xl font-semibold">Game not found</h1>
        <Link to="/games" className="mt-4 inline-block text-primary hover:underline">
          Back to Games
        </Link>
      </div>
    )
  }

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-[80] flex h-dvh w-screen flex-col bg-[#0a0a0c]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-3 sm:p-4">
        <div className="pointer-events-auto min-w-0">
          <p className="truncate font-display text-sm font-semibold text-white sm:text-base">
            {sketch.title}
          </p>
          <p className="truncate text-xs text-white/55">
            by {sketch.author?.username ?? 'anonymous'}
          </p>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {sketch.can_edit ? (
            <Link
              to={`/sketches/${sketch.slug}/edit`}
              className="rounded-btn border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/10"
            >
              Edit
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void toggleBrowserFullscreen()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-btn border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/10"
            aria-label={browserFs ? 'Exit browser fullscreen' : 'Browser fullscreen'}
          >
            {browserFs ? (
              <Minimize2 size={14} aria-hidden />
            ) : (
              <Maximize2 size={14} aria-hidden />
            )}
            <span className="hidden sm:inline">{browserFs ? 'Window' : 'Fullscreen'}</span>
          </button>
          <button
            type="button"
            onClick={() => void exitPlay()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-btn border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/10"
            aria-label="Exit game"
          >
            <X size={14} aria-hidden />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

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
