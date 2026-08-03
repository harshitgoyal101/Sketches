import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Turn absolute Django embed URLs into same-origin paths.
 * Needed in Vite dev (5173 → proxies /sketches to 8000) so
 * X-Frame-Options: SAMEORIGIN does not block the iframe.
 */
export function toEmbedSrc(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return url
  }
}

