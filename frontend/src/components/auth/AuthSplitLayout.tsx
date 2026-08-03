import { Code2, Users, Zap } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { ReactNode } from 'react'

type AuthSplitLayoutProps = {
  title: string
  lead?: ReactNode
  children: ReactNode
}

export function AuthSplitLayout({ title, lead, children }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside
        className="relative hidden overflow-hidden bg-[#0a0a0c] text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12"
        aria-label="About sketches101"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 30%, color-mix(in srgb, #7B61FF 35%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, color-mix(in srgb, #7B61FF 18%, transparent), transparent 50%), linear-gradient(160deg, #0a0a0c 0%, #121218 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          }}
        />

        <BrandLogo onDark className="relative z-10 text-lg" />

        <div className="relative z-10 max-w-md space-y-8">
          <h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            Build once.
            <br />
            Share with anyone.
          </h2>
          <ul className="space-y-3 text-sm text-white/75">
            <li className="flex items-center gap-3">
              <Code2 size={18} className="text-primary" aria-hidden />
              Live p5.js &amp; Processing sandbox
            </li>
            <li className="flex items-center gap-3">
              <Users size={18} className="text-primary" aria-hidden />
              Fork, remix, and publish
            </li>
            <li className="flex items-center gap-3">
              <Zap size={18} className="text-primary" aria-hidden />
              Guest play → keep when you sign in
            </li>
          </ul>
        </div>

        <p className="relative z-10 font-mono text-xs uppercase tracking-[0.2em] text-white/45">
          The creative coding playground
        </p>
      </aside>

      <section className="relative flex min-h-dvh flex-col bg-background">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <BrandLogo className="text-base lg:invisible" />
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-12 sm:px-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {lead ? (
            <div className="mt-2 text-sm leading-relaxed text-muted">{lead}</div>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  )
}
