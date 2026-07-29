import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HomeParticles } from '@/components/home/HomeParticles'
import { useTheme } from '@/theme/ThemeProvider'
import type { HomeBackgroundSketch } from '@/types/sketch'

function toEmbedPath(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

type LandingHeroBackgroundProps = {
  dark: HomeBackgroundSketch
  light: HomeBackgroundSketch
}

export function LandingHeroBackground({ dark, light }: LandingHeroBackgroundProps) {
  const { theme } = useTheme()
  const darkRef = useRef<HTMLIFrameElement | null>(null)
  const lightRef = useRef<HTMLIFrameElement | null>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : true,
  )

  const darkSrc = useMemo(() => (dark ? toEmbedPath(dark.embed_url) : null), [dark])
  const lightSrc = useMemo(
    () => (light ? toEmbedPath(light.embed_url) : null),
    [light],
  )

  const hasSketch = Boolean(darkSrc || lightSrc)
  const useParticles = isMobile || !hasSketch
  const activeTheme: 'dark' | 'light' = theme === 'light' ? 'light' : 'dark'

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const wakeSketch = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe?.contentWindow) return
    try {
      iframe.contentWindow.dispatchEvent(new Event('resize'))
    } catch {
      /* ignore */
    }
    iframe.contentWindow.postMessage({ type: 'sketch-restart' }, '*')
  }, [])

  const resolveActive = useCallback(() => {
    if (activeTheme === 'light') {
      if (lightSrc && lightRef.current) return lightRef.current
      if (darkRef.current) return darkRef.current
    }
    if (darkSrc && darkRef.current) return darkRef.current
    return lightRef.current
  }, [activeTheme, darkSrc, lightSrc])

  useEffect(() => {
    if (useParticles) return

    const frames: { el: HTMLIFrameElement | null; src: string | null; on: boolean }[] = [
      {
        el: darkRef.current,
        src: darkSrc,
        on: activeTheme === 'dark' || (!lightSrc && Boolean(darkSrc)),
      },
      {
        el: lightRef.current,
        src: lightSrc,
        on: activeTheme === 'light' && Boolean(lightSrc),
      },
    ]

    // If only light exists and theme is dark, show light
    if (!darkSrc && lightSrc) {
      frames[1].on = true
      frames[0].on = false
    }

    for (const frame of frames) {
      if (!frame.el || !frame.src) continue
      frame.el.classList.toggle('is-active', frame.on)
      if (frame.on && !frame.el.getAttribute('src')) {
        frame.el.src = frame.src
      }
    }

    const active = resolveActive()
    requestAnimationFrame(() => {
      wakeSketch(active)
      window.setTimeout(() => wakeSketch(active), 120)
    })
  }, [activeTheme, darkSrc, lightSrc, resolveActive, useParticles, wakeSketch])

  useEffect(() => {
    if (useParticles) return

    function sendPointer(clientX: number, clientY: number, phase: string) {
      const iframe = resolveActive()
      if (!iframe?.contentWindow) return
      const rect = iframe.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      iframe.contentWindow.postMessage(
        {
          type: 'sketch-mouse',
          x: clientX - rect.left,
          y: clientY - rect.top,
          phase,
        },
        '*',
      )
    }

    function isInteractive(target: EventTarget | null) {
      return (
        target instanceof Element &&
        Boolean(
          target.closest(
            'a, button, input, textarea, select, label, summary, [role="button"], [role="link"]',
          ),
        )
      )
    }

    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0

    const onMove = (e: MouseEvent) => sendPointer(e.clientX, e.clientY, 'move')
    const onClick = (e: MouseEvent) => {
      if (isInteractive(e.target)) return
      wakeSketch(resolveActive())
    }
    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches.length) return
      const t = e.touches[0]
      touchStartX = t.clientX
      touchStartY = t.clientY
      touchStartTime = Date.now()
      sendPointer(t.clientX, t.clientY, 'start')
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return
      sendPointer(e.touches[0].clientX, e.touches[0].clientY, 'move')
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (isInteractive(e.target)) return
      const dt = Date.now() - touchStartTime
      const t = e.changedTouches[0]
      if (!t || dt > 350) return
      const dx = t.clientX - touchStartX
      const dy = t.clientY - touchStartY
      if (dx * dx + dy * dy > 100) return
      wakeSketch(resolveActive())
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [resolveActive, useParticles, wakeSketch])

  return (
    <div className="landing-hero-bg" aria-hidden>
      {useParticles ? (
        <HomeParticles />
      ) : (
        <>
          {darkSrc ? (
            <iframe
              ref={darkRef}
              className="home-bg-sketch"
              data-theme-bg="dark"
              title=""
              tabIndex={-1}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : null}
          {lightSrc ? (
            <iframe
              ref={lightRef}
              className="home-bg-sketch"
              data-theme-bg="light"
              title=""
              tabIndex={-1}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : null}
        </>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/35 via-background/15 to-background" />
    </div>
  )
}
