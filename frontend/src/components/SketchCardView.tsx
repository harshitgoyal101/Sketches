import { Link } from 'react-router-dom'
import type { SketchCard } from '@/types/sketch'
import { cn } from '@/lib/utils'

type Props = {
  sketch: SketchCard
  className?: string
  showStatus?: boolean
}

export function SketchCardView({ sketch, className, showStatus = false }: Props) {
  const thumb = sketch.thumbnail_card_url || sketch.thumbnail || ''
  const author = sketch.author?.username ?? 'anonymous'
  const tags = sketch.tags?.slice(0, 3) ?? []

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/40',
        className,
      )}
    >
      <Link to={`/sketches/${sketch.slug}`} className="block">
        <div className="aspect-[16/10] overflow-hidden bg-background">
          {thumb ? (
            <img
              src={thumb}
              srcSet={sketch.thumbnail_srcset || undefined}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
      </Link>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/sketches/${sketch.slug}`}
            className="font-display text-sm font-semibold text-foreground hover:text-primary"
          >
            {sketch.title}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            {showStatus ? (
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                  sketch.status === 'published'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-background text-muted',
                )}
              >
                {sketch.status}
              </span>
            ) : null}
            <span className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
              {sketch.sketch_type_label}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted">
          by {author} · {sketch.fork_count} forks
        </p>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
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
    </div>
  )
}
