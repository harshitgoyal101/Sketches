import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, GitFork } from 'lucide-react'
import { ApiError } from '@/api/client'
import { forkSketch, getExploreToday } from '@/api/sketches'
import { useGuest } from '@/guest/GuestProvider'
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import { cn, toEmbedSrc } from '@/lib/utils'

export function ExploreTodayPage() {
  const navigate = useNavigate()
  const { requireAuth } = useGuest()
  const query = useQuery({
    queryKey: ['explore-today'],
    queryFn: getExploreToday,
  })
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const sketch = query.data?.sketch ?? null

  useEffect(() => {
    if (!sketch?.slug) {
      setSaved(false)
      return
    }
    setSaved(isBookmarked(sketch.slug))
  }, [sketch?.slug])

  if (query.isPending) {
    return (
      <p className="mx-auto max-w-5xl px-5 py-24 text-center text-sm text-muted">
        Loading today’s sketch…
      </p>
    )
  }

  if (query.isError) {
    return (
      <p className="mx-auto max-w-5xl px-5 py-24 text-center text-sm text-muted">
        {query.error instanceof ApiError
          ? query.error.message
          : 'Could not load sketch of the day.'}
      </p>
    )
  }

  const data = query.data
  const author = sketch?.author?.username
  const dateLabel = data?.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null

  async function onFork() {
    if (!sketch) return
    if (!requireAuth({ type: 'fork', sourceSlug: sketch.slug })) return
    setForking(true)
    setForkError(null)
    try {
      const fork = await forkSketch(sketch.slug)
      navigate(`/sketches/${fork.slug}/edit`)
    } catch (err) {
      setForkError(err instanceof ApiError ? err.message : 'Fork failed')
    } finally {
      setForking(false)
    }
  }

  function onToggleSave() {
    if (!sketch) return
    const next = toggleBookmark({
      slug: sketch.slug,
      title: sketch.title,
      thumb: sketch.thumbnail_card_url || sketch.thumbnail,
    })
    setSaved(next.some((row) => row.slug === sketch.slug))
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(123,97,255,0.14),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Daily pick
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Sketch of the day
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
              One shared sketch for everyone — explore it, save it, or fork it into
              your account.
            </p>
          </div>
          {dateLabel ? (
            <p className="inline-flex w-fit items-center rounded-btn border border-border bg-surface/80 px-3 py-1.5 font-mono text-xs text-muted backdrop-blur-sm">
              {dateLabel}
            </p>
          ) : null}
        </header>

        {!sketch ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-20 text-center">
            <p className="font-display text-lg font-semibold">No published sketches yet</p>
            <Link
              to="/gallery"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Browse gallery
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_0_0_1px_rgba(123,97,255,0.08)]">
              {sketch.embed_url ? (
                <iframe
                  title={sketch.title}
                  src={toEmbedSrc(sketch.embed_url)}
                  className="aspect-[16/10] w-full border-0 bg-[#0a0a0a] sm:aspect-video"
                  allow="autoplay"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-muted">
                  No preview
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  <Link
                    to={`/sketches/${sketch.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {sketch.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted">
                  {author ? (
                    <>
                      by{' '}
                      <Link
                        to={`/makers/${encodeURIComponent(author)}`}
                        className="transition-colors hover:text-primary"
                      >
                        {author}
                      </Link>
                      <span className="mx-2 text-border">·</span>
                    </>
                  ) : null}
                  <span className="font-mono text-xs uppercase tracking-wide">
                    {sketch.sketch_type_label}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleSave}
                  className={cn(secondaryBtnClass, 'cursor-pointer gap-2')}
                  aria-pressed={saved}
                >
                  <Bookmark
                    size={16}
                    className={saved ? 'fill-primary text-primary' : undefined}
                    aria-hidden
                  />
                  {saved ? 'Saved' : 'Save'}
                </button>
                <Link
                  to={`/sketches/${sketch.slug}`}
                  className={cn(secondaryBtnClass, 'cursor-pointer')}
                >
                  Open sketch
                </Link>
                {sketch.can_fork ? (
                  <button
                    type="button"
                    className={cn(primaryBtnClass, 'cursor-pointer gap-2')}
                    disabled={forking}
                    onClick={() => void onFork()}
                  >
                    <GitFork size={16} aria-hidden />
                    {forking ? 'Forking…' : 'Fork'}
                  </button>
                ) : null}
              </div>
            </div>
            {forkError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {forkError}
              </p>
            ) : null}
          </>
        )}

        {(data?.previous?.length ?? 0) > 0 ? (
          <section className="mt-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Archive
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
              Previous days
            </h2>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {data!.previous.map((row) => (
                <li key={row.date}>
                  <Link
                    to={`/sketches/${row.slug}`}
                    className="group flex items-baseline justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 transition-colors hover:border-primary/35 hover:bg-surface"
                  >
                    <span className="truncate font-display text-sm font-semibold text-foreground group-hover:text-primary">
                      {row.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {row.date}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
