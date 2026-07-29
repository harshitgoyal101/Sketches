import { useEffect, useRef } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { prefersReducedMotion } from '@/lib/utils'

type Node = { x: number; y: number; vx: number; vy: number; r: number }

/**
 * Particle-network fallback when no home background sketch is set,
 * or on mobile where live iframes are too expensive.
 */
export function HomeParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const el = canvasRef.current
    const context = el?.getContext('2d')
    if (!el || !context) return
    const canvas: HTMLCanvasElement = el
    const ctx: CanvasRenderingContext2D = context

    const reduced = prefersReducedMotion()
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const N = isMobile ? 28 : 90
    const MAX_DIST = isMobile ? 110 : 150
    let nodes: Node[] = []
    let W = 0
    let H = 0
    let dpr = 1
    let raf = 0
    let alive = true

    function palette() {
      if (theme === 'light') {
        return {
          bg: [248, 250, 252] as const,
          col: [123, 97, 255] as const,
          dotA: 0.35,
          lineA: 0.08,
        }
      }
      return {
        bg: [13, 13, 13] as const,
        col: [255, 255, 255] as const,
        dotA: 0.5,
        lineA: 0.13,
      }
    }

    function targetDpr(width: number, height: number) {
      const native = Math.min(window.devicePixelRatio || 1, 2)
      const area = width * height
      if (area >= 2_073_600) return Math.min(native, 1)
      if (area >= 921_600) return Math.min(native, 1.25)
      if (area >= 480_000) return Math.min(native, 1.5)
      return native
    }

    function initNodes() {
      nodes = []
      for (let i = 0; i < N; i += 1) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: 1.5 + Math.random() * 1.5,
        })
      }
    }

    function resize() {
      const parent = canvas.parentElement
      const nextW = parent ? parent.offsetWidth : canvas.offsetWidth
      const nextH = parent ? parent.offsetHeight : canvas.offsetHeight
      if (nextW === W && nextH === H && nodes.length) return
      W = nextW
      H = nextH
      dpr = targetDpr(W, H)
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initNodes()
    }

    function draw() {
      const p = palette()
      ctx.fillStyle = `rgb(${p.bg[0]},${p.bg[1]},${p.bg[2]})`
      ctx.fillRect(0, 0, W, H)
      const [cr, cg, cb] = p.col

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d2 = dx * dx + dy * dy
          if (d2 > MAX_DIST * MAX_DIST) continue
          const a = (1 - Math.sqrt(d2) / MAX_DIST) * p.lineA
          ctx.beginPath()
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`
          ctx.lineWidth = 0.8
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.stroke()
        }
      }

      ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.dotA})`
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function tick() {
      if (!alive) return
      raf = requestAnimationFrame(tick)
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -10) n.x = W + 10
        else if (n.x > W + 10) n.x = -10
        if (n.y < -10) n.y = H + 10
        else if (n.y > H + 10) n.y = -10
      }
      draw()
    }

    resize()
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(resize)
        : null
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement)
    window.addEventListener('resize', resize)

    if (reduced) {
      draw()
    } else {
      raf = requestAnimationFrame(tick)
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
      } else if (!reduced && alive) {
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  )
}
