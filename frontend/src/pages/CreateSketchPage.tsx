import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { createSketch, getStarters } from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import { useGuest } from '@/guest/GuestProvider'
import {
  fieldError,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/lib/form'
import { cn } from '@/lib/utils'

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
        { value: 'p5js', label: 'p5.js', hint: 'JavaScript with setup() and draw()' },
        {
          value: 'processing',
          label: 'Processing',
          hint: 'Java-mode .pde with setup() and draw()',
        },
      ]

  const [title, setTitle] = useState('')
  const [sketchType, setSketchType] = useState('p5js')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

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
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Sign in to create</h1>
        <p className="mt-2 text-sm text-muted">
          Choose Google or email in the dialog to keep a new sketch on your account.
        </p>
        <Link to="/sandbox" className="mt-6 inline-block text-primary hover:underline">
          Or try the sandbox as a guest
        </Link>
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
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        New sketch
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Create a sketch
      </h1>
      <p className="mt-2 text-sm text-muted">
        Pick a format and title — you&apos;ll land in the editor with starter
        code. Description, tags, and thumbnail live in Settings when you&apos;re
        ready.
      </p>

      <form className="mt-8 space-y-6" onSubmit={onSubmit}>
        <label className={labelClass}>
          <span className="text-muted">Title</span>
          <input
            className={inputClass}
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

        <fieldset className="space-y-3">
          <legend className="text-sm text-muted">Format</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSketchType(option.value)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  sketchType === option.value
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-surface hover:border-primary/30',
                )}
              >
                <span className="block font-display text-sm font-semibold">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs text-muted">{option.hint}</span>
              </button>
            ))}
          </div>
          {fieldError(fieldErrors, 'sketch_type') ? (
            <span className="text-xs text-destructive">
              {fieldError(fieldErrors, 'sketch_type')}
            </span>
          ) : null}
        </fieldset>

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className={primaryBtnClass}>
            {submitting ? 'Creating…' : 'Continue to settings'}
          </button>
          <Link to="/account" className={secondaryBtnClass}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
