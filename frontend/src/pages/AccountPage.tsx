import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  Eye,
  FlaskConical,
  Gamepad2,
  Heart,
  LogOut,
  Mail,
  PencilLine,
  Play,
  Settings2,
  Trash2,
  Trophy,
  Upload,
} from 'lucide-react'
import { ApiError } from '@/api/client'
import { getGameScores, listGames } from '@/api/games'
import { deleteSketch, getAccountSketches } from '@/api/sketches'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { useAuth } from '@/auth/AuthProvider'
import { useContinueSketch } from '@/hooks/useContinueSketch'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'
import { cn } from '@/lib/utils'
import type { SketchCard } from '@/types/sketch'

const HUB_LINKS = [
  {
    to: '/sketches/new',
    label: 'New sketch',
    hint: 'Blank canvas in the editor',
    icon: PencilLine,
  },
  {
    to: '/sandbox',
    label: 'Sandbox',
    hint: 'Try ideas without saving',
    icon: FlaskConical,
  },
  {
    to: '/favourites',
    label: 'Favourites',
    hint: 'Sketches you hearted',
    icon: Heart,
  },
  {
    to: '/explore/today',
    label: 'Today',
    hint: 'Daily featured piece',
    icon: CalendarDays,
  },
  {
    to: '/contact',
    label: 'Contact',
    hint: 'Message the team',
    icon: Mail,
  },
] as const

export function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { continueSketch } = useContinueSketch()
  const queryClient = useQueryClient()
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const sketchesQuery = useQuery({
    queryKey: ['account-sketches'],
    queryFn: getAccountSketches,
    enabled: isAuthenticated,
  })
  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: listGames,
    enabled: isAuthenticated,
  })
  const scoreQueries = useQueries({
    queries: (gamesQuery.data ?? []).map((game) => ({
      queryKey: ['game-scores', game.slug, 'me'],
      queryFn: () => getGameScores(game.slug),
      enabled: isAuthenticated && Boolean(game.slug),
    })),
  })

  const displayName = user?.display_name || user?.username || 'Account'
  useDocumentTitle(
    `${displayName} · Account · Sketches101`,
    'Your sketches, games, workspace, and high scores.',
  )

  async function handleDelete(sketch: SketchCard) {
    const kind = sketch.is_game ? 'game' : 'sketch'
    const confirmed = window.confirm(
      `Delete “${sketch.title}” permanently? This ${kind} cannot be recovered.`,
    )
    if (!confirmed) return
    setDeletingSlug(sketch.slug)
    try {
      await deleteSketch(sketch.slug)
      await queryClient.invalidateQueries({ queryKey: ['account-sketches'] })
      await queryClient.invalidateQueries({ queryKey: ['sketches'] })
      await queryClient.invalidateQueries({ queryKey: ['games'] })
    } catch (err) {
      window.alert(
        err instanceof ApiError ? err.message : 'Could not delete.',
      )
    } finally {
      setDeletingSlug(null)
    }
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isLoading || !user) {
    return (
      <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
        <SketchDetailAtmosphere />
        <p className="relative z-10 px-6 py-16 text-center text-sm text-muted">
          Loading account…
        </p>
      </div>
    )
  }

  const all = sketchesQuery.data?.results ?? []
  const mySketches = all.filter((s) => !s.is_game)
  const myGames = all.filter((s) => s.is_game)
  const myScores = (gamesQuery.data ?? [])
    .map((game, index) => {
      const me = scoreQueries[index]?.data?.me
      if (!me) return null
      return { game, score: me.score, played_at: me.played_at }
    })
    .filter(Boolean) as {
    game: { slug: string; title: string }
    score: number
    played_at: string
  }[]

  const continueHref = continueSketch
    ? `/sketches/${continueSketch.slug}/edit`
    : '/sketches/new'
  const continueLabel = continueSketch ? 'Continue sketch' : 'Start a sketch'
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const publishedCount = sketchesQuery.data?.published_count ?? 0
  const draftCount = sketchesQuery.data?.draft_count ?? 0

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      <SketchDetailAtmosphere />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/*
          Mobile order: Account → Workspace → High scores → sketches/games
          Desktop: main column (left) | Account sticky (right) — no row-span stretch
        */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_18.5rem] xl:gap-10">
          {/* Account info */}
          <aside className="order-1 rounded-2xl border border-border bg-surface/70 p-4 sm:p-5 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 font-mono text-sm font-bold text-primary ring-1 ring-primary/25 lg:h-14 lg:w-14"
                aria-hidden
              >
                {initials || '?'}
              </div>
              <div className="min-w-0 flex-1 lg:w-full">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  Account
                </p>
                <h1 className="mt-0.5 truncate font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[1.65rem]">
                  {displayName}
                </h1>
                <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">
                  @{user.username}
                </p>
                {user.email ? (
                  <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
                ) : null}
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
              <div className="text-center lg:text-left">
                <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  Published
                </dt>
                <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-foreground">
                  {publishedCount}
                </dd>
              </div>
              <div className="text-center lg:text-left">
                <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  Drafts
                </dt>
                <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-foreground">
                  {draftCount}
                </dd>
              </div>
              <div className="text-center lg:text-left">
                <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  Scores
                </dt>
                <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-foreground">
                  {myScores.length}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                to={continueHref}
                className={cn(primaryBtnClass, 'w-full justify-center gap-2')}
              >
                {continueLabel}
                <ArrowRight size={16} aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className={cn(secondaryBtnClass, 'w-full justify-center gap-2')}
              >
                <LogOut size={16} aria-hidden />
                Log out
              </button>
            </div>
          </aside>

          <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-none lg:col-start-1 lg:row-start-1 lg:gap-8">
            {/* Workspace */}
            <section aria-label="Workspace" className="min-w-0">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Workspace
                </h2>
                <div className="hidden gap-3 text-xs sm:flex sm:text-sm">
                  <Link to="/gallery" className="text-primary hover:underline">
                    Gallery
                  </Link>
                  <Link to="/games" className="text-primary hover:underline">
                    Games
                  </Link>
                </div>
              </div>

              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {HUB_LINKS.map(({ to, label, hint, icon: Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className={cn(
                        'flex h-full items-center gap-2.5 rounded-xl border border-border bg-surface/70 px-3 py-3',
                        'transition-colors hover:border-primary/40 hover:bg-surface',
                      )}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/60 text-primary">
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">
                          {label}
                        </span>
                        <span className="mt-0.5 hidden truncate text-xs text-muted sm:block">
                          {hint}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* High scores */}
            <section
              aria-labelledby="high-scores-heading"
              className="min-w-0"
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2
                  id="high-scores-heading"
                  className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl"
                >
                  High scores
                </h2>
                <Link
                  to="/games"
                  className="text-xs text-primary hover:underline sm:text-sm"
                >
                  All games
                </Link>
              </div>

              {myScores.length > 0 ? (
                <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-surface/70 sm:max-h-[32rem]">
                  {myScores.map((row) => {
                    const playSlug =
                      myGames.find(
                        (s) =>
                          (s.scoreboard_slug || s.slug) === row.game.slug ||
                          s.slug === row.game.slug,
                      )?.slug ?? row.game.slug
                    return (
                      <li key={row.game.slug}>
                        <Link
                          to={`/games/${playSlug}`}
                          className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-primary/5 sm:px-4"
                        >
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/60 text-primary">
                            <Gamepad2 size={16} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-foreground">
                              {row.game.title}
                            </span>
                            <span className="mt-0.5 text-xs text-muted group-hover:text-primary">
                              Play again
                            </span>
                          </span>
                          <span className="shrink-0 font-display text-lg font-bold tabular-nums text-foreground sm:text-xl">
                            {row.score.toLocaleString()}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-8 text-center sm:px-6">
                  <Trophy
                    size={20}
                    className="mx-auto text-primary"
                    aria-hidden
                  />
                  <p className="mt-3 text-sm text-muted">
                    No scores yet — play a game and your bests show up here.
                  </p>
                  <Link to="/games" className={cn(primaryBtnClass, 'mt-4')}>
                    Browse games
                  </Link>
                </div>
              )}
            </section>
          </div>

          <OwnedSection
            title="Your sketches"
            emptyLabel="No sketches yet — start one and it will land here."
            createLabel="Create your first sketch"
            items={mySketches}
            pending={sketchesQuery.isPending}
            browseTo="/gallery"
            browseLabel="Browse gallery"
            className="order-3 mt-0 lg:col-start-1 xl:col-span-2"
            deletingSlug={deletingSlug}
            onDelete={handleDelete}
          />

          <OwnedSection
            title="Your games"
            emptyLabel="No games yet. Mark a published sketch as a game in Settings."
            createLabel="New sketch"
            items={myGames}
            pending={sketchesQuery.isPending}
            browseTo="/games"
            browseLabel="Browse games"
            className="order-4 mt-0 lg:col-start-1 xl:col-span-2"
            deletingSlug={deletingSlug}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}

function OwnedSection({
  title,
  emptyLabel,
  createLabel,
  items,
  pending,
  browseTo,
  browseLabel,
  className,
  deletingSlug,
  onDelete,
}: {
  title: string
  emptyLabel: string
  createLabel: string
  items: SketchCard[]
  pending: boolean
  browseTo: string
  browseLabel: string
  className?: string
  deletingSlug: string | null
  onDelete: (sketch: SketchCard) => void
}) {
  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 sm:mb-5 sm:pb-4">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {title}
          </h2>
          {!pending ? (
            <p className="mt-1 text-sm text-muted">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/sketches/new" className={cn(secondaryBtnClass, 'gap-2')}>
            <PencilLine size={14} aria-hidden />
            New
          </Link>
          <Link to={browseTo} className="text-sm text-primary hover:underline">
            {browseLabel}
          </Link>
        </div>
      </div>

      {pending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-8 text-center sm:px-6 sm:py-10">
          <p className="text-sm text-muted">{emptyLabel}</p>
          <Link to="/sketches/new" className={cn(primaryBtnClass, 'mt-4 sm:mt-5')}>
            {createLabel}
          </Link>
        </div>
      ) : (
        <ul className="grid list-none gap-3 sm:gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((sketch) => (
            <li key={sketch.id} className="min-w-0">
              <OwnedSketchCard
                sketch={sketch}
                deleting={deletingSlug === sketch.slug}
                onDelete={() => onDelete(sketch)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const ownedIconBtnClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

function OwnedSketchCard({
  sketch,
  deleting,
  onDelete,
}: {
  sketch: SketchCard
  deleting: boolean
  onDelete: () => void
}) {
  const viewTo = sketch.is_game
    ? `/games/${sketch.slug}`
    : `/sketches/${sketch.slug}`
  const editTo = `/sketches/${sketch.slug}/edit`
  const settingsTo = `/sketches/${sketch.slug}/settings`
  const unpublished = sketch.status !== 'published'
  const appIcon = sketch.app_icon || sketch.thumbnail_card_url || sketch.thumbnail || ''
  const thumb = sketch.thumbnail_card_url || sketch.thumbnail || ''
  const initial = (sketch.title.trim().charAt(0) || '?').toUpperCase()
  const statusLabel = sketch.status.replace(/_/g, ' ')
  const viewLabel = sketch.is_game ? 'Play' : 'View'

  const statusBadgeClass = cn(
    'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide',
    unpublished
      ? 'bg-background/80 text-muted ring-1 ring-border'
      : 'bg-primary/15 text-primary ring-1 ring-primary/30',
  )

  function ActionBar() {
    return (
      <div className="flex items-center gap-1 border-t border-border bg-background/25 px-2 py-1.5">
        <Link
          to={viewTo}
          className={ownedIconBtnClass}
          aria-label={viewLabel}
          title={viewLabel}
        >
          {sketch.is_game ? (
            <Play size={16} aria-hidden />
          ) : (
            <Eye size={16} aria-hidden />
          )}
        </Link>
        <Link
          to={editTo}
          className={ownedIconBtnClass}
          aria-label="Edit"
          title="Edit"
        >
          <PencilLine size={16} aria-hidden />
        </Link>
        <Link
          to={settingsTo}
          className={ownedIconBtnClass}
          aria-label="Settings"
          title="Settings"
        >
          <Settings2 size={16} aria-hidden />
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {unpublished ? (
            <Link
              to={settingsTo}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/12 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Upload size={14} aria-hidden />
              Publish
            </Link>
          ) : null}
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className={cn(
              ownedIconBtnClass,
              'text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-60',
            )}
            aria-label={deleting ? 'Deleting' : 'Delete'}
            title={deleting ? 'Deleting…' : 'Delete'}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/70 transition-colors hover:border-primary/35">
      {/* <1280: compact list card */}
      <div className="xl:hidden">
        <Link
          to={viewTo}
          className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-primary/5"
        >
          <div className="sketch-app-icon shrink-0" aria-hidden>
            {appIcon ? (
              <img src={appIcon} alt="" loading="lazy" decoding="async" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-sm font-bold leading-snug text-foreground">
                {sketch.title}
              </h3>
              <span className={statusBadgeClass}>{statusLabel}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {sketch.sketch_type_label}
              {sketch.is_game ? ' · Game' : ''}
            </p>
          </div>
        </Link>
        <ActionBar />
      </div>

      {/* ≥1280 (xl): thumbnail card */}
      <div className="hidden h-full min-h-0 flex-col xl:flex">
        <Link
          to={viewTo}
          className="group/media relative block aspect-[16/10] overflow-hidden border-b border-border bg-background/40"
        >
          {thumb ? (
            <img
              src={thumb}
              srcSet={sketch.thumbnail_srcset || undefined}
              sizes="(max-width: 1536px) 33vw, 25vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover/media:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(123,97,255,0.25),transparent_55%)] px-3 text-center">
              <span className="line-clamp-2 font-display text-sm font-semibold text-primary">
                {sketch.title}
              </span>
            </div>
          )}
          <span className={cn('absolute left-2.5 top-2.5', statusBadgeClass)}>
            {statusLabel}
          </span>
        </Link>

        <Link
          to={viewTo}
          className="block min-w-0 px-3.5 py-3 transition-colors hover:bg-primary/5"
        >
          <h3 className="truncate font-display text-sm font-bold leading-snug text-foreground">
            {sketch.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted">
            {sketch.sketch_type_label}
            {sketch.is_game ? ' · Game' : ''}
          </p>
        </Link>

        <div className="mt-auto">
          <ActionBar />
        </div>
      </div>
    </article>
  )
}
