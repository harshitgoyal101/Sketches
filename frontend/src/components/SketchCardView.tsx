import { Link } from 'react-router-dom'
import type { SketchCard } from '@/types/sketch'
import { cn } from '@/lib/utils'

type Props = {
  sketch: SketchCard
  className?: string
  showStatus?: boolean
}

/**
 * Sketch list card: app-icon list rows on mobile, glass thumbnail cards from md up.
 */
export function SketchCardView({ sketch, className, showStatus = false }: Props) {
  const thumb = sketch.thumbnail_card_url || sketch.thumbnail || ''
  const appIcon = sketch.app_icon || thumb
  const author = sketch.author?.username ?? 'anonymous'
  const tags = sketch.tags?.slice(0, 2) ?? []
  const initial = (sketch.title.trim().charAt(0) || '?').toUpperCase()

  return (
    <Link
      to={`/sketches/${sketch.slug}`}
      className={cn(
        'group cursor-pointer outline-none transition-[border-color,transform,box-shadow,background-color] duration-200',
        // Mobile: app-icon list row
        'flex flex-row items-center gap-3 rounded-xl border border-black/10 bg-white/60 p-2.5 backdrop-blur-md',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(19,27,46,0.06)]',
        'hover:border-primary/40 hover:bg-white/80',
        'dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]',
        'dark:hover:border-primary/50 dark:hover:bg-white/[0.1]',
        'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30',
        // Desktop: tall glass card
        'md:h-full md:min-h-[17.5rem] md:flex-col md:overflow-hidden md:p-0',
        'md:hover:-translate-y-0.5 md:hover:shadow-[0_10px_28px_-14px_rgba(123,97,255,0.35),inset_0_1px_0_0_rgba(255,255,255,0.9)]',
        'dark:md:hover:shadow-[0_8px_28px_-12px_rgba(123,97,255,0.35),inset_0_1px_0_0_rgba(255,255,255,0.16)]',
        className,
      )}
      aria-label={`${sketch.title} by ${author}`}
    >
      {/* Mobile app icon */}
      <div className="sketch-app-icon shrink-0 md:hidden" aria-hidden>
        {appIcon ? (
          <img src={appIcon} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Desktop thumbnail media */}
      <div className="relative hidden aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-black/8 bg-background/30 dark:border-white/10 dark:bg-background/40 md:block">
        {thumb ? (
          <img
            src={thumb}
            srcSet={sketch.thumbnail_srcset || undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(123,97,255,0.25),transparent_55%)] px-3 text-center">
            <span className="line-clamp-2 font-display text-sm text-muted">
              {sketch.title}
            </span>
          </div>
        )}
        <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md border border-black/10 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-foreground backdrop-blur-md dark:border-white/20 dark:bg-black/40 dark:text-white">
          {sketch.sketch_type_label}
        </span>
        {showStatus ? (
          <span
            className={cn(
              'pointer-events-none absolute right-2.5 top-2.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide backdrop-blur-md',
              sketch.status === 'published'
                ? 'border-primary/40 bg-primary/85 text-[var(--color-on-primary)]'
                : 'border-black/10 bg-white/80 text-muted dark:border-white/15 dark:bg-black/40 dark:text-white/80',
            )}
          >
            {sketch.status}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:min-h-[6.75rem] md:gap-1.5 md:bg-gradient-to-b md:from-transparent md:to-white/50 md:p-3.5 dark:md:to-black/20">
        <div className="flex items-start justify-between gap-2 md:block">
          <h3 className="line-clamp-2 min-w-0 font-display text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {sketch.title}
          </h3>
          {showStatus ? (
            <span
              className={cn(
                'shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide md:hidden',
                sketch.status === 'published'
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-black/10 text-muted dark:border-white/15',
              )}
            >
              {sketch.status}
            </span>
          ) : (
            <span className="shrink-0 rounded-md border border-black/10 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted dark:border-white/12 dark:bg-white/[0.06] md:hidden">
              {sketch.sketch_type_label}
            </span>
          )}
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
                className="rounded-md border border-black/10 bg-white/70 px-1.5 py-0.5 text-[10px] text-muted dark:border-white/12 dark:bg-white/[0.06]"
              >
                {item.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-auto hidden md:block" />
        )}
      </div>
    </Link>
  )
}
