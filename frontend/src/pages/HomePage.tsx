import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { TextEffect } from '@/components/motion-primitives/text-effect'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { LandingHeroBackground } from '@/components/home/LandingHeroBackground'
import { SketchCardView } from '@/components/SketchCardView'
import { getSketches } from '@/api/sketches'
import { useHome } from '@/hooks/useSketches'
import type { SketchCard } from '@/types/sketch'
import { prefersReducedMotion } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const CONTACT = {
  youtube: 'https://www.youtube.com/@sketches101',
  instagram: 'https://www.instagram.com/sketches101/',
  email: 'mailto:hello@sketches101.com',
} as const

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.75 15.5v-7l6.5 3.5-6.5 3.5Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

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

  useDocumentTitle(
    'Sketches101 — Sketches & Games',
    'Explore the worlds. Discover new stories and Play your way in.',
  )

  const featured = (data?.featured ?? []).slice(0, 3)
  const games = (gamesQuery.data?.results ?? []).slice(0, 3)
  const gamesTotal = gamesQuery.data?.total ?? 0
  const showGamesSection = gamesQuery.isPending || gamesTotal >= 1

  return (
    <div className="relative bg-background">
      <section className="relative isolate min-h-[min(100dvh,56rem)] overflow-hidden">
        <LandingHeroBackground />

        <div className="relative z-10 mx-auto flex min-h-[min(100dvh,56rem)] w-full max-w-[75rem] flex-col items-center justify-center px-5 pb-24 pt-20 text-center sm:px-8">
          <p className="home-eyebrow mb-5">Create, Explore & Play</p>

          <h1 className="font-display text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
            Sketches <span className="text-primary">101</span>
          </h1>

          {reduceMotion ? (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Explore the worlds. Discover new stories and Play your way in.
            </p>
          ) : (
            <TextEffect
              as="p"
              per="word"
              preset="fade"
              delay={0.15}
              className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
            >
              Explore the worlds. Discover new stories and Play your way in.
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
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary font-bold">
              Gallery
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Featured sketches
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Explore &middot; Share &middot; Personalize
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

      {showGamesSection ? (
      <section className="relative z-10 border-t border-border bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary font-bold">
              Games
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Featured games
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Play &middot; Compete &middot; Win 
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
      ) : null}

      <section className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto flex max-w-[75rem] flex-col items-center gap-6 px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Stay in touch
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted sm:text-base">
            Follow &middot; Subscribe &middot; Contact
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={CONTACT.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="home-btn home-btn-primary gap-2"
            >
              <YoutubeIcon className="size-4 shrink-0" />
              YouTube
            </a>
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="home-btn home-btn-ghost gap-2"
            >
              <InstagramIcon className="size-4 shrink-0" />
              Instagram
            </a>
            <a href={CONTACT.email} className="home-btn home-btn-ghost gap-2">
              <Mail className="size-4 shrink-0" aria-hidden />
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
