export function fieldError(
  errors: Record<string, string[]>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    if (errors[key]?.[0]) return errors[key][0]
  }
  return undefined
}

export const inputClass =
  'w-full rounded-btn border border-border bg-surface px-3 py-2 text-sm text-foreground'

export const labelClass = 'block space-y-1.5 text-sm'

export const primaryBtnClass =
  'inline-flex items-center justify-center rounded-btn bg-primary px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-primary-hover disabled:opacity-60'

export const secondaryBtnClass =
  'inline-flex items-center justify-center rounded-btn border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40 disabled:opacity-60'
