import { HomeParticles } from '@/components/home/HomeParticles'

/**
 * Landing hero atmosphere: same interactive particle sketch on every
 * viewport and theme (palette adapts inside HomeParticles).
 */
export function LandingHeroBackground() {
  return (
    <div className="landing-hero-bg" aria-hidden>
      <HomeParticles />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/25 via-background/10 to-background" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
