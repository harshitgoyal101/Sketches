import { useQuery } from '@tanstack/react-query'
import {
  getFormats,
  getHome,
  getSketch,
  getSketches,
  getTags,
  type SketchListParams,
} from '@/api/sketches'

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: getHome,
  })
}

export function useSketches(params: SketchListParams) {
  return useQuery({
    queryKey: ['sketches', params],
    queryFn: () => getSketches(params),
  })
}

export function useSketch(slug: string | undefined) {
  return useQuery({
    queryKey: ['sketch', slug],
    queryFn: () => getSketch(slug!),
    enabled: Boolean(slug),
  })
}

export function useFormats() {
  return useQuery({
    queryKey: ['formats'],
    queryFn: getFormats,
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })
}
