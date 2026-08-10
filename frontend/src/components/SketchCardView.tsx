import { type MouseEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Info } from 'lucide-react'
import type { SketchCard } from '@/types/sketch'
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks'
import { cn } from '@/lib/utils'

type Props = {
  sketch: SketchCard
  className?: string
  showStatus?: boolean
}

const overlayIconClass =
  'inline-flex cursor-pointer items-center justify-center rounded-md text-primary transition-colors hover:text-[#A894FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45'

/**
 * Sketch list card: app-icon list rows on mobile, glass thumbnail cards from md up.
 * Games open play on the main link; an info control opens the game detail page.
 */
export function SketchCardView({ sketch, className, showStatus = false }: Props) {
  const thumb = sketch.thumbnail_card_url || sketch.thumbnail || ''
  const appIcon = sketch.app_icon || thumb
  const author = sketch.author?.username ?? 'anonymous'
  const tags = sketch.tags?.slice(0, 2) ?? []
  const initial = (sketch.title.trim().charAt(0) || '?').toUpperCase()
  const isGame = Boolean(sketch.is_game)
  const href = isGame ? `/games/${sketch.slug}` : `/sketches/${sketch.slug}`
  const detailHref = `/sketches/${sketch.slug}`
  const [favourited, setFavourited] = useState(() => isBookmarked(sketch.slug))

  useEffect(() => {
    setFavourited(isBookmarked(sketch.slug))
  }, [sketch.slug])

  function onToggleFavourite(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    const next = toggleBookmark({
      slug: sketch.slug,
      title: sketch.title,
      thumb: sketch.thumbnail_card_url || sketch.thumbnail,
    })
    setFavourited(next.some((row) => row.slug === sketch.slug))
  }

  const favouriteButton = (opts: { className?: string; size?: number }) => (
    <button
      type="button"
      onClick={onToggleFavourite}
      className={cn(overlayIconClass, opts.className)}
      aria-label={favourited ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={favourited}
    >
      <Heart
        size={opts.size ?? 16}
        strokeWidth={2.25}
        className={favourited ? 'fill-primary text-primary' : undefined}
        aria-hidden
      />
    </button>
  )

  const detailButton = (opts: { className?: string; size?: number }) =>
    isGame ? (
      <Link
        to={detailHref}
        onClick={(event) => event.stopPropagation()}
        className={cn(overlayIconClass, opts.className)}
        aria-label={`Open details for ${sketch.title}`}
      >
        <Info size={opts.size ?? 16} strokeWidth={2.25} aria-hidden />
      </Link>
    ) : null

  return (
    <article
      className={cn(
        'group relative outline-none transition-[border-color,transform,box-shadow,background-color] duration-200',
        // Mobile: app-icon list row
        'flex flex-row items-center gap-3 rounded-xl border border-border bg-surface/80 p-2.5 backdrop-blur-md',
        'hover:border-primary/40 hover:bg-surface',
        'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
        // Desktop: tall glass card
        'md:h-full md:min-h-[17.5rem] md:flex-col md:overflow-hidden md:p-0',
        'md:hover:-translate-y-0.5 md:hover:shadow-[0_10px_28px_-14px_rgba(123,97,255,0.28)]',
        className,
      )}
    >
      <Link
        to={href}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={
          isGame
            ? `Play ${sketch.title} by ${author}`
            : `${sketch.title} by ${author}`
        }
      />

      {/* Mobile app icon */}
      <div className="sketch-app-icon relative z-[1] shrink-0 pointer-events-none md:hidden" aria-hidden>
        {appIcon ? (
          <img src={appIcon} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Desktop thumbnail media */}
      <div className="relative z-[1] hidden aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-border bg-background/40 md:block">
        {thumb ? (
          <img
            src={thumb}
            srcSet={sketch.thumbnail_srcset || undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="pointer-events-none flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(123,97,255,0.25),transparent_55%)] px-3 text-center">
            <span className="line-clamp-2 font-display text-sm font-semibold text-primary">
              {sketch.title}
            </span>
          </div>
        )}
        {showStatus ? (
          <span
            className={cn(
              'pointer-events-none absolute left-2.5 top-2.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary',
              sketch.status === 'published' ? 'opacity-100' : 'opacity-80',
            )}
          >
            {sketch.status}
          </span>
        ) : null}
        <div className="absolute right-2.5 top-2.5 z-[2] flex items-center gap-0">
          {detailButton({ className: 'h-7 w-7' })}
          {favouriteButton({ className: 'h-7 w-7' })}
        </div>
      </div>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-0.5 pointer-events-none md:min-h-[6.75rem] md:gap-1.5 md:bg-surface/50 md:p-3.5">
        <div className="flex items-start justify-between gap-2 md:block">
          <h3 className="line-clamp-2 min-w-0 font-display text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
            {sketch.title}
          </h3>
          {showStatus ? (
            <span
              className={cn(
                'shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide md:hidden',
                sketch.status === 'published'
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border text-muted',
              )}
            >
              {sketch.status}
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted">
          by {author}
          {sketch.fork_count > 0 ? ` · ${sketch.fork_count} forks` : ''}
        </p>
        {tags.length > 0 ? (
          <div className="mt-auto hidden flex-wrap gap-1.5 pt-1 md:flex">
            {tags.map((item) => (
              <span
                key={item.slug}
                className="rounded-md border border-border bg-background/70 px-1.5 py-0.5 text-[10px] text-muted"
              >
                {item.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-auto hidden md:block" />
        )}
      </div>

      <div className="relative z-[2] flex shrink-0 items-center gap-0 md:hidden">
        {detailButton({ className: 'h-8 w-8' })}
        {favouriteButton({ className: 'h-8 w-8' })}
      </div>
    </article>
  )
}
