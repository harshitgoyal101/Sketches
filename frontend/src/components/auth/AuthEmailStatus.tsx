import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'

type AuthEmailStatusProps = {
  icon: ReactNode
  title: string
  children: ReactNode
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}

/**
 * Shared success / inbox-check panel for verification & password emails.
 */
export function AuthEmailStatus({
  icon,
  title,
  children,
  primaryHref = '/login',
  primaryLabel = 'Back to log in',
  secondaryHref,
  secondaryLabel,
}: AuthEmailStatusProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4">
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-btn bg-primary/12 text-primary ring-1 ring-primary/20"
          aria-hidden
        >
          {icon}
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <div className="text-sm leading-relaxed text-muted">{children}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <Link to={primaryHref} className={cn(primaryBtnClass, 'w-full')}>
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link to={secondaryHref} className={cn(secondaryBtnClass, 'w-full')}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
