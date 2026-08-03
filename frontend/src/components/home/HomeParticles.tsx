import { useEffect, useRef } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { prefersReducedMotion } from '@/lib/utils'

type Node = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

const SPEED_MIN = 0.12
const SPEED_MAX = 0.38
const REPEL_DIST = 56
const REPEL_STRENGTH = 0.045
const MAX_SPEED = 0.55
const DAMPING = 0.992
const WANDER = 0.018
const MOUSE_REPEL_DIST = 140
const MOUSE_REPEL_STRENGTH = 0.085
const MAX_DIST = 140
/** One particle roughly per this many CSS px² */
const PX_PER_PARTICLE = 12_000
const MIN_PARTICLES = 24
const MAX_PARTICLES = 140

function randomSlowVelocity(): { vx: number; vy: number } {
  const angle = Math.random() * Math.PI * 2
  const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  }
}

function clampSpeed(n: Node) {
  const s = Math.hypot(n.vx, n.vy)
  if (s > MAX_SPEED && s > 0) {
    const k = MAX_SPEED / s
    n.vx *= k
    n.vy *= k
  }
}

function particleCount(width: number, height: number) {
  const area = Math.max(0, width) * Math.max(0, height)
  return Math.min(
    MAX_PARTICLES,
    Math.max(MIN_PARTICLES, Math.round(area / PX_PER_PARTICLE)),
  )
}

/**
 * Home hero particle network: slow random drift, soft mutual repulsion,
 * and cursor repulsion. Density scales with canvas size; same motion on
 * every viewport. Light theme uses a deeper purple so dots pop.
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
    const repelDist2 = REPEL_DIST * REPEL_DIST
    const mouseRepelDist2 = MOUSE_REPEL_DIST * MOUSE_REPEL_DIST
    let nodes: Node[] = []
    let W = 0
    let H = 0
    let dpr = 1
    let raf = 0
    let alive = true
    let mouseX = 0
    let mouseY = 0
    let mouseActive = false

    function palette() {
      if (theme === 'light') {
        return {
          bg: [248, 250, 252] as const,
          // Deeper than brand #7B61FF so dots/lines read clearly on light bg
          col: [72, 42, 210] as const,
          dotA: 0.62,
          lineA: 0.16,
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
      const n = particleCount(W, H)
      nodes = []
      for (let i = 0; i < n; i += 1) {
        const { vx, vy } = randomSlowVelocity()
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx,
          vy,
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

    function applyRepulsion() {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 === 0 || d2 > repelDist2) continue
          const dist = Math.sqrt(d2)
          const force =
            ((REPEL_DIST - dist) / REPEL_DIST) * REPEL_STRENGTH
          const nx = dx / dist
          const ny = dy / dist
          a.vx += nx * force
          a.vy += ny * force
          b.vx -= nx * force
          b.vy -= ny * force
        }
      }
    }

    function applyMouseRepulsion() {
      if (!mouseActive) return
      for (const n of nodes) {
        const dx = n.x - mouseX
        const dy = n.y - mouseY
        const d2 = dx * dx + dy * dy
        if (d2 === 0 || d2 > mouseRepelDist2) continue
        const dist = Math.sqrt(d2)
        const force =
          ((MOUSE_REPEL_DIST - dist) / MOUSE_REPEL_DIST) *
          MOUSE_REPEL_STRENGTH
        n.vx += (dx / dist) * force
        n.vy += (dy / dist) * force
      }
    }

    function syncMouse(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        mouseActive = false
        return
      }
      mouseX = ((clientX - rect.left) / rect.width) * W
      mouseY = ((clientY - rect.top) / rect.height) * H
      mouseActive =
        mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H
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

      applyRepulsion()
      applyMouseRepulsion()

      for (const n of nodes) {
        n.vx *= DAMPING
        n.vy *= DAMPING

        n.vx += (Math.random() - 0.5) * WANDER
        n.vy += (Math.random() - 0.5) * WANDER

        const speed = Math.hypot(n.vx, n.vy)
        if (speed < SPEED_MIN * 0.85) {
          const kick = randomSlowVelocity()
          n.vx += kick.vx * 0.35
          n.vy += kick.vy * 0.35
        }

        clampSpeed(n)
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

    const onMouseMove = (e: MouseEvent) => syncMouse(e.clientX, e.clientY)
    const onMouseLeave = () => {
      mouseActive = false
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return
      syncMouse(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onTouchEnd = () => {
      mouseActive = false
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
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
