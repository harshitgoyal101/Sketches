import { useEffect, useRef } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { prefersReducedMotion } from '@/lib/utils'

type Orb = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  a: number
}

/**
 * Soft mouse-reactive atmosphere behind sketch detail content.
 */
export function SketchDetailAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const el = canvasRef.current
    const context = el?.getContext('2d')
    if (!el || !context) return
    const canvas = el
    const ctx = context

    const reduced = prefersReducedMotion()
    let W = 0
    let H = 0
    let raf = 0
    let alive = true
    let mouseX = 0.5
    let mouseY = 0.35
    let targetX = 0.5
    let targetY = 0.35
    const orbs: Orb[] = []

    function seedOrbs() {
      orbs.length = 0
      const n = Math.max(4, Math.min(9, Math.round((W * H) / 180_000)))
      for (let i = 0; i < n; i += 1) {
        orbs.push({
          x: Math.random(),
          y: Math.random(),
          r: 0.12 + Math.random() * 0.22,
          vx: (Math.random() - 0.5) * 0.00035,
          vy: (Math.random() - 0.5) * 0.00035,
          a: 0.04 + Math.random() * 0.07,
        })
      }
    }

    function resize() {
      const parent = canvas.parentElement
      const nextW = parent?.offsetWidth || window.innerWidth
      const nextH = parent?.offsetHeight || window.innerHeight
      if (nextW === W && nextH === H && orbs.length) return
      W = nextW
      H = nextH
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!orbs.length) seedOrbs()
    }

    function palette() {
      if (theme === 'light') {
        return {
          clear: 'rgba(248, 250, 252, 0.55)',
          orb: [91, 53, 240] as const,
          glow: [123, 97, 255] as const,
        }
      }
      return {
        clear: 'rgba(13, 13, 13, 0.42)',
        orb: [123, 97, 255] as const,
        glow: [180, 160, 255] as const,
      }
    }

    function draw() {
      const p = palette()
      ctx.fillStyle = p.clear
      ctx.fillRect(0, 0, W, H)

      mouseX += (targetX - mouseX) * 0.06
      mouseY += (targetY - mouseY) * 0.06

      const gx = mouseX * W
      const gy = mouseY * H
      const [gr, gg, gb] = p.glow
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.45)
      glow.addColorStop(0, `rgba(${gr},${gg},${gb},0.14)`)
      glow.addColorStop(0.45, `rgba(${gr},${gg},${gb},0.04)`)
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      const [or, og, ob] = p.orb
      for (const o of orbs) {
        if (!reduced) {
          o.x += o.vx
          o.y += o.vy
          if (o.x < -0.2 || o.x > 1.2) o.vx *= -1
          if (o.y < -0.2 || o.y > 1.2) o.vy *= -1
        }
        const cx = o.x * W
        const cy = o.y * H
        const radius = o.r * Math.min(W, H)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        g.addColorStop(0, `rgba(${or},${og},${ob},${o.a})`)
        g.addColorStop(1, `rgba(${or},${og},${ob},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function tick() {
      if (!alive) return
      raf = requestAnimationFrame(tick)
      draw()
    }

    resize()
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(resize)
        : null
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement)
    window.addEventListener('resize', resize)

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      targetX = (e.clientX - rect.left) / rect.width
      targetY = (e.clientY - rect.top) / rect.height
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    if (reduced) {
      draw()
    } else {
      raf = requestAnimationFrame(tick)
    }

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  )
}
