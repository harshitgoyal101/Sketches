import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { BrandLogo } from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useContinueSketch } from '@/hooks/useContinueSketch'
import { useTheme } from '@/theme/ThemeProvider'
import { useGuest } from '@/guest/GuestProvider'
import { cn } from '@/lib/utils'

const DESKTOP_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/gallery', label: 'Sketches' },
  { to: '/games', label: 'Games' },
  { to: '/explore/today', label: 'Today' },
  { to: '/saved', label: 'Saved' },
] as const

type AppHeaderProps = {
  transparent?: boolean
}

export function AppHeader({ transparent = false }: AppHeaderProps) {
  const { theme } = useTheme()
  const { user, isLoading, logout } = useAuth()
  const { requireAuth } = useGuest()
  const { continueSketch } = useContinueSketch()
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

  const btnBase =
    'inline-flex h-9 cursor-pointer items-center justify-center rounded-btn px-3.5 text-sm font-semibold transition-colors duration-200'

  const loginBtn = cn(
    btnBase,
    'border',
    overHeroDark
      ? 'border-white/30 bg-transparent text-white hover:bg-white/10'
      : 'border-border bg-transparent text-foreground hover:border-primary/40 hover:bg-primary/5',
  )

  const primaryBtn = cn(
    btnBase,
    'bg-primary text-[var(--color-on-primary)] hover:bg-primary-hover',
  )

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-btn px-2.5 py-1.5 text-sm font-medium transition-colors duration-200',
      isActive
        ? overHeroDark
          ? 'text-white'
          : 'text-primary'
        : overHeroDark
          ? 'text-white/65 hover:text-white'
          : 'text-muted hover:text-foreground',
    )

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300',
          overHero
            ? 'border-b border-transparent bg-transparent'
            : 'glass-nav border-b border-border',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[75rem] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <BrandLogo onDark={overHeroDark} />

          <nav
            className="ml-1 hidden items-center gap-0.5 lg:flex"
            aria-label="Main"
          >
            {DESKTOP_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : undefined}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <form
              onSubmit={onSearch}
              className="relative w-[min(100%,13.5rem)]"
              role="search"
            >
              <Search
                size={15}
                className={cn(
                  'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2',
                  overHeroDark ? 'text-white/45' : 'text-muted',
                )}
              />
              <label className="sr-only" htmlFor="nav-search">
                Search sketches
              </label>
              <input
                id="nav-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className={cn(
                  'h-9 w-full rounded-btn border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition-[border-color,background-color] duration-200 placeholder:text-muted focus:border-primary',
                  overHeroDark
                    ? 'border-white/20 text-white placeholder:text-white/40 focus:bg-white/10'
                    : overHeroLight
                      ? 'border-border/70 bg-white/60 text-foreground'
                      : 'border-border bg-surface/80 text-foreground',
                )}
              />
            </form>

            <ThemeToggle overHero={overHeroDark} />

            {!isLoading && user ? (
              <>
                {continueSketch ? (
                  <Link
                    to={`/sketches/${continueSketch.slug}/edit`}
                    className={cn(
                      'hidden xl:inline-flex',
                      loginBtn,
                      'font-medium',
                    )}
                    title={`Continue editing ${continueSketch.title}`}
                  >
                    Continue
                  </Link>
                ) : null}
                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-btn border text-xs font-semibold uppercase transition-colors duration-200',
                      overHeroDark
                        ? 'border-white/30 bg-white/10 text-white hover:bg-white/15'
                        : 'border-border bg-surface text-foreground hover:border-primary/40',
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
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-btn border border-border bg-surface shadow-lg"
                    >
                      <div className="border-b border-border px-3.5 py-2.5">
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
                        className="block px-3.5 py-2.5 text-sm text-foreground transition-colors hover:bg-primary/10"
                        onClick={() => setAccountOpen(false)}
                      >
                        My Sketches
                      </Link>
                      <Link
                        to="/sketches/new"
                        role="menuitem"
                        className="block px-3.5 py-2.5 text-sm text-foreground transition-colors hover:bg-primary/10"
                        onClick={() => setAccountOpen(false)}
                      >
                        New Sketch
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full cursor-pointer px-3.5 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
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
              </>
            ) : (
              <>
                <Link to="/login" className={loginBtn}>
                  Log in
                </Link>
                <button type="button" onClick={onGetStarted} className={primaryBtn}>
                  Get started
                </button>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <ThemeToggle overHero={overHeroDark} />
            <button
              type="button"
              className={cn(
                'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-btn border transition-colors duration-200',
                overHeroDark
                  ? 'border-white/25 text-white hover:bg-white/10'
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
          'fixed inset-0 z-40 lg:hidden',
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
            <div id={menuTitleId}>
              <BrandLogo />
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-btn p-2 text-muted hover:text-foreground"
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
                className="h-10 w-full rounded-btn border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </form>

          <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Mobile">
            <MobileLink to="/" end>
              Home
            </MobileLink>
            <MobileLink to="/gallery">Sketches</MobileLink>
            <MobileLink to="/games">Games</MobileLink>
            <MobileLink to="/explore/today">Today</MobileLink>
            <MobileLink to="/saved">Saved</MobileLink>
            {!isLoading && user ? (
              <>
                {continueSketch ? (
                  <Link
                    to={`/sketches/${continueSketch.slug}/edit`}
                    className="rounded-btn px-3 py-3 text-sm font-medium text-primary hover:bg-primary/10"
                    onClick={() => setMenuOpen(false)}
                    title={`Continue editing ${continueSketch.title}`}
                  >
                    Continue
                  </Link>
                ) : null}
                <MobileLink to="/account">My Sketches</MobileLink>
                <MobileLink to="/sketches/new">New Sketch</MobileLink>
                <button
                  type="button"
                  className="cursor-pointer rounded-btn px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setMenuOpen(false)
                    void logout()
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="mt-auto space-y-2 border-t border-border p-3">
                  <Link
                    to="/login"
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-btn border border-border text-sm font-semibold text-foreground hover:bg-primary/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <button
                    type="button"
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-btn bg-primary text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover"
                    onClick={() => {
                      setMenuOpen(false)
                      onGetStarted()
                    }}
                  >
                    Get started
                  </button>
                </div>
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
