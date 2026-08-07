import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bookmark,
  CalendarDays,
  FlaskConical,
  PencilLine,
  Play,
} from 'lucide-react'
import { ApiError } from '@/api/client'
import { getGameScores, listGames } from '@/api/games'
import { deleteSketch, getAccountSketches } from '@/api/sketches'
import { SketchCardView } from '@/components/SketchCardView'
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
    hint: 'Start a blank canvas',
    icon: PencilLine,
  },
  {
    to: '/sandbox',
    label: 'Sandbox',
    hint: 'Try without publishing',
    icon: FlaskConical,
  },
  {
    to: '/saved',
    label: 'Saved',
    hint: 'Bookmarks you keep',
    icon: Bookmark,
  },
  {
    to: '/explore/today',
    label: 'Today',
    hint: 'Daily featured piece',
    icon: CalendarDays,
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
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">
        Loading account…
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Account
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            @{user.username}
            {user.email ? ` · ${user.email}` : ''}
          </p>
          {sketchesQuery.data ? (
            <p className="mt-3 text-xs text-muted">
              {sketchesQuery.data.published_count} published ·{' '}
              {sketchesQuery.data.draft_count} drafts
              {myScores.length
                ? ` · ${myScores.length} game high score${myScores.length === 1 ? '' : 's'}`
                : ''}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={continueHref} className={primaryBtnClass}>
            {continueLabel}
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className={secondaryBtnClass}
          >
            Log out
          </button>
        </div>
      </div>

      <section className="mb-12" aria-label="Workspace">
        <h2 className="font-display text-lg font-semibold">Workspace</h2>
        <p className="mt-1 text-sm text-muted">
          Create, save, and daily picks live here — not in the main nav.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HUB_LINKS.map(({ to, label, hint, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  'flex h-full flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-4',
                  'transition-colors hover:border-primary/40 hover:bg-primary/5',
                )}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon size={16} className="text-primary" aria-hidden />
                  {label}
                </span>
                <span className="text-xs text-muted">{hint}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to="/gallery" className="text-primary hover:underline">
            Browse sketches
          </Link>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <Link to="/games" className="text-primary hover:underline">
            Play games
          </Link>
        </div>
      </section>

      {myScores.length > 0 ? (
        <section className="mb-12">
          <h2 className="font-display text-lg font-semibold">High scores</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myScores.map((row) => {
              const playSlug =
                myGames.find(
                  (s) =>
                    (s.scoreboard_slug || s.slug) === row.game.slug ||
                    s.slug === row.game.slug,
                )?.slug ?? row.game.slug
              return (
              <li
                key={row.game.slug}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {row.game.title}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {row.score.toLocaleString()}
                </p>
                <Link
                  to={`/games/${playSlug}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Play size={12} aria-hidden />
                  Play again
                </Link>
              </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <section className="mb-12 rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <h2 className="font-display text-lg font-semibold">High scores</h2>
          <p className="mt-2 text-sm text-muted">
            No scores yet — play a game and your bests show up here.
          </p>
          <Link to="/games" className={`${primaryBtnClass} mt-4`}>
            Browse games
          </Link>
        </section>
      )}

      <OwnedSection
        title="Your sketches"
        emptyLabel="No sketches yet."
        createLabel="Create your first sketch"
        items={mySketches}
        pending={sketchesQuery.isPending}
        browseTo="/gallery"
        browseLabel="Browse gallery"
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
        className="mt-12"
        deletingSlug={deletingSlug}
        onDelete={handleDelete}
      />
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
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <Link to={browseTo} className="text-sm text-primary hover:underline">
          {browseLabel}
        </Link>
      </div>

      {pending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted">{emptyLabel}</p>
          <Link to="/sketches/new" className={`${primaryBtnClass} mt-4`}>
            {createLabel}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((sketch) => (
            <div key={sketch.id} className="space-y-2">
              <SketchCardView sketch={sketch} showStatus />
              <div className="flex flex-wrap gap-2 px-1 text-xs">
                <Link
                  to={
                    sketch.is_game
                      ? `/games/${sketch.slug}`
                      : `/sketches/${sketch.slug}`
                  }
                  className="text-muted hover:text-primary"
                >
                  {sketch.is_game ? 'Play' : 'View'}
                </Link>
                <Link
                  to={`/sketches/${sketch.slug}/edit`}
                  className="text-muted hover:text-primary"
                >
                  Edit
                </Link>
                <Link
                  to={`/sketches/${sketch.slug}/settings`}
                  className="text-muted hover:text-primary"
                >
                  Settings
                </Link>
                {sketch.status !== 'published' ? (
                  <Link
                    to={`/sketches/${sketch.slug}/settings`}
                    className="text-primary hover:underline"
                  >
                    Publish
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={deletingSlug === sketch.slug}
                  onClick={() => onDelete(sketch)}
                  className="text-destructive hover:underline disabled:opacity-60"
                >
                  {deletingSlug === sketch.slug ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
