import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Code2, FlaskConical, Terminal } from 'lucide-react'
import { ApiError } from '@/api/client'
import { createSketch, getStarters } from '@/api/sketches'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import { useAuth } from '@/auth/AuthProvider'
import { useGuest } from '@/guest/GuestProvider'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  fieldError,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/lib/form'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, typeof Code2> = {
  p5js: Code2,
  processing: Terminal,
}

export function CreateSketchPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { requireAuth } = useGuest()
  const navigate = useNavigate()
  const startersQuery = useQuery({
    queryKey: ['starters'],
    queryFn: getStarters,
    enabled: isAuthenticated,
  })
  const starters = startersQuery.data
  const typeOptions: {
    value: string
    label: string
    hint: string
  }[] = starters
    ? Object.entries(starters).map(([value, meta]) => ({
        value,
        label: meta.label,
        hint: meta.hint,
      }))
    : [
        { value: 'p5js', label: 'p5.js', hint: 'JavaScript' },
        {
          value: 'processing',
          label: 'Processing',
          hint: 'Java',
        },
      ]

  const [title, setTitle] = useState('')
  const [sketchType, setSketchType] = useState('p5js')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useDocumentTitle(
    'New sketch · Sketches101',
    'Create a p5.js or Processing sketch and open it in the editor.',
  )

  useEffect(() => {
    if (starters && !starters[sketchType]) {
      const first = Object.keys(starters)[0]
      if (first) setSketchType(first)
    }
  }, [starters, sketchType])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      requireAuth({ type: 'create' })
    }
  }, [isAuthenticated, isLoading, requireAuth])

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
        <SketchDetailAtmosphere />
        <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center px-5 py-20 text-center sm:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
            New sketch
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Sign in to create
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Choose Google or email in the dialog to keep a new sketch on your
            account — or try the sandbox as a guest.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/sandbox" className={cn(primaryBtnClass, 'gap-2')}>
              <FlaskConical size={16} aria-hidden />
              Open sandbox
            </Link>
            <Link to="/gallery" className={secondaryBtnClass}>
              Browse gallery
            </Link>
          </div>
        </div>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const sketch = await createSketch({
        title: title.trim() || 'Untitled sketch',
        sketch_type: sketchType,
      })
      navigate(`/sketches/${sketch.slug}/edit`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError('Could not create sketch. Is Django running?')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-background">
      <SketchDetailAtmosphere />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-12">
        <header className="border-b border-border pb-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Create a sketch
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            Share your creativity with the world.
          </p>
        </header>

        <form className="mt-8 space-y-8" onSubmit={onSubmit}>
          <fieldset>
            <div className="mb-4">
              <legend className="font-display text-lg font-bold tracking-tight text-foreground">
                Choose a format
              </legend>
              <p className="mt-1 text-sm text-muted">
                This sets the language and starter template for your editor.
              </p>
            </div>
            <div
              className="grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Sketch format"
            >
              {typeOptions.map((option) => {
                const Icon = TYPE_ICONS[option.value] ?? Code2
                const active = sketchType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSketchType(option.value)}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border-2 px-5 py-5 text-left transition-[border-color,background-color,transform] duration-200',
                      active
                        ? 'border-primary bg-primary/15 shadow-[0_0_0_1px_rgba(123,97,255,0.35)]'
                        : 'border-border bg-surface/80 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-surface',
                    )}
                  >
                    {active ? (
                      <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white">
                        Selected
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border',
                        active
                          ? 'border-primary bg-primary text-white'
                          : 'border-primary/30 bg-primary/10 text-primary group-hover:border-primary/50',
                      )}
                    >
                      <Icon size={22} aria-hidden />
                    </span>
                    <span className="block font-display text-xl font-bold tracking-tight text-foreground">
                      {option.label}
                    </span>
                    <span
                      className={cn(
                        'mt-1.5 block text-sm leading-relaxed',
                        active ? 'text-foreground/80' : 'text-muted',
                      )}
                    >
                      {option.hint}
                    </span>
                  </button>
                )
              })}
            </div>
            {fieldError(fieldErrors, 'sketch_type') ? (
              <span className="mt-2 block text-xs text-destructive">
                {fieldError(fieldErrors, 'sketch_type')}
              </span>
            ) : null}
          </fieldset>

          <label className="block space-y-2">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              Title
            </span>
            <input
              className={cn(inputClass, 'bg-surface/80 py-3 text-base backdrop-blur-sm')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled sketch"
              autoFocus
            />
            {fieldError(fieldErrors, 'title') ? (
              <span className="text-xs text-destructive">
                {fieldError(fieldErrors, 'title')}
              </span>
            ) : null}
          </label>

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p></p>
            <div className="flex flex-wrap gap-3">
              <Link to="/account" className={secondaryBtnClass}>
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={cn(primaryBtnClass, 'gap-2')}
              >
                {submitting ? 'Creating…' : 'Continue'}
                {!submitting ? <ArrowRight size={16} aria-hidden /> : null}
              </button>
            </div>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-muted">
          Just experimenting?{' '}
          <Link
            to="/sandbox"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <FlaskConical size={14} aria-hidden />
            Try the sandbox
          </Link>
        </p>
      </div>
    </div>
  )
}
