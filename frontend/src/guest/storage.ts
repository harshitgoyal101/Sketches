import {
  GUEST_PENDING_FORK_CAP,
  GUEST_SCHEMA_VERSION,
  GUEST_SCORE_HISTORY_CAP,
  GUEST_TTL_MS,
  LS_GUEST_ID,
  LS_GUEST_NAME,
  LS_GUEST_PROFILE,
  SS_PENDING_ACTION,
  type GuestDraft,
  type GuestPendingFork,
  type GuestProfile,
  type GuestScore,
  type PendingAction,
} from './types'

const DB_NAME = 'sketches101-guest'
const DB_STORE = 'profile'
const DB_KEY = 'current'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

async function idbGet(): Promise<GuestProfile | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const req = tx.objectStore(DB_STORE).get(DB_KEY)
      req.onsuccess = () => resolve((req.result as GuestProfile) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function idbSet(profile: GuestProfile): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(profile, DB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* fall through to localStorage */
  }
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).delete(DB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* ignore */
  }
}

function mirrorLocal(profile: GuestProfile | null) {
  try {
    if (!profile) {
      localStorage.removeItem(LS_GUEST_ID)
      localStorage.removeItem(LS_GUEST_NAME)
      localStorage.removeItem(LS_GUEST_PROFILE)
      return
    }
    localStorage.setItem(LS_GUEST_ID, profile.guestId)
    localStorage.setItem(LS_GUEST_NAME, profile.displayName)
    localStorage.setItem(LS_GUEST_PROFILE, JSON.stringify(profile))
  } catch {
    /* ignore quota */
  }
}

function readLocalMirror(): GuestProfile | null {
  try {
    const raw = localStorage.getItem(LS_GUEST_PROFILE)
    if (!raw) return null
    return JSON.parse(raw) as GuestProfile
  } catch {
    return null
  }
}

function isExpired(profile: GuestProfile): boolean {
  return Date.parse(profile.expiresAt) <= Date.now()
}

/** Upgrade v1 profiles and fill Sprint 2 fields. */
function upgrade(raw: GuestProfile | null): GuestProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const version = Number(raw.schemaVersion) || 0
  if (version !== 1 && version !== GUEST_SCHEMA_VERSION) return null
  return {
    schemaVersion: GUEST_SCHEMA_VERSION,
    guestId: raw.guestId,
    displayName: raw.displayName,
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
    drafts: Array.isArray(raw.drafts) ? raw.drafts : [],
    pendingForks: Array.isArray(raw.pendingForks) ? raw.pendingForks : [],
    gameHistory: Array.isArray(raw.gameHistory) ? raw.gameHistory : [],
    highScores:
      raw.highScores && typeof raw.highScores === 'object' ? raw.highScores : {},
    migratedAt: raw.migratedAt,
  }
}

function normalize(profile: GuestProfile | null): GuestProfile | null {
  const upgraded = upgrade(profile)
  if (!upgraded) return null
  if (isExpired(upgraded)) return null
  if (upgraded.migratedAt) return null
  if (!upgraded.guestId || !upgraded.displayName) return null
  return upgraded
}

export function createGuestProfile(displayName: string): GuestProfile {
  const now = Date.now()
  return {
    schemaVersion: GUEST_SCHEMA_VERSION,
    guestId: crypto.randomUUID(),
    displayName: displayName.trim().slice(0, 80) || 'Guest',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + GUEST_TTL_MS).toISOString(),
    drafts: [],
    pendingForks: [],
    gameHistory: [],
    highScores: {},
  }
}

export async function loadGuestProfile(): Promise<GuestProfile | null> {
  const fromIdb = normalize(await idbGet())
  if (fromIdb) {
    mirrorLocal(fromIdb)
    return fromIdb
  }
  const fromLs = normalize(readLocalMirror())
  if (fromLs) {
    await idbSet(fromLs)
    mirrorLocal(fromLs)
    return fromLs
  }
  mirrorLocal(null)
  await idbClear()
  return null
}

export async function saveGuestProfile(profile: GuestProfile): Promise<void> {
  await idbSet(profile)
  mirrorLocal(profile)
}

export async function clearGuestProfile(): Promise<void> {
  await idbClear()
  mirrorLocal(null)
}

export async function markGuestMigrated(profile: GuestProfile): Promise<void> {
  await clearGuestProfile()
  try {
    sessionStorage.setItem('sketches101-guest-migrated', profile.guestId)
  } catch {
    /* ignore */
  }
}

export function upsertDraft(
  profile: GuestProfile,
  draft: GuestDraft,
): GuestProfile {
  const others = profile.drafts.filter((d) => d.client_id !== draft.client_id)
  return {
    ...profile,
    drafts: [{ ...draft, updated_at: new Date().toISOString() }, ...others].slice(
      0,
      20,
    ),
  }
}

export function recordScoreOnProfile(
  profile: GuestProfile,
  entry: GuestScore,
): { profile: GuestProfile; isPersonalBest: boolean } {
  const game = entry.game.trim().slice(0, 80)
  const score = Math.max(0, Math.floor(Number(entry.score) || 0))
  const played_at = entry.played_at || new Date().toISOString()
  const meta = entry.meta && typeof entry.meta === 'object' ? entry.meta : {}
  const nextEntry: GuestScore = { game, score, played_at, meta }
  const prevBest = profile.highScores[game]
  const isPersonalBest = !prevBest || score > prevBest.score
  const highScores = { ...profile.highScores }
  if (isPersonalBest) {
    highScores[game] = { score, played_at, meta }
  }
  return {
    profile: {
      ...profile,
      gameHistory: [nextEntry, ...profile.gameHistory].slice(
        0,
        GUEST_SCORE_HISTORY_CAP,
      ),
      highScores,
    },
    isPersonalBest,
  }
}

export function upsertPendingFork(
  profile: GuestProfile,
  fork: GuestPendingFork,
): GuestProfile {
  const others = profile.pendingForks.filter(
    (f) => f.source_slug !== fork.source_slug,
  )
  return {
    ...profile,
    pendingForks: [
      { ...fork, saved_at: fork.saved_at || new Date().toISOString() },
      ...others,
    ].slice(0, GUEST_PENDING_FORK_CAP),
  }
}

export function readPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(SS_PENDING_ACTION)
    if (!raw) return null
    return JSON.parse(raw) as PendingAction
  } catch {
    return null
  }
}

export function writePendingAction(action: PendingAction | null) {
  try {
    if (!action) sessionStorage.removeItem(SS_PENDING_ACTION)
    else sessionStorage.setItem(SS_PENDING_ACTION, JSON.stringify(action))
  } catch {
    /* ignore */
  }
}
