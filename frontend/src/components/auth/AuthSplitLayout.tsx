import { Code2, Users, Zap } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { ReactNode } from 'react'

type AuthSplitLayoutProps = {
  title: string
  lead?: ReactNode
  children: ReactNode
}

const brandAtmosphere = {
  background:
    'radial-gradient(ellipse 80% 60% at 20% 30%, color-mix(in srgb, #7B61FF 35%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, color-mix(in srgb, #7B61FF 18%, transparent), transparent 50%), linear-gradient(160deg, #0a0a0c 0%, #121218 100%)',
} as const

const brandGrid = {
  backgroundImage:
    'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
} as const

const highlights = [
  { icon: Code2, label: 'Live sandbox' },
  { icon: Users, label: 'Share work' },
  { icon: Zap, label: 'Compete' },
] as const

export function AuthSplitLayout({ title, lead, children }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-none">
      {/* Mobile brand band — height follows content only */}
      <header
        className="relative self-start overflow-hidden bg-[#0a0a0c] text-white lg:hidden"
        aria-label="About sketches101"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden style={brandAtmosphere} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          aria-hidden
          style={brandGrid}
        />

        <div className="relative z-10 px-5 pb-7 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <BrandLogo onDark className="text-base" />
            <ThemeToggle overHero />
          </div>

          <div className="mt-8 max-w-sm">
            <h2 className="font-display text-[1.85rem] font-bold leading-[1.1] tracking-tight">
              Join Us
            </h2>
            <p className="mt-1 font-display text-base font-bold leading-snug text-white/80">
              Explore, Play, Create and Share.
            </p>
          </div>

          <ul className="mt-6 flex flex-wrap gap-2">
            {highlights.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-btn border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 backdrop-blur-sm"
              >
                <Icon size={14} className="text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Desktop brand panel */}
      <aside
        className="relative hidden overflow-hidden bg-[#0a0a0c] text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12"
        aria-label="About sketches101"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden style={brandAtmosphere} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={brandGrid}
        />

        <BrandLogo onDark className="relative z-10 text-lg" />

        <div className="relative z-10 max-w-md space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
              Join Us
            </h2>
            <h4 className="mt-1 font-display text-xl font-bold leading-[1.1] tracking-tight">
              Explore, Play, Create and Share.
            </h4>
          </div>

          <ul className="space-y-3 text-sm text-white/75">
            <li className="flex items-center gap-3">
              <Code2 size={18} className="text-primary" aria-hidden />
              Try our Live sandbox
            </li>
            <li className="flex items-center gap-3">
              <Users size={18} className="text-primary" aria-hidden />
              Share your creativity
            </li>
            <li className="flex items-center gap-3">
              <Zap size={18} className="text-primary" aria-hidden />
              Play, Compete and Win against friends
            </li>
          </ul>
        </div>

        <p className="relative z-10 font-mono text-xs uppercase tracking-[0.2em] text-white/45">
          The creative playground for everyone
        </p>
      </aside>

      {/* Form column */}
      <section className="relative flex min-h-0 flex-1 flex-col bg-background lg:min-h-dvh">
        <div className="hidden items-center justify-end gap-3 px-4 py-4 sm:px-8 lg:flex">
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-7 sm:px-6 lg:justify-center lg:pt-0">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary lg:hidden">
            Account
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:mt-0">
            {title}
          </h1>
          {lead ? (
            <div className="mt-2 text-sm leading-relaxed text-muted">{lead}</div>
          ) : null}
          <div className="mt-7 sm:mt-8">{children}</div>
        </div>
      </section>
    </div>
  )
}
