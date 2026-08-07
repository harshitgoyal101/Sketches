export type SketchAuthor = {
  username: string
} | null

export type SketchTag = {
  name: string
  slug: string
}

export type SketchType = 'p5js' | 'processing' | string

/** Card shape returned by Django `/api/sketches/` and `/api/home/`. */
export type SketchCard = {
  id: number
  title: string
  slug: string
  sketch_type: SketchType
  sketch_type_label: string
  description: string
  description_html?: string
  status: string
  author: SketchAuthor
  thumbnail: string | null
  thumbnail_card_url: string | null
  thumbnail_srcset: string
  /** Square mobile list icon; falls back to thumbnail on the client when null. */
  app_icon: string | null
  published_at: string | null
  updated_at: string | null
  fork_count: number
  tags: SketchTag[]
  /** When true, sketch is listed under /games as play-only. */
  is_game?: boolean
  /** Scoreboard Game slug; defaults to sketch.slug when omitted. */
  scoreboard_slug?: string
}

export type SketchDetail = SketchCard & {
  entry_filename: string
  code: string
  embed_url: string
  can_edit: boolean
  can_fork: boolean
  forked_from: {
    slug: string
    title: string
    author: SketchAuthor
  } | null
  related?: SketchCard[]
  forks?: SketchCard[]
  assets: {
    filename: string
    asset_type: string
    asset_id?: number
    order?: number
  }[]
  files?: SourceFile[]
}

export type SourceFile = {
  filename: string
  content: string
  language: string
  is_main: boolean
  asset_type: string
  asset_id: number | null
}

export type SketchListResponse = {
  results: SketchCard[]
  page: number
  page_size: number
  total: number
  has_next: boolean
  has_previous: boolean
  filters: {
    q: string
    tag: string[]
    type: string[]
    author: string[]
    sort: string
  }
}

export type HomeBackgroundSketch = {
  slug: string
  title: string
  embed_url: string
} | null

export type HomeResponse = {
  featured: SketchCard[]
  stats: {
    sketch_count: number
    artist_count: number
    format_count: number
  }
  background?: {
    dark: HomeBackgroundSketch
    light: HomeBackgroundSketch
  }
}

export type FormatItem = {
  name: string
  slug: string
  sort_order: number
}

/** Offline / Vite-only fallback when Django isn't running. */
export const MOCK_SKETCHES: SketchCard[] = [
  {
    id: 1,
    title: 'Orbit Bloom',
    slug: 'orbit-bloom',
    sketch_type: 'p5js',
    sketch_type_label: 'p5.js',
    description: '',
    status: 'published',
    author: { username: 'maya' },
    thumbnail: 'https://picsum.photos/seed/orbit/640/400',
    thumbnail_card_url: 'https://picsum.photos/seed/orbit/640/400',
    thumbnail_srcset: '',
    app_icon: null,
    published_at: null,
    updated_at: null,
    fork_count: 12,
    tags: [],
  },
  {
    id: 2,
    title: 'Noise Grid',
    slug: 'noise-grid',
    sketch_type: 'p5js',
    sketch_type_label: 'p5.js',
    description: '',
    status: 'published',
    author: { username: 'kai' },
    thumbnail: 'https://picsum.photos/seed/noise/640/400',
    thumbnail_card_url: 'https://picsum.photos/seed/noise/640/400',
    thumbnail_srcset: '',
    app_icon: null,
    published_at: null,
    updated_at: null,
    fork_count: 8,
    tags: [],
  },
  {
    id: 3,
    title: 'Ink Flow',
    slug: 'ink-flow',
    sketch_type: 'processing',
    sketch_type_label: 'Processing',
    description: '',
    status: 'published',
    author: { username: 'rina' },
    thumbnail: 'https://picsum.photos/seed/ink/640/400',
    thumbnail_card_url: 'https://picsum.photos/seed/ink/640/400',
    thumbnail_srcset: '',
    app_icon: null,
    published_at: null,
    updated_at: null,
    fork_count: 5,
    tags: [],
  },
  {
    id: 4,
    title: 'Pulse Field',
    slug: 'pulse-field',
    sketch_type: 'p5js',
    sketch_type_label: 'p5.js',
    description: '',
    status: 'published',
    author: { username: 'leo' },
    thumbnail: 'https://picsum.photos/seed/pulse/640/400',
    thumbnail_card_url: 'https://picsum.photos/seed/pulse/640/400',
    thumbnail_srcset: '',
    app_icon: null,
    published_at: null,
    updated_at: null,
    fork_count: 3,
    tags: [],
  },
  {
    id: 5,
    title: 'Crystal Walk',
    slug: 'crystal-walk',
    sketch_type: 'processing',
    sketch_type_label: 'Processing',
    description: '',
    status: 'published',
    author: { username: 'sam' },
    thumbnail: 'https://picsum.photos/seed/crystal/640/400',
    thumbnail_card_url: 'https://picsum.photos/seed/crystal/640/400',
    thumbnail_srcset: '',
    app_icon: null,
    published_at: null,
    updated_at: null,
    fork_count: 2,
    tags: [],
  },
  {
    id: 6,
    title: 'Tidal Code',
    slug: 'tidal-code',
    sketch_type: 'p5js',
    sketch_type_label: 'p5.js',
    description: '',
    status: 'published',
    author: { username: 'nova' },
    thumbnail: 'https://picsum.photos/seed/tidal/640/400',
    thumbnail_card_url: 'https://picsum.photos/seed/tidal/640/400',
    thumbnail_srcset: '',
    app_icon: null,
    published_at: null,
    updated_at: null,
    fork_count: 1,
    tags: [],
  },
]

export const MOCK_HOME: HomeResponse = {
  featured: MOCK_SKETCHES.slice(0, 3),
  stats: {
    sketch_count: MOCK_SKETCHES.length,
    artist_count: 6,
    format_count: 2,
  },
  background: {
    dark: null,
    light: null,
  },
}
