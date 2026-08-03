export type Bookmark = {
  slug: string
  title: string
  thumb: string | null
  savedAt: string
}

const STORAGE_KEY = 'sketches101-bookmarks'
const MAX_BOOKMARKS = 50

export function readBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (row): row is Bookmark =>
          Boolean(
            row &&
              typeof row === 'object' &&
              typeof (row as Bookmark).slug === 'string' &&
              typeof (row as Bookmark).title === 'string',
          ),
      )
      .slice(0, MAX_BOOKMARKS)
  } catch {
    return []
  }
}

function writeBookmarks(list: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_BOOKMARKS)))
  } catch {
    /* ignore quota */
  }
}

export function isBookmarked(slug: string): boolean {
  return readBookmarks().some((row) => row.slug === slug)
}

/** Returns the updated bookmark list after toggle. */
export function toggleBookmark(entry: {
  slug: string
  title: string
  thumb?: string | null
}): Bookmark[] {
  const prev = readBookmarks()
  const exists = prev.some((row) => row.slug === entry.slug)
  const next = exists
    ? prev.filter((row) => row.slug !== entry.slug)
    : [
        {
          slug: entry.slug,
          title: entry.title,
          thumb: entry.thumb ?? null,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ]
  writeBookmarks(next)
  return next
}

export function removeBookmark(slug: string): Bookmark[] {
  const next = readBookmarks().filter((row) => row.slug !== slug)
  writeBookmarks(next)
  return next
}
