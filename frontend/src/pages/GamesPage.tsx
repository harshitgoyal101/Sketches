import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Play, Shuffle } from 'lucide-react'
import { getSketches } from '@/api/sketches'
import { SketchCardView } from '@/components/SketchCardView'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { useAuth } from '@/auth/AuthProvider'
import { useGuest } from '@/guest/GuestProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn, prefersReducedMotion } from '@/lib/utils'

type SortKey = 'featured' | 'recent'

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'recent', label: 'Newest' },
]

export function GamesPage() {
  const reduceMotion = prefersReducedMotion()
  const { user, isAuthenticated } = useAuth()
  const { guest } = useGuest()
  const navigate = useNavigate()
  const [sort, setSort] = useState<SortKey>('featured')

  useDocumentTitle(
    'Games · Sketches101',
    'Play-only creative coding games — fullscreen in the browser.',
  )

  const welcomeName = user?.username || guest?.displayName || null

  const listQuery = useInfiniteQuery({
    queryKey: ['games', 'list', sort],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getSketches({
        games: true,
        sort,
        page: pageParam,
      }),
    getNextPageParam: (last) => (last.has_next ? last.page + 1 : undefined),
  })

  const sketches = listQuery.data?.pages.flatMap((p) => p.results) ?? []
  const total = listQuery.data?.pages[0]?.total ?? 0
  const firstSlug = sketches[0]?.slug ?? null

  function playRandom() {
    if (sketches.length === 0) return
    const pick = sketches[Math.floor(Math.random() * sketches.length)]
    if (pick?.slug) navigate(`/games/${pick.slug}`)
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      <SketchDetailAtmosphere />
      <div className="relative z-10 mx-auto max-w-[75rem] px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-10 space-y-6 lg:mb-12">
          <div className="relative overflow-hidden border-b border-border/70 pb-8">
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-2xl space-y-3">
                <p
                  className={cn(
                    'font-display font-semibold tracking-tight',
                    'text-[clamp(1.35rem,3.2vw,2rem)] leading-tight',
                    'text-foreground',
                  )}
                >
                  {welcomeName ? (
                    <>
                      Ready to play,{' '}
                      <span className="text-primary">{welcomeName}</span>
                    </>
                  ) : (
                    <>
                      Welcome to{' '}
                      <span className="text-primary">Games</span>
                    </>
                  )}
                </p>
                <h1 className="font-display text-[clamp(1.85rem,4vw,2.75rem)] font-semibold tracking-tight text-foreground">
                  Games
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                  Play-only sketches — hit Play and jump straight into fullscreen.
                  No source, no forks.
                </p>
                {typeof total === 'number' && !listQuery.isPending ? (
                  <p className="pt-1 text-xs text-muted">
                    <span className="font-medium text-foreground/80">
                      {total.toLocaleString()}
                    </span>{' '}
                    game{total === 1 ? '' : 's'} ready to play
                  </p>
                ) : null}
              </div>

              <div className="relative flex flex-wrap items-center gap-2">
                <Link
                  to="/gallery"
                  className="cursor-pointer rounded-btn border border-border/80 bg-background/55 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40"
                >
                  Sketches
                </Link>
                <button
                  type="button"
                  disabled={!firstSlug}
                  onClick={playRandom}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border/80 bg-background/55 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Shuffle size={16} aria-hidden />
                  Surprise me
                </button>
                {firstSlug ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/games/${firstSlug}`)}
                    className="home-btn home-btn-primary !min-h-10 !rounded-btn !px-4 !py-2 !text-sm inline-flex items-center gap-2"
                  >
                    <Play size={14} fill="currentColor" aria-hidden />
                    Play
                  </button>
                ) : isAuthenticated ? (
                  <Link
                    to="/account"
                    className="home-btn home-btn-primary !min-h-10 !rounded-btn !px-4 !py-2 !text-sm"
                  >
                    Account
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <nav
            className="flex w-fit rounded-btn border border-border/80 bg-background/40 p-0.5 backdrop-blur-sm"
            aria-label="Browse"
          >
            <NavLink
              to="/gallery"
              className={({ isActive }) =>
                cn(
                  'rounded-[0.5rem] px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted hover:text-foreground',
                )
              }
            >
              Sketches
            </NavLink>
            <NavLink
              to="/games"
              className={({ isActive }) =>
                cn(
                  'rounded-[0.5rem] px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted hover:text-foreground',
                )
              }
            >
              Games
            </NavLink>
            {isAuthenticated ? (
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  cn(
                    'rounded-[0.5rem] px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted hover:text-foreground',
                  )
                }
              >
                Account
              </NavLink>
            ) : null}
          </nav>
        </header>

        <div
          className="mb-6 flex w-fit rounded-btn border border-border/80 bg-background/40 p-0.5 backdrop-blur-sm"
          role="tablist"
          aria-label="Sort games"
        >
          {SORT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={sort === tab.key}
              onClick={() => setSort(tab.key)}
              className={cn(
                'cursor-pointer rounded-[0.5rem] px-3 py-1.5 text-sm font-medium transition-colors',
                sort === tab.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {listQuery.isPending ? (
          <p className="text-sm text-muted">Loading games…</p>
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Could not load games.
          </p>
        ) : sketches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-background/50 px-5 py-14 text-center backdrop-blur-sm">
            <p className="font-display text-lg font-semibold">No games yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Authors can mark a published sketch as a game in Settings — it
              then shows up here for anyone to play.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/gallery" className="home-btn home-btn-ghost !min-h-10 !px-4 !py-2 !text-sm">
                Browse sketches
              </Link>
              {isAuthenticated ? (
                <Link to="/account" className="home-btn home-btn-primary !min-h-10 !px-4 !py-2 !text-sm">
                  Your account
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <AnimatedGroup
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              preset={reduceMotion ? undefined : 'blur-slide'}
            >
              {sketches.map((sketch) => (
                <SketchCardView key={sketch.id} sketch={sketch} />
              ))}
            </AnimatedGroup>
            {listQuery.hasNextPage ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  disabled={listQuery.isFetchingNextPage}
                  onClick={() => void listQuery.fetchNextPage()}
                  className="rounded-btn border border-border/80 bg-background/55 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40 disabled:opacity-60"
                >
                  {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
