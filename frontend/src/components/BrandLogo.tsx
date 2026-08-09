import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  /** Invert wordmark for dark hero / dark panels */
  onDark?: boolean
  /** Hide wordmark (mark only) */
  markOnly?: boolean
}

/**
 * Consistent sketches101 mark + wordmark (matches favicon: purple tile + [}]).
 */
export function BrandLogo({
  className,
  onDark = false,
  markOnly = false,
}: BrandLogoProps) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center gap-2.5 font-display text-[1.05rem] font-semibold tracking-tight',
        onDark ? 'text-white' : 'text-foreground',
        className,
      )}
      aria-label="Sketches101 home"
    >
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-[0.7rem] font-bold text-[var(--color-on-primary)]"
        aria-hidden
      >
        {'[}]'}
      </span>
      {markOnly ? null : (
        <span>
          Sketches<span className="text-primary">101</span>
        </span>
      )}
    </Link>
  )
}
