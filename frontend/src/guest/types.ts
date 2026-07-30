/** Guest profile schema (client-only). Schema version for migrations. */

export const GUEST_SCHEMA_VERSION = 2
export const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const GUEST_SCORE_HISTORY_CAP = 50
export const GUEST_PENDING_FORK_CAP = 10

export type GuestDraftFile = {
  filename: string
  content: string
  language: string
  is_main: boolean
  asset_type: string
}

export type GuestDraft = {
  client_id: string
  title: string
  sketch_type: string
  entry_filename: string
  files: GuestDraftFile[]
  updated_at: string
}

export type GuestScore = {
  game: string
  score: number
  played_at: string
  meta?: Record<string, unknown>
}

export type GuestPendingFork = {
  source_slug: string
  files?: GuestDraftFile[]
  saved_at: string
}

export type GuestHighScore = {
  score: number
  played_at: string
  meta?: Record<string, unknown>
}

export type GuestProfile = {
  schemaVersion: number
  guestId: string
  displayName: string
  createdAt: string
  expiresAt: string
  drafts: GuestDraft[]
  pendingForks: GuestPendingFork[]
  gameHistory: GuestScore[]
  highScores: Record<string, GuestHighScore>
  migratedAt?: string
}

export type PendingAction =
  | { type: 'create' }
  | { type: 'fork'; sourceSlug: string }
  | { type: 'save'; clientId?: string; sourceSlug?: string }
  | { type: 'sandbox' }
  | { type: 'claim_score'; game: string; score: number }

export const LS_GUEST_ID = 'sketches101-guest-id'
export const LS_GUEST_NAME = 'sketches101-guest-name'
export const LS_GUEST_PROFILE = 'sketches101-guest-profile'
export const SS_PENDING_ACTION = 'sketches101-pending-action'
