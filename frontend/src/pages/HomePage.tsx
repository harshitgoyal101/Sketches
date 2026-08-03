import { Link, useNavigate } from 'react-router-dom'
import { TextEffect } from '@/components/motion-primitives/text-effect'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { ChallengeStrip } from '@/components/ChallengeStrip'
import { LandingHeroBackground } from '@/components/home/LandingHeroBackground'
import { SketchCardView } from '@/components/SketchCardView'
import { useAuth } from '@/auth/AuthProvider'
import { useGuest } from '@/guest/GuestProvider'
import { useContinueSketch } from '@/hooks/useContinueSketch'
import { useHome } from '@/hooks/useSketches'
import type { SketchCard } from '@/types/sketch'
import { cn, prefersReducedMotion } from '@/lib/utils'

function FeaturedGrid({
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
  const { isAuthenticated } = useAuth()
  const { requireAuth } = useGuest()
  const { continueSketch } = useContinueSketch()
  const navigate = useNavigate()
  const featured = (data?.featured ?? []).slice(0, 3)
  const stats = data?.stats

  function onStartCreating() {
    if (isAuthenticated) {
      navigate('/sketches/new')
      return
    }
    if (requireAuth({ type: 'create' })) {
      navigate('/sketches/new')
    }
  }

  const continueHref = continueSketch
    ? `/sketches/${continueSketch.slug}/edit`
    : '/sketches/new'
  const continueLabel = continueSketch ? 'Continue' : 'Start a sketch'

  return (
    <div className="relative bg-background">
      {/* —— Hero —— */}
      <section className="relative isolate min-h-[min(100dvh,56rem)] overflow-hidden">
        <LandingHeroBackground />

        <div className="relative z-10 mx-auto flex min-h-[min(100dvh,56rem)] w-full max-w-[75rem] flex-col items-center justify-center px-5 pb-24 pt-20 text-center sm:px-8">
          <p className="home-eyebrow mb-5">
            Creative coding · live sandbox
          </p>

          <h1 className="font-display text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
            Sketches <span className="text-primary">101</span>
          </h1>

          {isAuthenticated ? (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Pick up where you left off, or open something you viewed recently.
            </p>
          ) : reduceMotion ? (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              The creative coding playground for artists and developers. Build,
              run, and share.
            </p>
          ) : (
            <TextEffect
              as="p"
              per="word"
              preset="fade"
              delay={0.15}
              className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
            >
              The creative coding playground for artists and developers. Build, run, and share.
            </TextEffect>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={continueHref} className="home-btn home-btn-primary">
                  {continueLabel}
                </Link>
                <Link to="/explore/today" className="home-btn home-btn-ghost">
                  Today
                </Link>
                <Link to="/gallery" className="home-btn home-btn-ghost">
                  Browse gallery
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStartCreating}
                  className="home-btn home-btn-primary"
                >
                  Start creating
                </button>
                <Link to="/sandbox" className="home-btn home-btn-ghost">
                  Try sandbox
                </Link>
                <Link to="/explore/today" className="home-btn home-btn-ghost">
                  Today
                </Link>
                <Link to="/gallery" className="home-btn home-btn-ghost">
                  Browse gallery
                </Link>
              </>
            )}
          </div>
        </div>

      </section>

      {/* —— Stats (second fold) —— */}
      <section
        className="relative z-10 border-y border-border bg-surface"
        aria-label="Platform stats"
      >
        <div
          className={cn(
            'mx-auto grid max-w-[75rem] gap-8 px-5 py-12 sm:px-8',
            'grid-cols-2 md:grid-cols-4',
          )}
        >
          <Stat
            value={stats ? `${stats.sketch_count}+` : '—'}
            label="Sketches created"
          />
          <Stat
            value={stats ? `${stats.artist_count}+` : '—'}
            label="Generative artists"
          />
          <Stat
            value={stats ? String(stats.format_count) : '—'}
            label="Languages & frameworks"
          />
          <Stat value="60FPS" label="Optimized performance" />
        </div>
      </section>

      {/* —— Weekly challenge (one job) —— */}
      <section className="relative z-10 bg-background" aria-label="Weekly challenge">
        <div className="mx-auto max-w-[75rem] px-5 py-10 sm:px-8 sm:py-12">
          <ChallengeStrip />
        </div>
      </section>

      {/* —— Featured —— */}
      <section className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Curated gallery
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Featured sketches
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Interactive generative pieces from the Sketches101 community —
              open any one to fork, edit, or run.
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
              <FeaturedGrid sketches={featured} reduceMotion={reduceMotion} />
            )}
          </div>

          <div className="mt-12 flex justify-center">
            <Link to="/gallery" className="home-btn home-btn-ghost home-btn-quiet">
              Explore the full gallery
            </Link>
          </div>
        </div>
      </section>

      {/* —— Closing CTA —— */}
      <section className="relative z-10 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-[75rem] flex-col items-center gap-6 px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Ready to sketch?
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted sm:text-base">
            Spin up a p5.js or Processing canvas in the browser and publish when
            you’re proud of it.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onStartCreating}
              className="home-btn home-btn-primary"
            >
              {isAuthenticated ? 'New sketch' : 'Start creating'}
            </button>
            <Link to="/gallery" className="home-btn home-btn-ghost home-btn-quiet">
              Browse gallery
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {value}
      </p>
      <p className="mt-1.5 text-xs uppercase tracking-wide text-muted sm:text-sm sm:normal-case sm:tracking-normal">
        {label}
      </p>
    </div>
  )
}
