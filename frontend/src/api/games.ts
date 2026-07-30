import { fetchJson } from '@/api/client'

export type GameInfo = {
  slug: string
  title: string
  description: string
  max_score: number
}

export type GameScoreRow = {
  id: number
  game: string
  score: number
  meta: Record<string, unknown>
  played_at: string
  user?: {
    id: number
    username: string
    display_name?: string
  }
}

export async function listGames(): Promise<GameInfo[]> {
  const data = await fetchJson<{ results: GameInfo[] }>('/api/games/')
  return data.results
}

export async function getGameScores(slug: string): Promise<{
  game: { slug: string; title: string; max_score: number }
  results: GameScoreRow[]
  me: Omit<GameScoreRow, 'user'> | null
}> {
  return fetchJson(`/api/games/${encodeURIComponent(slug)}/scores/`)
}

export async function submitGameScore(
  slug: string,
  payload: { score: number; meta?: Record<string, unknown>; played_at?: string },
): Promise<{ ok: true; score: GameScoreRow; is_personal_best: boolean }> {
  return fetchJson(`/api/games/${encodeURIComponent(slug)}/scores/`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Could not submit score',
  })
}
