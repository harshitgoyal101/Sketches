import { Link } from 'react-router-dom'
import type { SketchCard } from '@/types/sketch'
import { cn } from '@/lib/utils'

type Props = {
  sketch: SketchCard
  className?: string
  showStatus?: boolean
}

function iconUrl(sketch: SketchCard): string {
  return sketch.app_icon || sketch.thumbnail_card_url || sketch.thumbnail || ''
}

export function SketchCardView({ sketch, className, showStatus = false }: Props) {
  const thumb = sketch.thumbnail_card_url || sketch.thumbnail || ''
  const icon = iconUrl(sketch)
  const author = sketch.author?.username ?? 'anonymous'
  const tags = sketch.tags?.slice(0, 3) ?? []
  const initial = (sketch.title.trim()[0] || '?').toUpperCase()

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-xl border border-border bg-surface transition-[border-color,transform] duration-200 hover:border-primary/40',
        /* Mobile: horizontal app-row; sm+: stacked media card */
        'flex gap-3 p-2.5 sm:block sm:gap-0 sm:p-0',
        className,
      )}
    >
      {/* App icon — prominent on mobile, decorative corner on desktop via media */}
      <Link
        to={`/sketches/${sketch.slug}`}
        className="relative shrink-0 sm:hidden"
        aria-label={sketch.title}
      >
        <div className="sketch-app-icon">
          {icon ? (
            <img src={icon} alt="" loading="lazy" decoding="async" />
          ) : (
            <span aria-hidden>{initial}</span>
          )}
        </div>
      </Link>

      <Link
        to={`/sketches/${sketch.slug}`}
        className="relative hidden sm:block"
      >
        <div className="aspect-[16/10] overflow-hidden bg-background">
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
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(123,97,255,0.25),transparent_55%)]">
              <span className="font-display text-sm text-muted">{sketch.title}</span>
            </div>
          )}
        </div>
        <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md border border-white/10 bg-background/75 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-foreground backdrop-blur-sm">
          {sketch.sketch_type_label}
        </span>
        {showStatus ? (
          <span
            className={cn(
              'pointer-events-none absolute right-2.5 top-2.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide backdrop-blur-sm',
              sketch.status === 'published'
                ? 'bg-primary/85 text-[var(--color-on-primary)]'
                : 'bg-background/80 text-muted',
            )}
          >
            {sketch.status}
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1 p-0.5 sm:space-y-2 sm:p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/sketches/${sketch.slug}`}
            className="font-display text-sm font-semibold leading-snug text-foreground hover:text-primary"
          >
            {sketch.title}
          </Link>
          <span className="shrink-0 rounded-md bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted sm:hidden">
            {sketch.sketch_type_label}
          </span>
          {showStatus ? (
            <span
              className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide sm:hidden',
                sketch.status === 'published'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-background text-muted',
              )}
            >
              {sketch.status}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted">
          by {author}
          {sketch.fork_count > 0 ? ` · ${sketch.fork_count} forks` : null}
        </p>
        {tags.length > 0 ? (
          <div className="hidden flex-wrap gap-1.5 sm:flex">
            {tags.map((item) => (
              <Link
                key={item.slug}
                to={`/gallery?tag=${encodeURIComponent(item.slug)}`}
                className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted hover:border-primary/40 hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                {item.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
