import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { getMakerProfile } from '@/api/sketches'
import { SketchCardView } from '@/components/SketchCardView'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { prefersReducedMotion } from '@/lib/utils'

export function MakerProfilePage() {
  const { username } = useParams()
  const reduceMotion = prefersReducedMotion()
  const query = useQuery({
    queryKey: ['maker', username],
    queryFn: () => getMakerProfile(username!),
    enabled: Boolean(username),
  })

  if (query.isPending) {
    return (
      <p className="mx-auto max-w-[75rem] px-5 py-16 text-center text-sm text-muted sm:px-8">
        Loading maker…
      </p>
    )
  }

  if (query.error instanceof ApiError && query.error.status === 404) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center sm:px-8">
        <h1 className="font-display text-2xl font-semibold">Maker not found</h1>
        <p className="mt-2 text-sm text-muted">
          That username doesn’t have a public profile.
        </p>
        <Link to="/gallery" className="mt-6 inline-block text-primary hover:underline">
          Back to gallery
        </Link>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <p className="mx-auto max-w-[75rem] px-5 py-16 text-center text-sm text-muted sm:px-8">
        Could not load this maker.
      </p>
    )
  }

  const maker = query.data
  const initials = (maker.display_name || maker.username)
    .slice(0, 2)
    .toUpperCase()
  const sketches = maker.sketches

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_20%_0%,rgba(123,97,255,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[75rem] px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-10 flex flex-col gap-5 border-b border-border pb-10 sm:flex-row sm:items-center sm:gap-6">
          <div
            className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-primary/30 bg-surface font-display text-2xl font-semibold text-primary shadow-[0_0_0_6px_rgba(123,97,255,0.08)]"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Maker
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {maker.display_name}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              @{maker.username}
              <span className="mx-2 text-border">·</span>
              {maker.sketch_count} published sketch
              {maker.sketch_count === 1 ? '' : 'es'}
            </p>
          </div>
          <Link
            to={`/gallery?q=${encodeURIComponent('@' + maker.username)}`}
            className="w-fit rounded-btn border border-border bg-surface px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground"
          >
            View in gallery
          </Link>
        </header>

        {sketches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-foreground">
              No published sketches yet
            </p>
            <p className="mt-2 text-sm text-muted">
              Check back when this maker publishes something.
            </p>
            <Link
              to="/gallery"
              className="mt-6 inline-block text-sm text-primary hover:underline"
            >
              Explore the gallery
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Published work
              </p>
              <span className="gallery-count-pill">
                {sketches.length} shown
              </span>
            </div>
            {reduceMotion ? (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {sketches.map((sketch) => (
                  <SketchCardView key={sketch.id} sketch={sketch} />
                ))}
              </div>
            ) : (
              <AnimatedGroup
                className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
                preset="fade"
              >
                {sketches.map((sketch) => (
                  <SketchCardView key={sketch.id} sketch={sketch} />
                ))}
              </AnimatedGroup>
            )}
          </>
        )}
      </div>
    </div>
  )
}
