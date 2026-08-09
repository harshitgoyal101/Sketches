import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Play, Search, Shuffle, X } from 'lucide-react'
import { getSketches } from '@/api/sketches'
import { SketchCardView } from '@/components/SketchCardView'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { SlidingFilterTabs } from '@/components/SlidingFilterTabs'
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
  const [searchParams, setSearchParams] = useSearchParams()

  const sortParam = searchParams.get('sort')
  const sort: SortKey = sortParam === 'recent' ? 'recent' : 'featured'
  const query = searchParams.get('q') || ''
  const [queryInput, setQueryInput] = useState(query)

  useDocumentTitle(
    'Games · Sketches101',
    'Play-only creative coding games — fullscreen in the browser.',
  )

  const welcomeName = user?.username || guest?.displayName || null

  useEffect(() => {
    setQueryInput(query)
  }, [query])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = queryInput.trim()
      if (next === query) return
      const params = new URLSearchParams(searchParams)
      if (next) params.set('q', next)
      else params.delete('q')
      setSearchParams(params, { replace: true })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [queryInput, query, searchParams, setSearchParams])

  const listQuery = useInfiniteQuery({
    queryKey: ['games', 'list', sort, query],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getSketches({
        games: true,
        sort,
        q: query || undefined,
        page: pageParam,
      }),
    getNextPageParam: (last) => (last.has_next ? last.page + 1 : undefined),
  })

  const sketches = listQuery.data?.pages.flatMap((p) => p.results) ?? []
  const total = listQuery.data?.pages[0]?.total ?? 0
  const firstSlug = sketches[0]?.slug ?? null

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault()
    const next = queryInput.trim()
    patchParams({ q: next || null })
  }

  function playRandom() {
    if (sketches.length === 0) return
    const pick = sketches[Math.floor(Math.random() * sketches.length)]
    if (pick?.slug) navigate(`/games/${pick.slug}`)
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      <SketchDetailAtmosphere />
      <div className="relative z-10 mx-auto max-w-[75rem] px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-5 space-y-6">
          <div className="relative overflow-hidden border-b border-border pb-8">
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
                  {query ? `Results for “${query}”` : 'Games'}
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                  {query
                    ? 'Clear search to browse all playable games.'
                    : 'Play-only sketches — hit Play and jump straight into fullscreen. No source, no forks.'}
                </p>
              </div>

              <div className="relative flex flex-wrap items-center gap-2">
                <Link
                  to="/gallery"
                  className="cursor-pointer rounded-btn border border-border bg-background/55 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40"
                >
                  Sketches
                </Link>
                <button
                  type="button"
                  disabled={!firstSlug}
                  onClick={playRandom}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border bg-background/55 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
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

            <form className="mt-5" onSubmit={onSearchSubmit} role="search">
              <label className="sr-only" htmlFor="games-search">
                Search games
              </label>
              <div className="relative max-w-xl">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-foreground/80"
                  aria-hidden
                />
                <input
                  id="games-search"
                  type="search"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Search games..."
                  className="w-full rounded-xl border border-border bg-background/55 py-3 pl-10 pr-10 text-sm text-foreground outline-none backdrop-blur-sm placeholder:text-muted focus:border-primary [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                  autoComplete="off"
                />
                {queryInput ? (
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded-btn p-1.5 text-foreground/80 hover:text-foreground"
                    aria-label="Clear search"
                    onClick={() => {
                      setQueryInput('')
                      patchParams({ q: null })
                    }}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </header>

        <SlidingFilterTabs
          className="mb-6"
          tabs={SORT_TABS}
          value={sort}
          onChange={(key) =>
            patchParams({ sort: key === 'featured' ? null : key })
          }
          reduceMotion={reduceMotion}
          ariaLabel="Sort games"
        />

        {listQuery.isPending ? (
          <p className="text-sm text-muted">Loading games…</p>
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Could not load games.
          </p>
        ) : sketches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/50 px-5 py-14 text-center backdrop-blur-sm">
            <p className="font-display text-lg font-semibold">
              {query ? 'No matching games' : 'No games yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {query
                ? `Nothing matched “${query}”. Try a different search.`
                : 'Authors can mark a published sketch as a game in Settings — it then shows up here for anyone to play.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQueryInput('')
                    patchParams({ q: null })
                  }}
                  className="home-btn home-btn-ghost !min-h-10 !px-4 !py-2 !text-sm"
                >
                  Clear search
                </button>
              ) : (
                <Link
                  to="/gallery"
                  className="home-btn home-btn-ghost !min-h-10 !px-4 !py-2 !text-sm"
                >
                  Browse sketches
                </Link>
              )}
              {isAuthenticated ? (
                <Link
                  to="/account"
                  className="home-btn home-btn-primary !min-h-10 !px-4 !py-2 !text-sm"
                >
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
                  className="rounded-btn border border-border bg-background/55 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40 disabled:opacity-60"
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
