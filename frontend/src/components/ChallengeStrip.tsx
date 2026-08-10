import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentChallenge } from '@/api/sketches'
import { cn } from '@/lib/utils'

type ChallengeStripProps = {
  className?: string
  compact?: boolean
}

export function ChallengeStrip({ className, compact = false }: ChallengeStripProps) {
  const query = useQuery({
    queryKey: ['challenge-current'],
    queryFn: getCurrentChallenge,
    staleTime: 60_000,
  })

  const challenge = query.data
  if (query.isPending || !challenge) return null

  const href = challenge.tag
    ? `/gallery?tag=${encodeURIComponent(challenge.tag.slug)}`
    : '/gallery'

  return (
    <aside
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-surface',
        compact ? 'px-4 py-3.5' : 'px-5 py-5 sm:px-6 sm:py-6',
        className,
      )}
      aria-label="Weekly challenge"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_100%_50%,rgba(123,97,255,0.14),transparent_70%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary font-bold">
            This week
            {challenge.entry_count > 0
              ? ` · ${challenge.entry_count} entr${challenge.entry_count === 1 ? 'y' : 'ies'}`
              : ''}
          </p>
          <h2
            className={cn(
              'mt-1 font-display font-bold tracking-tight text-foreground',
              compact ? 'text-base' : 'text-lg sm:text-xl',
            )}
          >
            {challenge.title}
          </h2>
          {challenge.prompt ? (
            <p
              className={cn(
                'mt-1 text-muted',
                compact ? 'text-xs line-clamp-1' : 'text-sm leading-relaxed line-clamp-2',
              )}
            >
              {challenge.prompt}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to={href}
            className="rounded-btn bg-primary px-3.5 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-primary-hover"
          >
            View entries
          </Link>
          <Link
            to="/sketches/new"
            className="rounded-btn border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            Join challenge
          </Link>
        </div>
      </div>
    </aside>
  )
}
