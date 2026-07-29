import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAccountSketches } from '@/api/sketches'
import { SketchCardView } from '@/components/SketchCardView'
import { useAuth } from '@/auth/AuthProvider'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'

export function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const sketchesQuery = useQuery({
    queryKey: ['account-sketches'],
    queryFn: getAccountSketches,
    enabled: isAuthenticated,
  })

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

  const sketches = sketchesQuery.data?.results ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {user.username}
          </h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          {sketchesQuery.data ? (
            <p className="mt-2 text-xs text-muted">
              {sketchesQuery.data.published_count} published ·{' '}
              {sketchesQuery.data.draft_count} drafts
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/sketches/new" className={primaryBtnClass}>
            New sketch
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

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">Your sketches</h2>
        <Link to="/gallery" className="text-sm text-primary hover:underline">
          Browse gallery
        </Link>
      </div>

      {sketchesQuery.isPending ? (
        <p className="text-sm text-muted">Loading sketches…</p>
      ) : sketches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted">No sketches yet.</p>
          <Link to="/sketches/new" className={`${primaryBtnClass} mt-4`}>
            Create your first sketch
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sketches.map((sketch) => (
            <div key={sketch.id} className="space-y-2">
              <SketchCardView sketch={sketch} showStatus />
              <div className="flex flex-wrap gap-2 px-1 text-xs">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
