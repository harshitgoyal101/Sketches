import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TextEffect } from '@/components/motion-primitives/text-effect'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { LandingHeroBackground } from '@/components/home/LandingHeroBackground'
import { SketchCardView } from '@/components/SketchCardView'
import { getSketches } from '@/api/sketches'
import { useHome } from '@/hooks/useSketches'
import type { SketchCard } from '@/types/sketch'
import { prefersReducedMotion } from '@/lib/utils'

function CardGrid({
  sketches,
  reduceMotion,
}: {
  sketches: SketchCard[]
  reduceMotion: boolean
}) {
  if (reduceMotion) {
    return (
      <div className="grid gap-2.5 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {sketches.map((sketch) => (
          <SketchCardView key={sketch.id} sketch={sketch} />
        ))}
      </div>
    )
  }
  return (
    <AnimatedGroup
      className="grid gap-2.5 md:grid-cols-2 md:gap-5 lg:grid-cols-3"
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
  const gamesQuery = useQuery({
    queryKey: ['home-games'],
    queryFn: () => getSketches({ games: true, sort: 'featured', page: 1 }),
  })

  const featured = (data?.featured ?? []).slice(0, 3)
  const games = (gamesQuery.data?.results ?? []).slice(0, 3)

  return (
    <div className="relative bg-background">
      <section className="relative isolate min-h-[min(100dvh,56rem)] overflow-hidden">
        <LandingHeroBackground />

        <div className="relative z-10 mx-auto flex min-h-[min(100dvh,56rem)] w-full max-w-[75rem] flex-col items-center justify-center px-5 pb-24 pt-20 text-center sm:px-8">
          <p className="home-eyebrow mb-5">Sketches · Games</p>

          <h1 className="font-display text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
            Sketches <span className="text-primary">101</span>
          </h1>

          {reduceMotion ? (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Generative art to explore, and games to play — all in the browser.
            </p>
          ) : (
            <TextEffect
              as="p"
              per="word"
              preset="fade"
              delay={0.15}
              className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
            >
              Generative art to explore, and games to play — all in the browser.
            </TextEffect>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/gallery" className="home-btn home-btn-primary">
              Sketches
            </Link>
            <Link to="/games" className="home-btn home-btn-ghost">
              Games
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Gallery
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Featured sketches
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Open any piece to run it live — fork and edit from your account.
            </p>
          </div>

          <div className="mt-10">
            {isPending && featured.length === 0 ? (
              <p className="text-center text-sm text-muted">Loading sketches…</p>
            ) : featured.length === 0 ? (
              <p className="text-center text-sm text-muted">
                Published sketches will appear here.
              </p>
            ) : (
              <CardGrid sketches={featured} reduceMotion={reduceMotion} />
            )}
          </div>

          <div className="mt-12 flex justify-center">
            <Link to="/gallery" className="home-btn home-btn-ghost home-btn-quiet">
              Browse all sketches
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Play
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Featured games
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Play-only experiences — hit Play and go fullscreen.
            </p>
          </div>

          <div className="mt-10">
            {gamesQuery.isPending && games.length === 0 ? (
              <p className="text-center text-sm text-muted">Loading games…</p>
            ) : games.length === 0 ? (
              <p className="text-center text-sm text-muted">
                Games will appear here when authors list them.
              </p>
            ) : (
              <CardGrid sketches={games} reduceMotion={reduceMotion} />
            )}
          </div>

          <div className="mt-12 flex justify-center">
            <Link to="/games" className="home-btn home-btn-ghost home-btn-quiet">
              Browse all games
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto flex max-w-[75rem] flex-col items-center gap-6 px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            What do you want to do?
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted sm:text-base">
            Explore generative sketches, or jump into a game. Creating and
            saving live in your account.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/gallery" className="home-btn home-btn-primary">
              Sketches
            </Link>
            <Link to="/games" className="home-btn home-btn-ghost">
              Games
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
