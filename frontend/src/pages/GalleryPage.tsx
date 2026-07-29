import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { SketchCardView } from '@/components/SketchCardView'
import { getSketches } from '@/api/sketches'
import { useFormats, useTags } from '@/hooks/useSketches'
import { cn, prefersReducedMotion } from '@/lib/utils'
import { inputClass, primaryBtnClass, secondaryBtnClass } from '@/lib/form'

type SortKey = 'featured' | 'recent'

function parseSort(value: string | null): SortKey {
  return value === 'recent' ? 'recent' : 'featured'
}

export function GalleryPage() {
  const reduceMotion = prefersReducedMotion()
  const [searchParams, setSearchParams] = useSearchParams()

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

  const visibleTags = (tags ?? []).slice(0, 24)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Gallery
        </h1>
        <p className="text-sm text-muted">
          Explore creative coding sketches from the community.
          {typeof total === 'number' ? ` ${total} published.` : null}
          {activeTagName ? ` Tagged “${activeTagName}”.` : null}
        </p>
      </div>

      <form
        className="mb-6 flex flex-wrap gap-2"
        onSubmit={onSearchSubmit}
        role="search"
      >
        <input
          type="search"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Search title, tag, author, or description…"
          className={`${inputClass} max-w-md flex-1`}
          aria-label="Search sketches"
        />
        <button type="submit" className={secondaryBtnClass}>
          Search
        </button>
        {query ? (
          <button
            type="button"
            className={secondaryBtnClass}
            onClick={() => {
              setQueryInput('')
              patchParams({ q: null })
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-btn border border-border p-0.5">
          {(['featured', 'recent'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                patchParams({ sort: key === 'featured' ? null : key })
              }
              className={cn(
                'rounded-[0.5rem] px-3 py-1.5 text-sm capitalize transition-colors',
                sort === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patchParams({ type: null })}
            className={cn(
              'rounded-btn border px-3 py-1.5 text-sm transition-colors',
              format === 'all'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted hover:text-foreground',
            )}
          >
            All formats
          </button>
          {(formats ?? []).map((fmt) => (
            <button
              key={fmt.slug}
              type="button"
              onClick={() => patchParams({ type: fmt.slug })}
              className={cn(
                'rounded-btn border px-3 py-1.5 text-sm transition-colors',
                format === fmt.slug
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted hover:text-foreground',
              )}
            >
              {fmt.name}
            </button>
          ))}
        </div>
        {isFetching && !isPending ? (
          <span className="text-xs text-muted">Updating…</span>
        ) : null}
      </div>

      {visibleTags.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patchParams({ tag: null })}
            className={cn(
              'rounded-btn border px-3 py-1.5 text-sm transition-colors',
              !tag
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted hover:text-foreground',
            )}
          >
            All tags
          </button>
          {visibleTags.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() =>
                patchParams({ tag: tag === item.slug ? null : item.slug })
              }
              className={cn(
                'rounded-btn border px-3 py-1.5 text-sm transition-colors',
                tag === item.slug
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted hover:text-foreground',
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}

      {isPending && sketches.length === 0 ? (
        <p className="text-sm text-muted">Loading gallery…</p>
      ) : isError && sketches.length === 0 ? (
        <p className="text-sm text-muted">Could not load sketches.</p>
      ) : sketches.length === 0 ? (
        <p className="text-sm text-muted">
          No sketches match these filters.{' '}
          <Link to="/gallery" className="text-primary hover:underline">
            Reset
          </Link>
        </p>
      ) : reduceMotion ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sketches.map((sketch) => (
            <SketchCardView key={sketch.id} sketch={sketch} />
          ))}
        </div>
      ) : (
        <AnimatedGroup
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          preset="fade"
        >
          {sketches.map((sketch) => (
            <SketchCardView key={sketch.id} sketch={sketch} />
          ))}
        </AnimatedGroup>
      )}

      {sketchesQuery.hasNextPage ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            className={primaryBtnClass}
            disabled={sketchesQuery.isFetchingNextPage}
            onClick={() => void sketchesQuery.fetchNextPage()}
          >
            {sketchesQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
