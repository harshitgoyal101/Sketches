export type RecentView = {
  slug: string
  title: string
  thumb: string | null
  viewedAt: string
}

const STORAGE_KEY = 'sketches101-recent-views'
const MAX_RECENT = 12

export function readRecentViews(): RecentView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (row): row is RecentView =>
          Boolean(
            row &&
              typeof row === 'object' &&
              typeof (row as RecentView).slug === 'string' &&
              typeof (row as RecentView).title === 'string',
          ),
      )
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function recordRecentView(entry: {
  slug: string
  title: string
  thumb?: string | null
}): RecentView[] {
  const next: RecentView = {
    slug: entry.slug,
    title: entry.title,
    thumb: entry.thumb ?? null,
    viewedAt: new Date().toISOString(),
  }
  const prev = readRecentViews().filter((row) => row.slug !== next.slug)
  const list = [next, ...prev].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore quota */
  }
  return list
}

export function formatRelativeEdited(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
