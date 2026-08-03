import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { forkSketch, getSketch, getSketches } from '@/api/sketches'
import { useGuest } from '@/guest/GuestProvider'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import { cn, toEmbedSrc } from '@/lib/utils'
import type { SketchDetail } from '@/types/sketch'
import { X } from 'lucide-react'

type GalleryPlayModeProps = {
  open: boolean
  initialSlug?: string | null
  onClose: () => void
}

async function fetchRandomSketch(
  exclude: string[],
): Promise<SketchDetail | null> {
  const list = await getSketches({
    sort: 'random',
    exclude: exclude.length ? exclude.join(',') : undefined,
  })
  const card = list.results[0]
  if (!card) return null
  return getSketch(card.slug)
}

export function GalleryPlayMode({
  open,
  initialSlug,
  onClose,
}: GalleryPlayModeProps) {
  const navigate = useNavigate()
  const { requireAuth } = useGuest()
  const [current, setCurrent] = useState<SketchDetail | null>(null)
  const [prefetched, setPrefetched] = useState<SketchDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forking, setForking] = useState(false)
  const seenRef = useRef<string[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  const loadNext = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (prefetched) {
        const next = prefetched
        setPrefetched(null)
        setCurrent(next)
        seenRef.current = [...seenRef.current, next.slug].slice(-40)
        void fetchRandomSketch(seenRef.current)
          .then((row) => {
            if (row) setPrefetched(row)
          })
          .catch(() => undefined)
        return
      }
      const sketch = await fetchRandomSketch(seenRef.current)
      if (!sketch) {
        setError('No sketches available to play.')
        setCurrent(null)
        return
      }
      setCurrent(sketch)
      seenRef.current = [...seenRef.current, sketch.slug].slice(-40)
      void fetchRandomSketch(seenRef.current)
        .then((row) => {
          if (row) setPrefetched(row)
        })
        .catch(() => undefined)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load sketch')
    } finally {
      setLoading(false)
    }
  }, [prefetched])

  useEffect(() => {
    if (!open) {
      setCurrent(null)
      setPrefetched(null)
      setError(null)
      seenRef.current = []
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (initialSlug) {
          const sketch = await getSketch(initialSlug)
          if (cancelled) return
          setCurrent(sketch)
          seenRef.current = [sketch.slug]
        } else {
          const sketch = await fetchRandomSketch([])
          if (cancelled) return
          if (!sketch) {
            setError('No sketches available to play.')
            return
          }
          setCurrent(sketch)
          seenRef.current = [sketch.slug]
        }
        void fetchRandomSketch(seenRef.current)
          .then((row) => {
            if (!cancelled && row) setPrefetched(row)
          })
          .catch(() => undefined)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load sketch',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, initialSlug])

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        void loadNext()
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        void onFork()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadNext, current, onClose])

  async function onFork() {
    if (!current) return
    if (!requireAuth({ type: 'fork', sourceSlug: current.slug })) return
    setForking(true)
    try {
      const fork = await forkSketch(current.slug)
      onClose()
      navigate(`/sketches/${fork.slug}/edit`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fork failed')
    } finally {
      setForking(false)
    }
  }

  if (!open) return null

  const author = current?.author?.username ?? 'anonymous'
  const openIdeHref = current?.can_edit
    ? `/sketches/${current.slug}/edit`
    : current
      ? `/sketches/${current.slug}`
      : '/gallery'

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby="play-mode-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col outline-none"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              Play mode
            </p>
            <h2
              id="play-mode-title"
              className="truncate font-display text-lg font-semibold text-foreground"
            >
              {current?.title ?? (loading ? 'Loading…' : 'Surprise me')}
            </h2>
            {current ? (
              <p className="truncate text-xs text-muted">
                by{' '}
                {current.author?.username ? (
                  <Link
                    to={`/makers/${encodeURIComponent(current.author.username)}`}
                    className="hover:text-primary"
                    onClick={onClose}
                  >
                    {author}
                  </Link>
                ) : (
                  author
                )}
              </p>
            ) : null}
          </div>
          <p className="hidden text-[11px] text-muted sm:block">
            → next · F fork · Esc exit
          </p>
          <button
            type="button"
            className={cn(secondaryBtnClass, 'inline-flex items-center gap-1')}
            onClick={onClose}
            aria-label="Exit play mode"
          >
            <X size={16} />
            Exit
          </button>
        </header>

        <div className="relative min-h-0 flex-1 bg-[#0a0a0a]">
          {current?.embed_url ? (
            <iframe
              key={current.slug}
              title={current.title}
              src={toEmbedSrc(current.embed_url)}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-sm text-muted">
              {loading ? 'Loading sketch…' : error || 'No preview'}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <span className="text-xs text-muted">Fullscreen browse</span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={secondaryBtnClass}
              disabled={!current || forking}
              onClick={() => void onFork()}
            >
              {forking ? 'Forking…' : 'Fork'}
            </button>
            {current ? (
              <Link
                to={openIdeHref}
                className={secondaryBtnClass}
                onClick={onClose}
              >
                {current.can_edit ? 'Open IDE' : 'Open sketch'}
              </Link>
            ) : null}
            <button
              type="button"
              className={primaryBtnClass}
              disabled={loading}
              onClick={() => void loadNext()}
            >
              {loading ? 'Loading…' : 'Next'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
