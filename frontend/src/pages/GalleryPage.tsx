import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, Shuffle, X } from 'lucide-react'
import { GalleryPlayMode } from '@/components/gallery/GalleryPlayMode'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { SketchCardView } from '@/components/SketchCardView'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { SlidingFilterTabs } from '@/components/SlidingFilterTabs'
import { getSketches } from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import { useGuest } from '@/guest/GuestProvider'
import { useFormats, useTags } from '@/hooks/useSketches'
import { cn, prefersReducedMotion } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type SortKey = 'featured' | 'recent' | 'all'

function parseSort(value: string | null): SortKey {
  if (value === 'recent') return 'recent'
  if (value === 'all') return 'all'
  return 'featured'
}

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: 'all', label: 'All creations' },
  { key: 'featured', label: 'Featured' },
  { key: 'recent', label: 'Recent' },
]

export function GalleryPage() {
  const reduceMotion = prefersReducedMotion()
  const { user, isAuthenticated } = useAuth()
  const { guest, requireAuth } = useGuest()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  useDocumentTitle(
    'Sketches · Sketches101',
    'Browse generative p5.js and Processing sketches from the community.',
  )

  const welcomeName = user?.username || guest?.displayName || null

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
  const [playOpen, setPlayOpen] = useState(false)

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
  const isPending = sketchesQuery.isPending
  const isError = sketchesQuery.isError

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
      : welcomeName
        ? 'Discover sketches'
        : 'Sketches'

  const pageLead = activeTagName
    ? `Sketches tagged “${activeTagName}”.`
    : activeFormatName
      ? `${activeFormatName} sketches from the community.`
      : 'Explore the gallery, share your creations, and personalize your experience. See what sparks an idea.'

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
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      <SketchDetailAtmosphere />
      <div className="relative z-10 mx-auto max-w-[75rem] px-5 py-10 sm:px-8 sm:py-12">
        {/* Welcome header */}
        <header className="mb-5 space-y-6">
          <div className="relative overflow-hidden border-b border-border pb-8">
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-2xl space-y-3">
                <p
                  className={cn(
                    'font-display font-bold tracking-tight',
                    'text-[clamp(1.35rem,3.2vw,2rem)] leading-tight',
                    'text-foreground',
                  )}
                >
                  {welcomeName ? (
                    <>
                      Welcome back,{' '}
                      <span className="text-primary">{welcomeName}</span>
                    </>
                  ) : (
                    <>
                      Welcome to the{' '}
                      <span className="text-primary">gallery</span>
                    </>
                  )}
                </p>
                <h1 className="font-display text-[clamp(1.85rem,4vw,2.75rem)] font-bold tracking-tight text-foreground">
                  {pageTitle}
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                  {pageLead}
                </p>
              </div>

              <div className="relative flex flex-wrap items-center gap-2">
                <Link
                  to="/games"
                  className="cursor-pointer rounded-btn border border-border bg-background/55 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40"
                >
                  Games
                </Link>
                <button
                  type="button"
                  onClick={() => setPlayOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border bg-background/55 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40"
                >
                  <Shuffle size={16} aria-hidden />
                  Surprise me
                </button>
                {isAuthenticated ? (
                  <Link
                    to="/account"
                    className="home-btn home-btn-primary !min-h-10 !rounded-btn !px-4 !py-2 !text-sm"
                  >
                    Account
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="home-btn home-btn-primary !min-h-10 !rounded-btn !px-4 !py-2 !text-sm"
                  >
                    Get started
                  </button>
                )}
              </div>
            </div>
            {/* Search */}
            <form
              className="mt-5"
              onSubmit={onSearchSubmit}
              role="search"
            >
              <label className="sr-only" htmlFor="gallery-search">
                Search sketches
              </label>
              <div className="relative max-w-xl">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-foreground/80 font-bold"
                  aria-hidden
                />
                <input
                  id="gallery-search"
                  type="search"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-xl border border-border bg-background/55 py-3 pl-10 pr-10 text-sm text-foreground outline-none backdrop-blur-sm placeholder:text-muted focus:border-primary [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                  autoComplete="off"
                />
                {queryInput ? (
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded-btn p-1.5 text-foreground/80 hover:text-foreground font-bold"
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

        {/* Sort tabs — hidden when drilling into a tag (Django parity) */}
        {!tag ? (
          <SlidingFilterTabs
            className="mb-5"
            tabs={SORT_TABS}
            value={sort}
            onChange={(key) =>
              patchParams({
                sort: key === 'featured' ? null : key,
              })
            }
            reduceMotion={reduceMotion}
            ariaLabel="Gallery sort"
          />
        ) : null}

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
                {query}
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
          <div className="rounded-xl border border-border bg-background/55 px-6 py-16 text-center backdrop-blur-sm">
            <p className="font-display text-lg font-bold text-foreground">
              No sketches match
            </p>
            <p className="mt-2 text-sm text-muted">
              Try Something Else.
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
          <div className="grid gap-2.5 sm:gap-4 md:auto-rows-fr md:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {sketches.map((sketch) => (
              <SketchCardView key={sketch.id} sketch={sketch} />
            ))}
          </div>
        ) : (
          <AnimatedGroup
            className="grid gap-2.5 sm:gap-4 md:auto-rows-fr md:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4"
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
          <p className="mt-12 text-center text-xs text-muted font-bold">
            You’re caught up.
          </p>
        ) : null}
      </div>

      <GalleryPlayMode open={playOpen} onClose={() => setPlayOpen(false)} />
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
