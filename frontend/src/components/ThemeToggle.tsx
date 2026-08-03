import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  /** Hero-over-dark: glass / white chrome instead of surface tokens */
  overHero?: boolean
  className?: string
}

/**
 * Light / dark theme control — icon segment with a sliding active pill.
 */
export function ThemeToggle({ overHero = false, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div
      className={cn(
        'relative inline-grid h-9 w-[4.5rem] grid-cols-2 items-center rounded-full border p-0.5',
        overHero
          ? 'border-white/25 bg-white/10'
          : 'border-border bg-surface/80',
        className,
      )}
      role="group"
      aria-label="Color theme"
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          overHero ? 'bg-white shadow-sm' : 'bg-primary shadow-[0_0_0_1px_rgba(123,97,255,0.35)]',
          isLight ? 'translate-x-0' : 'translate-x-full',
        )}
      />
      <button
        type="button"
        className={cn(
          'relative z-10 inline-flex h-full w-full items-center justify-center rounded-full transition-colors duration-200',
          isLight
            ? overHero
              ? 'text-background'
              : 'text-[var(--color-on-primary)]'
            : overHero
              ? 'text-white/55 hover:text-white'
              : 'text-muted hover:text-foreground',
        )}
        aria-label="Light mode"
        aria-pressed={isLight}
        onClick={() => setTheme('light')}
      >
        <Sun size={15} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={cn(
          'relative z-10 inline-flex h-full w-full items-center justify-center rounded-full transition-colors duration-200',
          !isLight
            ? overHero
              ? 'text-background'
              : 'text-[var(--color-on-primary)]'
            : overHero
              ? 'text-white/55 hover:text-white'
              : 'text-muted hover:text-foreground',
        )}
        aria-label="Dark mode"
        aria-pressed={!isLight}
        onClick={() => setTheme('dark')}
      >
        <Moon size={15} strokeWidth={2.25} />
      </button>
    </div>
  )
}
