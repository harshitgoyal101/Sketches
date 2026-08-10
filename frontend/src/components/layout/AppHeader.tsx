import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Gamepad2,
  Heart,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { BrandLogo } from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useContinueSketch } from '@/hooks/useContinueSketch'
import { useTheme } from '@/theme/ThemeProvider'
import { useGuest } from '@/guest/GuestProvider'
import { cn } from '@/lib/utils'

const DESKTOP_NAV = [
  { to: '/gallery', label: 'Sketches' },
  { to: '/games', label: 'Games' },
  { to: '/explore/today', label: 'Today' },
  { to: '/favourites', label: 'Favourites' },
] as const

const MOBILE_EXPLORE = [
  { to: '/gallery', label: 'Sketches', icon: LayoutGrid },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/explore/today', label: 'Today', icon: Sparkles },
  { to: '/favourites', label: 'Favourites', icon: Heart },
] as const

type AppHeaderProps = {
  transparent?: boolean
}

export function AppHeader({ transparent = false }: AppHeaderProps) {
  const { theme } = useTheme()
  const { user, isLoading, logout } = useAuth()
  const { guest, requireAuth } = useGuest()
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
        <div className="mx-auto flex h-16 max-w-[75rem] items-center gap-3 px-4 sm:gap-4 sm:px-6 nav:px-8">
          <BrandLogo onDark={overHeroDark} />

          <nav
            className="ml-1 hidden items-center gap-0.5 nav:flex"
            aria-label="Main"
          >
            {DESKTOP_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 nav:flex">
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
                      ? 'border-border bg-white/60 text-foreground'
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

          <div className="ml-auto flex items-center gap-2 nav:hidden">
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
          'fixed inset-0 z-40 nav:hidden',
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

          {!isLoading && user ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold uppercase text-primary"
                    aria-hidden
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold tracking-tight text-foreground">
                      {user.username}
                    </p>
                    {user.email ? (
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <form
                onSubmit={onSearch}
                className="border-b border-border px-4 py-3"
                role="search"
              >
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
                    placeholder="Search sketches…"
                    className="h-10 w-full rounded-btn border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </form>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-2">
                  {continueSketch ? (
                    <Link
                      to={`/sketches/${continueSketch.slug}/edit`}
                      className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3 text-left transition-colors hover:bg-primary/15"
                      onClick={() => setMenuOpen(false)}
                      title={`Continue editing ${continueSketch.title}`}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[var(--color-on-primary)]">
                        <Pencil size={16} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-primary">
                          Continue editing
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {continueSketch.title}
                        </span>
                      </span>
                    </Link>
                  ) : null}
                  <Link
                    to="/sketches/new"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-[var(--color-on-primary)] transition-colors hover:bg-primary-hover"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Plus size={16} aria-hidden />
                    New sketch
                  </Link>
                </div>

                <p className="mb-2 mt-5 px-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
                  Explore
                </p>
                <nav className="flex flex-col gap-0.5" aria-label="Mobile explore">
                  {MOBILE_EXPLORE.map(({ to, label, icon: Icon }) => (
                    <MobileIconLink key={to} to={to} icon={Icon}>
                      {label}
                    </MobileIconLink>
                  ))}
                </nav>

                <p className="mb-2 mt-5 px-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
                  Account
                </p>
                <nav className="flex flex-col gap-0.5" aria-label="Mobile account">
                  <MobileIconLink to="/account" icon={FolderOpen}>
                    My sketches
                  </MobileIconLink>
                </nav>
              </div>

              <div className="mt-auto border-t border-border p-3">
                <button
                  type="button"
                  className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() => {
                    setMenuOpen(false)
                    void logout()
                  }}
                >
                  <LogOut size={16} aria-hidden />
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
                    aria-hidden
                  >
                    <UserRound size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold tracking-tight text-foreground">
                      {guest?.displayName?.trim() || 'Guest'}
                    </p>
                    <p className="truncate text-xs text-muted">
                      Sign in to save and sync your work
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={onSearch}
                className="border-b border-border px-4 py-3"
                role="search"
              >
                <label className="sr-only" htmlFor="mobile-nav-search-guest">
                  Search sketches
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    id="mobile-nav-search-guest"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search sketches…"
                    className="h-10 w-full rounded-btn border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </form>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3 text-left transition-colors hover:bg-primary/15"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[var(--color-on-primary)]">
                      <LogIn size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-primary">
                        Log in
                      </span>
                      <span className="block truncate text-xs text-muted">
                        Access your sketches and scores
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-primary-hover"
                    onClick={() => {
                      setMenuOpen(false)
                      onGetStarted()
                    }}
                  >
                    <Plus size={16} aria-hidden />
                    Get started
                  </button>
                </div>

                <p className="mb-2 mt-5 px-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
                  Explore
                </p>
                <nav className="flex flex-col gap-0.5" aria-label="Mobile explore">
                  {MOBILE_EXPLORE.map(({ to, label, icon: Icon }) => (
                    <MobileIconLink key={to} to={to} icon={Icon}>
                      {label}
                    </MobileIconLink>
                  ))}
                </nav>
              </div>

              <div className="mt-auto border-t border-border p-3">
                <Link
                  to="/signup"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-background"
                  onClick={() => setMenuOpen(false)}
                >
                  Create account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function MobileIconLink({
  to,
  end,
  icon: Icon,
  children,
}: {
  to: string
  end?: boolean
  icon: typeof LayoutGrid
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-foreground hover:bg-background',
        )
      }
    >
      <Icon size={18} className="shrink-0 opacity-80" aria-hidden />
      {children}
    </NavLink>
  )
}
