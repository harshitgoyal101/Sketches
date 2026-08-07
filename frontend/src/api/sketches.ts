import { fetchJson, fetchMultipart } from '@/api/client'
import type { SketchCard, SketchDetail, SketchTag } from '@/types/sketch'
import type {
  FormatItem,
  HomeResponse,
  SketchListResponse,
} from '@/types/sketch'
import { MOCK_HOME, MOCK_SKETCHES } from '@/types/sketch'
import { ApiError } from '@/api/client'

export { ApiError }

export type SketchListParams = {
  q?: string
  type?: string
  sort?: 'featured' | 'recent' | 'all' | 'random'
  page?: number
  tag?: string
  author?: string
  exclude?: string
  /** When true, list only published games (is_game). */
  games?: boolean
}

function toQuery(params: SketchListParams): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.type) search.set('type', params.type)
  if (params.sort) search.set('sort', params.sort)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  if (params.tag) search.set('tag', params.tag)
  if (params.author) search.set('author', params.author)
  if (params.exclude) search.set('exclude', params.exclude)
  if (params.games) search.set('games', '1')
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function getHome(): Promise<HomeResponse> {
  try {
    return await fetchJson<HomeResponse>('/api/home/')
  } catch {
    return MOCK_HOME
  }
}

export type MakerProfile = {
  username: string
  display_name: string
  sketch_count: number
  sketches: SketchCard[]
}

export async function getMakerProfile(username: string): Promise<MakerProfile> {
  return fetchJson<MakerProfile>(
    `/api/makers/${encodeURIComponent(username)}/`,
  )
}

export type ExploreTodayResponse = {
  date: string
  sketch: SketchDetail | null
  previous: { date: string; slug: string; title: string }[]
}

export async function getExploreToday(): Promise<ExploreTodayResponse> {
  return fetchJson<ExploreTodayResponse>('/api/explore/today/')
}

export type WeeklyChallenge = {
  title: string
  slug: string
  prompt: string
  starts_on: string
  ends_on: string
  tag: { name: string; slug: string } | null
  entry_count: number
  gallery_url: string
}

export async function getCurrentChallenge(): Promise<WeeklyChallenge | null> {
  const data = await fetchJson<{ challenge: WeeklyChallenge | null }>(
    '/api/challenges/current/',
  )
  return data.challenge
}

export async function getSketches(
  params: SketchListParams = {},
): Promise<SketchListResponse> {
  try {
    return await fetchJson<SketchListResponse>(
      `/api/sketches/${toQuery(params)}`,
    )
  } catch {
    let results = [...MOCK_SKETCHES]
    if (params.type) {
      results = results.filter((s) => s.sketch_type === params.type)
    }
    if (params.tag) {
      results = results.filter((s) =>
        s.tags.some((tag) => tag.slug === params.tag),
      )
    }
    if (params.q) {
      const q = params.q.toLowerCase()
      results = results.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.author?.username.toLowerCase().includes(q),
      )
    }
    if (params.sort === 'recent') {
      results = [...results].reverse()
    }
    return {
      results,
      page: 1,
      page_size: 12,
      total: results.length,
      has_next: false,
      has_previous: false,
      filters: {
        q: params.q ?? '',
        tag: params.tag ? [params.tag] : [],
        type: params.type ? [params.type] : [],
        author: params.author ? [params.author] : [],
        sort: params.sort ?? 'featured',
      },
    }
  }
}

export async function getSketch(slug: string): Promise<SketchDetail> {
  try {
    return await fetchJson<SketchDetail>(`/api/sketches/${slug}/`)
  } catch (err) {
    const mock = MOCK_SKETCHES.find((s) => s.slug === slug)
    if (mock) {
      return {
        ...mock,
        entry_filename: 'sketch.js',
        code: '// Mock sketch — start Django to load real source.',
        embed_url: '',
        can_edit: false,
        can_fork: false,
        forked_from: null,
        related: [],
        forks: [],
        assets: [],
      }
    }
    throw err
  }
}

export async function getFormats(): Promise<FormatItem[]> {
  try {
    const data = await fetchJson<{ results: FormatItem[] }>('/api/formats/')
    return data.results
  } catch {
    return [
      { name: 'p5.js', slug: 'p5js', sort_order: 0 },
      { name: 'Processing', slug: 'processing', sort_order: 1 },
    ]
  }
}

export async function getTags(): Promise<SketchTag[]> {
  try {
    const data = await fetchJson<{ results: SketchTag[] }>('/api/tags/')
    return data.results
  } catch {
    return []
  }
}

export type AccountSketchesResponse = {
  user: { id: number; username: string; email: string; is_staff: boolean }
  results: SketchCard[]
  published_count: number
  draft_count: number
}

export async function getAccountSketches(): Promise<AccountSketchesResponse> {
  return fetchJson<AccountSketchesResponse>('/api/account/sketches/')
}

export type StarterPayload = Record<
  string,
  {
    filename: string
    extension: string
    code: string
    label: string
    hint: string
  }
>

export async function getStarters(): Promise<StarterPayload> {
  const data = await fetchJson<{ starters: StarterPayload }>('/api/starters/')
  return data.starters
}

export async function getManageTags(): Promise<SketchTag[]> {
  const data = await fetchJson<{ results: SketchTag[] }>('/api/account/tags/')
  return data.results
}

export type CreateSketchPayload = {
  title: string
  sketch_type?: string
  entry_filename?: string
  code?: string
}

export async function createSketch(
  payload: CreateSketchPayload,
): Promise<SketchDetail> {
  const data = await fetchJson<{ ok: boolean; sketch: SketchDetail }>(
    '/api/account/sketches/',
    {
      method: 'POST',
      body: payload,
      fallbackMessage: 'Could not create sketch',
    },
  )
  return data.sketch
}

export async function getManagedSketch(slug: string): Promise<SketchDetail> {
  return fetchJson<SketchDetail>(`/api/account/sketches/${slug}/`)
}

export type UpdateSketchPayload = {
  title?: string
  entry_filename?: string
  code?: string
}

export async function updateSketch(
  slug: string,
  payload: UpdateSketchPayload,
): Promise<SketchDetail> {
  const data = await fetchJson<{ ok: boolean; sketch: SketchDetail }>(
    `/api/account/sketches/${slug}/`,
    {
      method: 'PATCH',
      body: payload,
      fallbackMessage: 'Could not save sketch',
    },
  )
  return data.sketch
}

export type SettingsResponse = {
  sketch: SketchDetail
  is_admin: boolean
  status_choices: { value: string; label: string }[]
}

export async function getSketchSettings(slug: string): Promise<SettingsResponse> {
  return fetchJson<SettingsResponse>(`/api/account/sketches/${slug}/settings/`)
}

export type UpdateSettingsPayload = {
  title?: string
  description?: string
  tags?: string[]
  status?: string
  is_game?: boolean
  scoreboard_slug?: string
}

export async function updateSketchSettings(
  slug: string,
  payload: UpdateSettingsPayload,
): Promise<SketchDetail> {
  const data = await fetchJson<{ ok: boolean; sketch: SketchDetail }>(
    `/api/account/sketches/${slug}/settings/`,
    {
      method: 'PATCH',
      body: payload,
      fallbackMessage: 'Could not save settings',
    },
  )
  return data.sketch
}

export async function publishSketch(slug: string): Promise<SketchDetail> {
  const data = await fetchJson<{ ok: boolean; sketch: SketchDetail }>(
    `/api/account/sketches/${slug}/publish/`,
    {
      method: 'POST',
      body: {},
      fallbackMessage: 'Could not publish sketch',
    },
  )
  return data.sketch
}

export async function uploadSketchThumbnail(
  slug: string,
  file: File,
): Promise<{ url: string | null; thumbnail_card_url: string | null }> {
  const formData = new FormData()
  formData.append('image', file)
  return fetchMultipart(`/api/account/sketches/${slug}/thumbnail/`, formData, {
    fallbackMessage: 'Could not upload thumbnail',
  })
}

export async function generateSketchThumbnail(
  slug: string,
): Promise<{ url: string | null; thumbnail_card_url: string | null }> {
  return fetchJson(`/api/account/sketches/${slug}/thumbnail/generate/`, {
    method: 'POST',
    body: {},
    fallbackMessage: 'Could not generate thumbnail',
  })
}

export async function uploadSketchAppIcon(
  slug: string,
  file: File,
): Promise<{ url: string | null; app_icon: string | null }> {
  const formData = new FormData()
  formData.append('image', file)
  return fetchMultipart(`/api/account/sketches/${slug}/app-icon/`, formData, {
    fallbackMessage: 'Could not upload app icon',
  })
}

export async function generateSketchAppIcon(
  slug: string,
): Promise<{ url: string | null; app_icon: string | null }> {
  return fetchJson(`/api/account/sketches/${slug}/app-icon/generate/`, {
    method: 'POST',
    body: {},
    fallbackMessage: 'Could not generate app icon',
  })
}

export type PreviewPayload = {
  sketch_type: string
  main_code: string
  assets: { asset_type: string; content: string }[]
  mode?: string
  run_id?: number
}

export type PreviewResult = {
  url: string
  html: string
}

export async function createPreview(payload: PreviewPayload): Promise<PreviewResult> {
  const data = await fetchJson<{ ok: boolean; url: string; html: string }>('/api/preview/', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Preview failed',
  })
  return { url: data.url, html: data.html }
}

export type SaveSourcePayload = {
  title?: string
  entry_filename?: string
  files: import('@/types/sketch').SourceFile[]
  deleted_asset_ids?: number[]
}

export async function saveSketchSource(
  slug: string,
  payload: SaveSourcePayload,
): Promise<SketchDetail> {
  const data = await fetchJson<{ ok: boolean; sketch: SketchDetail }>(
    `/api/account/sketches/${slug}/source/`,
    {
      method: 'POST',
      body: {
        title: payload.title,
        entry_filename: payload.entry_filename,
        files: payload.files.map((file) => ({
          filename: file.filename,
          content: file.content,
          is_main: file.is_main,
          asset_id: file.asset_id,
          asset_type: file.asset_type,
        })),
        deleted_asset_ids: payload.deleted_asset_ids ?? [],
      },
      fallbackMessage: 'Could not save source',
    },
  )
  return data.sketch
}

export async function forkSketch(slug: string): Promise<SketchDetail> {
  const data = await fetchJson<{ ok: boolean; sketch: SketchDetail }>(
    `/api/sketches/${slug}/fork/`,
    {
      method: 'POST',
      body: {},
      fallbackMessage: 'Could not fork sketch',
    },
  )
  return data.sketch
}
