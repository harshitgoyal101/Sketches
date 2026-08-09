import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

export type SlidingFilterTab<T extends string = string> = {
  key: T
  label: string
}

type SlidingFilterTabsProps<T extends string> = {
  tabs: readonly SlidingFilterTab<T>[]
  value: T
  onChange: (key: T) => void
  reduceMotion?: boolean
  ariaLabel: string
  className?: string
}

/**
 * Segmented control with a sliding active pill (gallery/games sort filters).
 */
export function SlidingFilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  reduceMotion = false,
  ariaLabel,
  className,
}: SlidingFilterTabsProps<T>) {
  const containerRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  const syncIndicator = () => {
    const index = tabs.findIndex((tab) => tab.key === value)
    const el = tabRefs.current[index]
    if (!el) return
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
      ready: true,
    })
  }

  useLayoutEffect(() => {
    syncIndicator()
  }, [value, tabs])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => syncIndicator())
    observer.observe(container)
    window.addEventListener('resize', syncIndicator)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncIndicator)
    }
  }, [value, tabs])

  return (
    <nav
      ref={containerRef}
      className={cn('gallery-sort-tabs', className)}
      aria-label={ariaLabel}
    >
      <span
        aria-hidden
        className={cn(
          'gallery-sort-indicator',
          reduceMotion && 'gallery-sort-indicator--instant',
          !indicator.ready && 'opacity-0',
        )}
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
        }}
      />
      {tabs.map((tab, index) => {
        const active = value === tab.key
        return (
          <button
            key={tab.key}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.key)}
            className={cn('gallery-sort-tab', active && 'is-active')}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
