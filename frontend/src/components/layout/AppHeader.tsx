import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Moon, Search, Sun, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { useGuest } from '@/guest/GuestProvider'
import { cn } from '@/lib/utils'

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-btn px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'text-primary' : 'text-muted hover:text-foreground',
  )

type AppHeaderProps = {
  transparent?: boolean
}

export function AppHeader({ transparent = false }: AppHeaderProps) {
  const { theme, setTheme, toggleTheme } = useTheme()
  const { user, isLoading, logout } = useAuth()
  const { guest, isGuest, requireAuth } = useGuest()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [query, setQuery] = useState('')
  const accountRef = useRef<HTMLDivElement>(null)
  const menuTitleId = useId()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setAccountOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    document.body.classList.toggle('is-gallery-nav-open', menuOpen)
    return () => document.body.classList.remove('is-gallery-nav-open')
  }, [menuOpen])

  useEffect(() => {
    if (!accountOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/gallery?q=${encodeURIComponent(q)}` : '/gallery')
    setMenuOpen(false)
  }

  const overHero = transparent && !scrolled && !menuOpen
  const overHeroLight = overHero && theme === 'light'
  const overHeroDark = overHero && theme === 'dark'
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '?'

  function onGetStarted() {
    if (user) {
      navigate('/sketches/new')
      return
    }
    if (requireAuth({ type: 'create' })) {
      navigate('/sketches/new')
    }
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition-[background,border,backdrop-filter] duration-300',
          overHero
            ? 'border-b border-transparent bg-transparent'
            : 'glass-nav border-b border-border',
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 xl:gap-4">
          <Link
            to="/"
            className={cn(
              'flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight',
              overHeroDark ? 'text-white' : 'text-foreground',
            )}
            aria-label="Sketches101 home"
          >
            <span className="font-mono text-sm text-primary" aria-hidden>
              {'[}]'}
            </span>
            <span>
              sketches<span className="text-primary">101</span>
            </span>
          </Link>

          <form
            onSubmit={onSearch}
            className="relative hidden min-w-0 flex-1 xl:block"
            role="search"
          >
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <label className="sr-only" htmlFor="nav-search">
              Search sketches
            </label>
            <input
              id="nav-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sketches, makers, tags…"
              className={cn(
                'w-full rounded-btn border bg-surface/80 py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary',
                overHero ? 'border-white/20' : 'border-border',
                overHeroLight && 'border-border/60',
              )}
            />
          </form>

          <nav
            className="hidden items-center gap-1 xl:flex"
            aria-label="Main"
          >
            <NavLink to="/" end className={desktopLinkClass}>
              Home
            </NavLink>
            <NavLink to="/gallery" className={desktopLinkClass}>
              Explore
            </NavLink>
          </nav>

          <div className="ml-auto hidden items-center gap-2 xl:flex">
            <ThemeSegment theme={theme} setTheme={setTheme} overHero={overHeroDark} />
            {!isLoading && user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold uppercase',
                    overHeroDark
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-border bg-surface text-foreground',
                  )}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((v) => !v)}
                >
                  {initials}
                </button>
                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-52 overflow-hidden rounded-btn border border-border bg-surface shadow-lg"
                  >
                    <div className="border-b border-border px-3 py-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user.username}
                      </p>
                      {user.email ? (
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      ) : null}
                    </div>
                    <Link
                      to="/account"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10"
                      onClick={() => setAccountOpen(false)}
                    >
                      My Sketches
                    </Link>
                    <Link
                      to="/sketches/new"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10"
                      onClick={() => setAccountOpen(false)}
                    >
                      New Sketch
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setAccountOpen(false)
                        void logout()
                      }}
                    >
                      Log out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {isGuest && guest ? (
                  <span
                    className={cn(
                      'max-w-[10rem] truncate text-sm',
                      overHeroDark ? 'text-white/80' : 'text-muted',
                    )}
                    title={`Playing as ${guest.displayName}`}
                  >
                    Playing as {guest.displayName}
                  </span>
                ) : null}
                <Link
                  to="/sandbox"
                  className={cn(
                    'rounded-btn px-3 py-1.5 text-sm font-medium',
                    overHeroDark
                      ? 'text-white/90 hover:text-white'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Sandbox
                </Link>
                <Link
                  to="/login"
                  className={cn(
                    'rounded-btn px-3 py-1.5 text-sm font-medium',
                    overHeroDark
                      ? 'text-white/90 hover:text-white'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Log in
                </Link>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="rounded-btn bg-primary px-3 py-1.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover"
                >
                  Get started
                </button>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 xl:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-btn border',
                overHeroDark
                  ? 'border-white/25 text-white'
                  : 'border-border text-muted hover:text-foreground',
              )}
              aria-label={
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-btn border',
                overHeroDark
                  ? 'border-white/25 text-white'
                  : 'border-border text-muted hover:text-foreground',
              )}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 xl:hidden',
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity',
            menuOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={menuTitleId}
          className={cn(
            'absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-border bg-surface shadow-xl transition-transform duration-300',
            menuOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <p id={menuTitleId} className="font-display text-base font-semibold">
              Menu
            </p>
            <button
              type="button"
              className="rounded-btn p-2 text-muted hover:text-foreground"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSearch} className="border-b border-border p-4" role="search">
            <label className="sr-only" htmlFor="mobile-nav-search">
              Search sketches
            </label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="mobile-nav-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-btn border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </form>

          <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
            <MobileLink to="/" end>
              Home
            </MobileLink>
            <MobileLink to="/gallery">Explore</MobileLink>
            {!isLoading && user ? (
              <>
                <MobileLink to="/account">My Sketches</MobileLink>
                <MobileLink to="/sketches/new">New Sketch</MobileLink>
                <button
                  type="button"
                  className="rounded-btn px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setMenuOpen(false)
                    void logout()
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                {isGuest && guest ? (
                  <p className="px-3 py-2 text-sm text-muted">
                    Playing as {guest.displayName}
                  </p>
                ) : null}
                <MobileLink to="/sandbox">Sandbox</MobileLink>
                <MobileLink to="/login">Log in</MobileLink>
                <button
                  type="button"
                  className="mt-2 rounded-btn bg-primary px-3 py-3 text-center text-sm font-semibold text-[var(--color-on-primary)]"
                  onClick={() => {
                    setMenuOpen(false)
                    onGetStarted()
                  }}
                >
                  Get started
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}

function MobileLink({
  to,
  end,
  children,
}: {
  to: string
  end?: boolean
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-btn px-3 py-3 text-sm font-medium',
          isActive ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-background',
        )
      }
    >
      {children}
    </NavLink>
  )
}

function ThemeSegment({
  theme,
  setTheme,
  overHero,
}: {
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
  overHero: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-btn border p-0.5',
        overHero ? 'border-white/25' : 'border-border',
      )}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        className={cn(
          'rounded-[0.45rem] px-2.5 py-1 text-xs font-medium',
          theme === 'light'
            ? 'bg-primary text-[var(--color-on-primary)]'
            : overHero
              ? 'text-white/70 hover:text-white'
              : 'text-muted hover:text-foreground',
        )}
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        Light
      </button>
      <button
        type="button"
        className={cn(
          'rounded-[0.45rem] px-2.5 py-1 text-xs font-medium',
          theme === 'dark'
            ? 'bg-primary text-[var(--color-on-primary)]'
            : overHero
              ? 'text-white/70 hover:text-white'
              : 'text-muted hover:text-foreground',
        )}
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        Dark
      </button>
    </div>
  )
}
