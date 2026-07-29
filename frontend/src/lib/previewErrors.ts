export type PreviewRuntimeError = {
  message: string
  source?: string | null
  line?: number | null
  col?: number | null
  stack?: string | null
  kind?: string
}

export const PROCESSING_IN_P5_MESSAGE = [
  'This code uses Processing (.pde) syntax, but the sketch is set to p5.js.',
  '',
  'For p5.js, write:',
  '  function setup() { createCanvas(400, 400); }',
  '  function draw() { background(9); }',
  '',
  'Or create a new Processing sketch and paste this code there.',
].join('\n')

export function looksLikeProcessingSyntax(code: string): boolean {
  if (!code.trim()) return false
  return (
    /\bvoid\s+(setup|draw)\s*\(/.test(code) ||
    (/\bsize\s*\(/.test(code) && !/\bcreateCanvas\s*\(/.test(code))
  )
}

export function formatPreviewError(err: PreviewRuntimeError): string {
  const parts = [err.message]
  if (err.source || err.line != null) {
    const loc = [err.source, err.line != null ? `line ${err.line}` : null, err.col != null ? `col ${err.col}` : null]
      .filter(Boolean)
      .join(', ')
    if (loc) parts.push(loc)
  }
  if (err.stack) parts.push(err.stack)
  return parts.join('\n')
}

export function resolvePreviewError(
  data: PreviewRuntimeError,
  sketchType: string,
  mainCode: string,
): PreviewRuntimeError {
  if (
    sketchType === 'p5js' &&
    looksLikeProcessingSyntax(mainCode) &&
    /SyntaxError|Unexpected token/i.test(data.message || '')
  ) {
    return { message: PROCESSING_IN_P5_MESSAGE, kind: 'processing-mismatch' }
  }
  return data
}
