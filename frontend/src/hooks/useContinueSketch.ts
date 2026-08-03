import { useQuery } from '@tanstack/react-query'
import { getAccountSketches } from '@/api/sketches'
import { useAuth } from '@/auth/AuthProvider'
import type { SketchCard } from '@/types/sketch'

/** Most recently updated account sketch (draft preferred when tied). */
export function useContinueSketch() {
  const { isAuthenticated } = useAuth()
  const query = useQuery({
    queryKey: ['account-sketches', 'continue'],
    queryFn: getAccountSketches,
    enabled: isAuthenticated,
    staleTime: 30_000,
  })

  const continueSketch: SketchCard | null =
    query.data?.results?.[0] ?? null

  return {
    continueSketch,
    isPending: query.isPending && isAuthenticated,
    account: query.data ?? null,
  }
}
