import { Link } from 'react-router-dom'
import { TextEffect } from '@/components/motion-primitives/text-effect'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { LandingHeroBackground } from '@/components/home/LandingHeroBackground'
import { SketchCardView } from '@/components/SketchCardView'
import { useAuth } from '@/auth/AuthProvider'
import { useHome } from '@/hooks/useSketches'
import type { SketchCard } from '@/types/sketch'
import { prefersReducedMotion } from '@/lib/utils'

function FeaturedGrid({
  sketches,
  reduceMotion,
}: {
  sketches: SketchCard[]
  reduceMotion: boolean
}) {
  if (reduceMotion) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sketches.map((sketch) => (
          <SketchCardView key={sketch.id} sketch={sketch} />
        ))}
      </div>
    )
  }
  return (
    <AnimatedGroup
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      preset="blur"
    >
      {sketches.map((sketch) => (
        <SketchCardView key={sketch.id} sketch={sketch} />
      ))}
    </AnimatedGroup>
  )
}

export function HomePage() {
  const reduceMotion = prefersReducedMotion()
  const { data, isPending } = useHome()
  const { user, isAuthenticated } = useAuth()
  const featured = (data?.featured ?? []).slice(0, 3)
  const background = data?.background

  return (
    <div className="relative">
      <section className="relative isolate min-h-[min(100dvh,56rem)] overflow-hidden">
        <LandingHeroBackground
          dark={background?.dark ?? null}
          light={background?.light ?? null}
        />

        <div className="relative z-10 mx-auto flex min-h-[min(100dvh,56rem)] max-w-6xl flex-col justify-center px-4 pb-20 pt-10 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            {reduceMotion ? (
              <h1 className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
                Sketches<span className="text-primary">101</span>
              </h1>
            ) : (
              <TextEffect
                as="h1"
                per="char"
                preset="fade-in-blur"
                className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl"
              >
                Sketches101
              </TextEffect>
            )}
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Creative coding in public — browse p5.js and Processing sketches,
              remix ideas, and publish your own.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={isAuthenticated ? '/sketches/new' : '/signup'}
                className="inline-flex items-center justify-center rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-primary-hover"
              >
                {isAuthenticated ? 'Start creating' : 'Get started'}
              </Link>
              <Link
                to="/gallery"
                className="inline-flex items-center justify-center rounded-btn border border-border/80 bg-background/40 px-5 py-2.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:border-primary/40"
              >
                Browse gallery
              </Link>
            </div>
            {user ? (
              <p className="mt-4 text-xs text-muted">Signed in as {user.username}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          {data?.stats ? (
            <p className="mb-10 text-center text-sm text-muted">
              {data.stats.sketch_count} sketches · {data.stats.artist_count}{' '}
              artists · {data.stats.format_count} formats
            </p>
          ) : null}

          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Featured
            </h2>
            <Link to="/gallery" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {isPending && featured.length === 0 ? (
            <p className="text-sm text-muted">Loading sketches…</p>
          ) : (
            <FeaturedGrid sketches={featured} reduceMotion={reduceMotion} />
          )}
        </div>
      </section>
    </div>
  )
}
