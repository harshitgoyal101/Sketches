import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { readBookmarks, removeBookmark, type Bookmark as FavouriteRow } from '@/lib/bookmarks'
import { cn } from '@/lib/utils'

export function FavouritesPage() {
  const [items, setItems] = useState<FavouriteRow[]>(() => readBookmarks())

  function onRemove(slug: string) {
    setItems(removeBookmark(slug))
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-[75rem] px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary font-bold">
              Library
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Favourites
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
              Continue where you left off, and see if you can beat your own score.
            </p>
          </div>
          {items.length > 0 ? (
            <p className="gallery-count-pill w-fit">
              {items.length} favourite{items.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </header>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-primary">
              <Heart size={20} aria-hidden />
            </div>
            <p className="mt-5 font-display text-lg font-bold text-foreground">
              Nothing favourited yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Open any sketch and tap Favourite. Your picks will show up here.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/gallery" className="home-btn home-btn-primary !min-h-10 !px-5 !py-2 !text-sm">
                Explore gallery
              </Link>
              <Link to="/explore/today" className="home-btn home-btn-ghost !min-h-10 !px-5 !py-2 !text-sm">
                Sketch of the day
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((row) => (
              <li key={row.slug}>
                <article
                  className={cn(
                    'group relative overflow-hidden rounded-xl border border-border bg-surface',
                    'transition-[border-color] duration-200 hover:border-primary/40',
                  )}
                >
                  <Link to={`/sketches/${row.slug}`} className="block">
                    <div className="aspect-[16/10] overflow-hidden bg-background">
                      {row.thumb ? (
                        <img
                          src={row.thumb}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(123,97,255,0.22),transparent_55%)]">
                          <span className="font-display text-sm text-muted">
                            {row.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3.5">
                      <p className="truncate font-display text-sm font-bold text-foreground group-hover:text-primary">
                        {row.title}
                      </p>
                      <p className="text-xs text-muted">
                        Favourited {new Date(row.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="absolute right-2.5 top-2.5 cursor-pointer rounded-md border border-border bg-background/80 px-2 py-1 text-[11px] font-medium text-muted backdrop-blur-sm transition-colors hover:border-destructive/40 hover:text-destructive"
                    onClick={() => onRemove(row.slug)}
                  >
                    Remove
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
