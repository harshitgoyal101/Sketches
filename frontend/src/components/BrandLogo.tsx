import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  /** Invert wordmark for dark hero / dark panels */
  onDark?: boolean
  /** Hide wordmark (mark only) */
  markOnly?: boolean
}

/** Geometric 101 cube — transparent bg, black borders (logo-cube-transparent.svg). */
function CubeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M250 70L410 162L250 254L90 162Z"
        fill="#A894FF"
        stroke="#0D0D0D"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <path
        d="M90 162L155 200V385L90 347Z"
        fill="#7B61FF"
        stroke="#0D0D0D"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <path d="M112 185L138 200V360L112 345Z" fill="#A894FF" fillOpacity="0.35" />
      <path
        d="M410 162L345 200V385L410 347Z"
        fill="#6A50EE"
        stroke="#0D0D0D"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <path d="M388 185L362 200V360L388 345Z" fill="#A894FF" fillOpacity="0.22" />
      <path
        d="M155 200L250 254L345 200V385L250 439L155 385Z"
        fill="#F8FAFC"
        stroke="#0D0D0D"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <path d="M168 218L250 265V412L168 365Z" fill="#FFFFFF" fillOpacity="0.55" />
      <path
        d="M250 290L205 265V355L250 380L295 355V265Z"
        fill="#0D0D0D"
        stroke="#0D0D0D"
        strokeWidth="10"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Sketches101 mark + wordmark (transparent geometric cube).
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
        'inline-flex items-center gap-2.5 font-display text-[1.05rem] font-bold tracking-tight',
        onDark ? 'text-white' : 'text-foreground',
        className,
      )}
      aria-label="Sketches101 home"
    >
      <CubeMark />
      {markOnly ? null : (
        <span>
          Sketches<span className="text-primary">101</span>
        </span>
      )}
    </Link>
  )
}
