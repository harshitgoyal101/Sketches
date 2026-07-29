import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSketch } from '@/hooks/useSketches'
import { ApiError } from '@/api/client'
import { forkSketch } from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import { primaryBtnClass, secondaryBtnClass } from '@/lib/form'

export function SketchDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: sketch, isPending, error, refetch } = useSketch(slug)
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState<string | null>(null)
  const notFound = error instanceof ApiError && error.status === 404

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted">
        Loading sketch…
      </div>
    )
  }

  if (notFound || !sketch) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Sketch not found</h1>
        <Link to="/gallery" className="mt-4 inline-block text-primary hover:underline">
          Back to gallery
        </Link>
      </div>
    )
  }

  const thumb = sketch.thumbnail_card_url || sketch.thumbnail
  const author = sketch.author?.username ?? 'anonymous'

  async function onFork() {
    if (!slug) return
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setForking(true)
    setForkError(null)
    try {
      const fork = await forkSketch(slug)
      navigate(`/sketches/${fork.slug}/edit`)
    } catch (err) {
      setForkError(err instanceof ApiError ? err.message : 'Fork failed')
    } finally {
      setForking(false)
      void refetch()
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {sketch.embed_url ? (
          <iframe
            title={sketch.title}
            src={sketch.embed_url}
            className="aspect-video w-full border-0 bg-background"
            loading="lazy"
            allow="autoplay"
          />
        ) : thumb ? (
          <img
            src={thumb}
            alt=""
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-muted">
            No preview
          </div>
        )}
      </div>
      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {sketch.title}
            </h1>
            <p className="text-sm text-muted">
              by {author} · {sketch.sketch_type_label} · {sketch.fork_count} forks
            </p>
            {sketch.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {sketch.tags.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/gallery?tag=${encodeURIComponent(item.slug)}`}
                    className="rounded-btn border border-border px-2.5 py-1 text-xs text-muted hover:border-primary/40 hover:text-primary"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {sketch.can_edit ? (
              <>
                <Link to={`/sketches/${sketch.slug}/edit`} className={secondaryBtnClass}>
                  Open IDE
                </Link>
                <Link
                  to={`/sketches/${sketch.slug}/settings`}
                  className={secondaryBtnClass}
                >
                  Settings
                </Link>
              </>
            ) : null}
            {sketch.can_fork ? (
              <button
                type="button"
                onClick={() => void onFork()}
                disabled={forking}
                className={primaryBtnClass}
              >
                {forking ? 'Forking…' : 'Fork'}
              </button>
            ) : null}
          </div>
        </div>
        {forkError ? (
          <p className="text-sm text-destructive" role="alert">
            {forkError}
          </p>
        ) : null}
        {sketch.description_html ? (
          <div
            className="markdown-body pt-1 text-sm leading-relaxed text-muted"
            dangerouslySetInnerHTML={{ __html: sketch.description_html }}
          />
        ) : sketch.description ? (
          <p className="pt-1 text-sm leading-relaxed text-muted">
            {sketch.description}
          </p>
        ) : null}
        {sketch.code ? (
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-xs text-muted">
            <code>{sketch.code}</code>
          </pre>
        ) : null}
      </div>
    </div>
  )
}
