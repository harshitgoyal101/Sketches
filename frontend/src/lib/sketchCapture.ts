import { toEmbedSrc } from '@/lib/utils'

/** Matches gallery card aspect-[16/10] and capture quality. */
export const THUMBNAIL_CAPTURE_SIZE = { width: 1280, height: 800 } as const

/** Matches mobile `.sketch-app-icon` / server APP_ICON_SIZE (192×192). */
export const APP_ICON_CAPTURE_SIZE = { width: 512, height: 512 } as const
export const APP_ICON_OUTPUT_SIZE = 192

const DEFAULT_TIMEOUT_MS = 20_000
const CAPTURE_MESSAGE = 'sketches-capture'
const CAPTURE_ERROR_MESSAGE = 'sketches-capture-error'

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
          return
        }
        reject(new Error('Could not export the preview canvas.'))
      }, 'image/png')
    } catch (error) {
      reject(error)
    }
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl)
  if (!match) {
    throw new Error('Could not decode captured image.')
  }
  const mime = match[1] || 'image/png'
  const isBase64 = Boolean(match[2])
  const data = match[3]
  if (isBase64) {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  }
  return new Blob([decodeURIComponent(data)], { type: mime })
}

/** Center-crop + resize for square app icons so output matches UI (192×192). */
export async function blobToSquareIcon(
  blob: Blob,
  size = APP_ICON_OUTPUT_SIZE,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = Math.floor((bitmap.width - side) / 2)
  const sy = Math.floor((bitmap.height - side) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare app icon.')
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()
  return canvasToBlob(canvas)
}

export function fullscreenEmbedSrc(embedUrl: string): string {
  const src = toEmbedSrc(embedUrl)
  try {
    const parsed = new URL(src, window.location.origin)
    parsed.searchParams.set('fullscreen', '1')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    const join = src.includes('?') ? '&' : '?'
    return `${src}${join}fullscreen=1`
  }
}

/**
 * Inject forced viewport metrics + a postMessage capture bridge.
 *
 * Many sketches call createCanvas(windowWidth, windowHeight). Capture iframes
 * often report 0×0 until (or unless) layout runs, which yields no usable canvas.
 */
function injectCaptureBridge(
  html: string,
  size: { width: number; height: number },
  timeoutMs: number,
): string {
  const inject = `
<style id="sketches-capture-chrome">
html, body {
  width: ${size.width}px !important;
  height: ${size.height}px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}
</style>
<script id="sketches-capture-viewport">
(function (w, h) {
  function force(obj, prop, value) {
    try {
      Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: true,
        get: function () { return value; },
      });
    } catch (err) {}
  }
  force(window, "innerWidth", w);
  force(window, "innerHeight", h);
  force(window, "outerWidth", w);
  force(window, "outerHeight", h);
  try {
    force(document.documentElement, "clientWidth", w);
    force(document.documentElement, "clientHeight", h);
  } catch (err) {}
})(${size.width}, ${size.height});
</script>
<script id="sketches-capture-bridge">
(function () {
  var started = Date.now();
  var timeoutMs = ${timeoutMs};
  var stable = 0;
  var done = false;
  var MSG = ${JSON.stringify(CAPTURE_MESSAGE)};
  var ERR = ${JSON.stringify(CAPTURE_ERROR_MESSAGE)};

  function send(type, payload) {
    if (done) return;
    done = true;
    try {
      parent.postMessage(Object.assign({ type: type }, payload || {}), "*");
    } catch (err) {}
  }

  function findCanvas() {
    var list = document.querySelectorAll("canvas");
    var best = null;
    for (var i = 0; i < list.length; i += 1) {
      var c = list[i];
      if (!c || c.width < 1 || c.height < 1) continue;
      if (!best || c.width * c.height > best.width * best.height) best = c;
    }
    return best;
  }

  function nudgeResize() {
    try {
      if (typeof windowResized === "function") windowResized();
    } catch (err) {}
    try {
      if (typeof resizeCanvas === "function") {
        resizeCanvas(${size.width}, ${size.height});
      }
    } catch (err) {}
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (err) {}
  }

  function tick() {
    if (done) return;
    var canvas = findCanvas();
    if (canvas) {
      stable += 1;
      if (stable >= 10) {
        try {
          send(MSG, { dataUrl: canvas.toDataURL("image/png") });
        } catch (err) {
          send(ERR, { message: (err && err.message) || "Could not read sketch pixels." });
        }
        return;
      }
    } else {
      stable = 0;
      if (Date.now() - started > 600) nudgeResize();
    }
    if (Date.now() - started > timeoutMs) {
      send(ERR, {
        message: "Preview canvas was not ready. Open the editor, confirm the sketch runs, then try again.",
      });
      return;
    }
    requestAnimationFrame(tick);
  }

  function start() {
    nudgeResize();
    requestAnimationFrame(tick);
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  // Parent-side timer is the authority; this is a safety net inside the frame.
  setTimeout(function () {
    send(ERR, {
      message: "Preview canvas was not ready. Open the editor, confirm the sketch runs, then try again.",
    });
  }, timeoutMs + 500);
})();
</script>`

  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${inject}`)
  }
  if (html.includes('</head>')) {
    return html.replace('</head>', `${inject}</head>`)
  }
  return `${inject}${html}`
}

async function fetchCaptureHtml(embedUrl: string): Promise<string> {
  const src = fullscreenEmbedSrc(embedUrl)
  const response = await fetch(src, {
    credentials: 'include',
    headers: { Accept: 'text/html' },
  })
  if (!response.ok) {
    throw new Error(
      `Could not load sketch preview (${response.status}). Save the sketch, then try again.`,
    )
  }
  const html = await response.text()
  if (!html.includes('<html') && !html.includes('p5') && !html.includes('Processing')) {
    throw new Error('Preview response did not look like a sketch page.')
  }
  return html
}

/**
 * Capture a sketch preview frame as a PNG blob.
 *
 * Fetches the preview HTML (with cookies), forces a known viewport for
 * windowWidth/windowHeight sketches, renders via srcdoc, and receives pixels
 * through postMessage from an injected bridge.
 */
export async function captureFromEmbedUrl(
  embedUrl: string,
  size: { width: number; height: number } = THUMBNAIL_CAPTURE_SIZE,
): Promise<Blob> {
  const rawHtml = await fetchCaptureHtml(embedUrl)
  const html = injectCaptureBridge(rawHtml, size, DEFAULT_TIMEOUT_MS)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Sketch capture')
  iframe.setAttribute('width', String(size.width))
  iframe.setAttribute('height', String(size.height))
  // Must stay in the viewport so the frame is painted and rAF keeps running.
  iframe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${size.width}px`,
    `height:${size.height}px`,
    'border:0',
    'opacity:0.02',
    'pointer-events:none',
    'z-index:2147483000',
  ].join(';')

  document.body.appendChild(iframe)

  try {
    const result = await new Promise<string>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup()
        reject(
          new Error(
            'Preview canvas was not ready. Open the editor, confirm the sketch runs, then try again.',
          ),
        )
      }, DEFAULT_TIMEOUT_MS + 1_000)

      function onMessage(event: MessageEvent) {
        if (event.source !== iframe.contentWindow) return
        const data = event.data
        if (!data || typeof data !== 'object') return
        if (data.type === CAPTURE_MESSAGE && typeof data.dataUrl === 'string') {
          cleanup()
          resolve(data.dataUrl)
          return
        }
        if (data.type === CAPTURE_ERROR_MESSAGE) {
          cleanup()
          reject(
            new Error(
              typeof data.message === 'string'
                ? data.message
                : 'Preview canvas was not ready.',
            ),
          )
        }
      }

      function cleanup() {
        window.clearTimeout(timer)
        window.removeEventListener('message', onMessage)
      }

      window.addEventListener('message', onMessage)
      iframe.srcdoc = html
    })

    return dataUrlToBlob(result)
  } finally {
    iframe.remove()
  }
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || 'image/png' })
}
