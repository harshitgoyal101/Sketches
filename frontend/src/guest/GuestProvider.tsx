import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { migrateGuest } from '@/api/auth'
import { submitGameScore } from '@/api/games'
import { forkSketch } from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import { AuthGate } from './AuthGate'
import { GuestNameGate } from './GuestNameGate'
import { KeepScoreGate } from './KeepScoreGate'
import {
  clearGuestProfile,
  createGuestProfile,
  loadGuestProfile,
  markGuestMigrated,
  readPendingAction,
  recordScoreOnProfile,
  saveGuestProfile,
  upsertDraft,
  writePendingAction,
} from './storage'
import type {
  GuestDraft,
  GuestProfile,
  GuestScore,
  PendingAction,
} from './types'

type RecordScoreResult = {
  isPersonalBest: boolean
  score: number
  game: string
}

type GuestContextValue = {
  guest: GuestProfile | null
  isReady: boolean
  isGuest: boolean
  requireAuth: (action: PendingAction) => boolean
  setAuthGateOpen: (open: boolean) => void
  authGateOpen: boolean
  saveDraft: (draft: GuestDraft) => Promise<void>
  getDraft: (clientId: string) => GuestDraft | null
  recordScore: (entry: GuestScore) => Promise<RecordScoreResult | null>
  refreshGuest: () => Promise<void>
  clearGuest: () => Promise<void>
  takePendingAction: () => PendingAction | null
  migrating: boolean
  migrateError: string | null
}

const GuestContext = createContext<GuestContextValue | null>(null)

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

type GuestProviderProps = {
  children: ReactNode
}

export function GuestProvider({ children }: GuestProviderProps) {
  const {
    isAuthenticated,
    isLoading: authLoading,
    loginWithGoogle,
    refresh,
  } = useAuth()
  const navigate = useNavigate()
  const [guest, setGuest] = useState<GuestProfile | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [authGateOpen, setAuthGateOpen] = useState(false)
  const [authReason, setAuthReason] = useState<string | undefined>()
  const [migrating, setMigrating] = useState(false)
  const [migrateError, setMigrateError] = useState<string | null>(null)
  const [migrateAttempt, setMigrateAttempt] = useState(0)
  const [keepScore, setKeepScore] = useState<{
    game: string
    score: number
  } | null>(null)
  const migrateRanFor = useRef<string | null>(null)
  const migrateInFlight = useRef(false)

  const refreshGuest = useCallback(async () => {
    const profile = await loadGuestProfile()
    setGuest(profile)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await loadGuestProfile()
      if (!cancelled) {
        setGuest(profile)
        setIsReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const createGuest = useCallback(async (name: string) => {
    const profile = createGuestProfile(name)
    await saveGuestProfile(profile)
    setGuest(profile)
  }, [])

  const clearGuest = useCallback(async () => {
    await clearGuestProfile()
    setGuest(null)
  }, [])

  const requireAuth = useCallback(
    (action: PendingAction) => {
      if (isAuthenticated) return true
      writePendingAction(action)
      const reason =
        action.type === 'fork'
          ? 'Sign in to fork this sketch into your account.'
          : action.type === 'create'
            ? 'Sign in to create and keep a new sketch.'
            : action.type === 'claim_score'
              ? 'Sign in to keep your high score on your account.'
              : 'Sign in to save your edits to your account.'
      setAuthReason(reason)
      setAuthGateOpen(true)
      return false
    },
    [isAuthenticated],
  )

  const saveDraft = useCallback(
    async (draft: GuestDraft) => {
      const base = guest ?? (await loadGuestProfile())
      if (!base) return
      const next = upsertDraft(base, draft)
      await saveGuestProfile(next)
      setGuest(next)
    },
    [guest],
  )

  const getDraft = useCallback(
    (clientId: string) =>
      guest?.drafts.find((d) => d.client_id === clientId) ?? null,
    [guest],
  )

  const recordScore = useCallback(
    async (entry: GuestScore): Promise<RecordScoreResult | null> => {
      const game = (entry.game || '').trim()
      const score = Math.max(0, Math.floor(Number(entry.score) || 0))
      if (!game) return null

      if (isAuthenticated) {
        try {
          const result = await submitGameScore(game, {
            score,
            meta: entry.meta,
            played_at: entry.played_at,
          })
          return {
            isPersonalBest: result.is_personal_best,
            score,
            game,
          }
        } catch {
          return null
        }
      }

      const base = guest ?? (await loadGuestProfile())
      if (!base) return null
      const { profile, isPersonalBest } = recordScoreOnProfile(base, {
        game,
        score,
        played_at: entry.played_at || new Date().toISOString(),
        meta: entry.meta,
      })
      await saveGuestProfile(profile)
      setGuest(profile)
      if (isPersonalBest) {
        setKeepScore({ game, score })
      }
      return { isPersonalBest, score, game }
    },
    [guest, isAuthenticated],
  )

  const takePendingAction = useCallback(() => {
    const action = readPendingAction()
    writePendingAction(null)
    return action
  }, [])

  const resumePending = useCallback(
    async (
      action: PendingAction | null,
      sketches: { client_id: string; slug: string }[],
      forks: { source_slug: string; slug: string }[] = [],
    ) => {
      if (!action) return
      if (action.type === 'create') {
        navigate('/sketches/new', { replace: true })
        return
      }
      if (action.type === 'claim_score') {
        navigate('/account', { replace: true })
        return
      }
      if (action.type === 'fork' && action.sourceSlug) {
        const migrated = forks.find((f) => f.source_slug === action.sourceSlug)
        if (migrated?.slug) {
          navigate(`/sketches/${migrated.slug}/edit`, { replace: true })
          return
        }
        try {
          const fork = await forkSketch(action.sourceSlug)
          navigate(`/sketches/${fork.slug}/edit`, { replace: true })
        } catch {
          navigate(`/sketches/${action.sourceSlug}`, { replace: true })
        }
        return
      }
      if (action.type === 'save' || action.type === 'sandbox') {
        const clientId = action.type === 'save' ? action.clientId : undefined
        const mapped =
          (clientId && sketches.find((s) => s.client_id === clientId)) ||
          sketches[0]
        if (mapped?.slug) {
          navigate(`/sketches/${mapped.slug}/edit`, { replace: true })
          return
        }
        if (action.type === 'save' && action.sourceSlug) {
          navigate(`/sketches/${action.sourceSlug}/edit`, { replace: true })
        }
      }
    },
    [navigate],
  )

  // Listen for embed / sketch score posts
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type !== 'sketches101-score' && data.type !== 'sketch-score') return
      const game = String(data.game || data.gameId || 'sandbox-score')
      const score = Number(data.score)
      if (!Number.isFinite(score)) return
      void recordScore({
        game,
        score,
        played_at: new Date().toISOString(),
        meta:
          data.meta && typeof data.meta === 'object'
            ? (data.meta as Record<string, unknown>)
            : {},
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [recordScore])

  // After auth: migrate guest data once, then resume pending action.
  useEffect(() => {
    if (!isReady || authLoading || !isAuthenticated || !guest) return
    if (migrateRanFor.current === guest.guestId || migrateInFlight.current) return

    const guestSnapshot = guest
    let cancelled = false
    migrateInFlight.current = true
    setMigrating(true)
    setMigrateError(null)
    setAuthGateOpen(false)
    setKeepScore(null)
    ;(async () => {
      try {
        const result = await migrateGuest({
          guest_id: guestSnapshot.guestId,
          display_name: guestSnapshot.displayName,
          drafts: guestSnapshot.drafts,
          scores: guestSnapshot.gameHistory,
          pending_forks: guestSnapshot.pendingForks,
        })
        if (cancelled) return
        migrateRanFor.current = guestSnapshot.guestId
        await markGuestMigrated(guestSnapshot)
        setGuest(null)
        await refresh()
        const action = takePendingAction()
        await resumePending(
          action,
          result.sketches || [],
          result.forks || [],
        )
      } catch (err) {
        migrateRanFor.current = null
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : 'Could not move guest data to your account. Try again.'
          setMigrateError(message)
          setAuthGateOpen(true)
          setAuthReason(
            'We could not sync your guest drafts and scores. Sign in again or retry.',
          )
        }
      } finally {
        migrateInFlight.current = false
        if (!cancelled) setMigrating(false)
      }
    })()

    return () => {
      cancelled = true
      migrateInFlight.current = false
    }
  }, [
    isReady,
    authLoading,
    isAuthenticated,
    guest,
    refresh,
    takePendingAction,
    resumePending,
    migrateAttempt,
  ])

  useEffect(() => {
    if (
      !isReady ||
      authLoading ||
      !isAuthenticated ||
      guest ||
      migrateInFlight.current
    ) {
      return
    }
    const action = readPendingAction()
    if (!action) return
    writePendingAction(null)
    void resumePending(action, [], [])
  }, [isReady, authLoading, isAuthenticated, guest, resumePending])

  const handleGoogle = useCallback(
    async (credential: string) => {
      try {
        await loginWithGoogle(credential)
        setAuthGateOpen(false)
      } catch {
        /* AuthGate stays open; user can try email */
      }
    },
    [loginWithGoogle],
  )

  const showNameGate =
    isReady && !authLoading && !isAuthenticated && guest === null && !migrating

  const value = useMemo(
    () => ({
      guest,
      isReady,
      isGuest: Boolean(guest) && !isAuthenticated,
      requireAuth,
      setAuthGateOpen,
      authGateOpen,
      saveDraft,
      getDraft,
      recordScore,
      refreshGuest,
      clearGuest,
      takePendingAction,
      migrating,
      migrateError,
    }),
    [
      guest,
      isReady,
      isAuthenticated,
      requireAuth,
      authGateOpen,
      saveDraft,
      getDraft,
      recordScore,
      refreshGuest,
      clearGuest,
      takePendingAction,
      migrating,
      migrateError,
    ],
  )

  return (
    <GuestContext.Provider value={value}>
      {children}
      <GuestNameGate open={showNameGate} onSubmit={(name) => void createGuest(name)} />
      <KeepScoreGate
        open={Boolean(keepScore) && !isAuthenticated && !authGateOpen}
        game={keepScore?.game || ''}
        score={keepScore?.score || 0}
        onKeep={() => {
          if (!keepScore) return
          requireAuth({
            type: 'claim_score',
            game: keepScore.game,
            score: keepScore.score,
          })
          setKeepScore(null)
        }}
        onDismiss={() => setKeepScore(null)}
      />
      <AuthGate
        open={
          (authGateOpen && !isAuthenticated) ||
          Boolean(migrateError && isAuthenticated)
        }
        reason={migrateError || authReason}
        googleClientId={GOOGLE_CLIENT_ID || undefined}
        onClose={() => {
          setAuthGateOpen(false)
          setMigrateError(null)
        }}
        onGoogleCredential={(cred) => {
          void handleGoogle(cred)
        }}
        migrateError={migrateError}
        onRetryMigrate={
          migrateError
            ? () => {
                migrateRanFor.current = null
                setMigrateError(null)
                setMigrateAttempt((n) => n + 1)
              }
            : undefined
        }
      />
    </GuestContext.Provider>
  )
}

export function useGuest() {
  const ctx = useContext(GuestContext)
  if (!ctx) throw new Error('useGuest must be used within GuestProvider')
  return ctx
}
