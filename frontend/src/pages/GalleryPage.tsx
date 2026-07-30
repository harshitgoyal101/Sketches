import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { SketchCardView } from '@/components/SketchCardView'
import { getSketches } from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import { useGuest } from '@/guest/GuestProvider'
import { useFormats, useTags } from '@/hooks/useSketches'
import { cn, prefersReducedMotion } from '@/lib/utils'

type SortKey = 'featured' | 'recent' | 'all'

function parseSort(value: string | null): SortKey {
  if (value === 'recent') return 'recent'
  if (value === 'all') return 'all'
  return 'featured'
}

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: 'all', label: 'All creations' },
  { key: 'featured', label: 'Staff picks' },
  { key: 'recent', label: 'Recently published' },
]

export function GalleryPage() {
  const reduceMotion = prefersReducedMotion()
  const { isAuthenticated } = useAuth()
  const { requireAuth } = useGuest()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  function onGetStarted() {
    if (isAuthenticated) {
      navigate('/sketches/new')
      return
    }
    if (requireAuth({ type: 'create' })) {
      navigate('/sketches/new')
    }
  }

  const sort = parseSort(searchParams.get('sort'))
  const format = searchParams.get('type') || 'all'
  const tag = searchParams.get('tag') || ''
  const query = searchParams.get('q') || ''

  const [queryInput, setQueryInput] = useState(query)

  const { data: formats } = useFormats()
  const { data: tags } = useTags()

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

  const sketchesQuery = useInfiniteQuery({
    queryKey: ['sketches-infinite', { sort, format, query, tag }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getSketches({
        sort,
        type: format === 'all' ? undefined : format,
        q: query || undefined,
        tag: tag || undefined,
        page: pageParam,
      }),
    getNextPageParam: (last) => (last.has_next ? last.page + 1 : undefined),
  })

  const sketches =
    sketchesQuery.data?.pages.flatMap((page) => page.results) ?? []
  const total = sketchesQuery.data?.pages[0]?.total
  const isPending = sketchesQuery.isPending
  const isError = sketchesQuery.isError
  const isFetching = sketchesQuery.isFetching

  const activeTagName = useMemo(
    () => tags?.find((item) => item.slug === tag)?.name,
    [tags, tag],
  )

  const activeFormatName = useMemo(
    () => formats?.find((item) => item.slug === format)?.name,
    [formats, format],
  )

  const pageTitle = activeTagName
    ? activeTagName
    : query
      ? `Results for “${query}”`
      : 'Discovery gallery'

  const hasFilters = Boolean(query || tag || format !== 'all' || sort !== 'featured')

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  function clearAllFilters() {
    setQueryInput('')
    setSearchParams({}, { replace: true })
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault()
    const next = queryInput.trim()
    patchParams({ q: next || null })
  }

  const visibleTags = (tags ?? []).slice(0, 24)

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-[75rem] px-5 py-10 sm:px-8 sm:py-12">
        {/* Discovery header */}
        <header className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Discovery
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {pageTitle}
              </h1>
              {typeof total === 'number' ? (
                <span className="gallery-count-pill">
                  {total} sketch{total === 1 ? '' : 'es'}
                </span>
              ) : null}
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {activeTagName
                ? `Sketches tagged “${activeTagName}”.`
                : activeFormatName
                  ? `${activeFormatName} sketches from the community.`
                  : 'Explore creative coding sketches — filter by format, tag, or search.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav
              className="flex rounded-btn border border-border p-0.5"
              aria-label="Workspace"
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
                Explore
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
                  My sketches
                </NavLink>
              ) : null}
            </nav>
            <button
              type="button"
              onClick={onGetStarted}
              className="home-btn home-btn-primary !min-h-10 !rounded-btn !px-4 !py-2 !text-sm"
            >
              {isAuthenticated ? 'New sketch' : 'Get started'}
            </button>
          </div>
        </header>

        {/* Search */}
        <form
          className="mb-5"
          onSubmit={onSearchSubmit}
          role="search"
        >
          <label className="sr-only" htmlFor="gallery-search">
            Search sketches
          </label>
          <div className="relative max-w-xl">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="gallery-search"
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search sketches, tags, or creators…"
              className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-10 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
              autoComplete="off"
            />
            {queryInput ? (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-btn p-1.5 text-muted hover:text-foreground"
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

        {/* Sort tabs — hidden when drilling into a tag (Django parity) */}
        {!tag ? (
          <nav
            className="gallery-sort-tabs mb-5"
            aria-label="Gallery sort"
          >
            {SORT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  patchParams({
                    sort: tab.key === 'featured' ? null : tab.key,
                  })
                }
                className={cn(
                  'gallery-sort-tab',
                  sort === tab.key && 'is-active',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        ) : null}

        {/* Format chips */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="sr-only">Filter by format</span>
          <Chip
            active={format === 'all'}
            onClick={() => patchParams({ type: null })}
          >
            All formats
          </Chip>
          {(formats ?? []).map((fmt) => (
            <Chip
              key={fmt.slug}
              active={format === fmt.slug}
              onClick={() =>
                patchParams({
                  type: format === fmt.slug ? null : fmt.slug,
                })
              }
            >
              {fmt.name}
            </Chip>
          ))}
          {isFetching && !isPending ? (
            <span className="ml-1 text-xs text-muted">Updating…</span>
          ) : null}
        </div>

        {/* Tags */}
        {visibleTags.length > 0 ? (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-wide text-muted">
              Tags
            </span>
            <Chip
              active={!tag}
              quiet
              onClick={() => patchParams({ tag: null })}
            >
              All
            </Chip>
            {visibleTags.map((item) => (
              <Chip
                key={item.slug}
                active={tag === item.slug}
                quiet
                onClick={() =>
                  patchParams({ tag: tag === item.slug ? null : item.slug })
                }
              >
                {item.name}
              </Chip>
            ))}
          </div>
        ) : (
          <div className="mb-6" />
        )}

        {/* Active filters bar */}
        {hasFilters ? (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Filtered view</span>
            {query ? (
              <ActivePill onClear={() => {
                setQueryInput('')
                patchParams({ q: null })
              }}
              >
                q: {query}
              </ActivePill>
            ) : null}
            {activeTagName ? (
              <ActivePill onClear={() => patchParams({ tag: null })}>
                tag: {activeTagName}
              </ActivePill>
            ) : null}
            {activeFormatName ? (
              <ActivePill onClear={() => patchParams({ type: null })}>
                {activeFormatName}
              </ActivePill>
            ) : null}
            {sort !== 'featured' ? (
              <ActivePill
                onClear={() => patchParams({ sort: null })}
              >
                {SORT_TABS.find((t) => t.key === sort)?.label}
              </ActivePill>
            ) : null}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
          </div>
        ) : null}

        {/* Grid */}
        {isPending && sketches.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">Loading gallery…</p>
        ) : isError && sketches.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            Could not load sketches.
          </p>
        ) : sketches.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-foreground">
              No sketches match
            </p>
            <p className="mt-2 text-sm text-muted">
              Try another search, tag, or format.
            </p>
            <button
              type="button"
              className="home-btn home-btn-ghost home-btn-quiet mt-6"
              onClick={clearAllFilters}
            >
              Reset filters
            </button>
          </div>
        ) : reduceMotion ? (
          <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sketches.map((sketch) => (
              <SketchCardView key={sketch.id} sketch={sketch} />
            ))}
          </div>
        ) : (
          <AnimatedGroup
            className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            preset="fade"
          >
            {sketches.map((sketch) => (
              <SketchCardView key={sketch.id} sketch={sketch} />
            ))}
          </AnimatedGroup>
        )}

        {sketchesQuery.hasNextPage ? (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              className="home-btn home-btn-ghost"
              disabled={sketchesQuery.isFetchingNextPage}
              onClick={() => void sketchesQuery.fetchNextPage()}
            >
              {sketchesQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : sketches.length > 0 ? (
          <p className="mt-12 text-center text-xs text-muted">
            You’re caught up — {sketches.length} shown
            {typeof total === 'number' ? ` of ${total}` : ''}.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Chip({
  active,
  quiet,
  onClick,
  children,
}: {
  active: boolean
  quiet?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition-colors',
        quiet && 'px-2.5 py-1 text-xs',
        active
          ? 'border-primary/45 bg-primary/12 text-primary'
          : 'border-border text-muted hover:border-primary/35 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function ActivePill({
  children,
  onClear,
}: {
  children: ReactNode
  onClear: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-foreground hover:border-primary/40"
    >
      <span>{children}</span>
      <X size={12} className="text-muted" aria-hidden />
    </button>
  )
}
