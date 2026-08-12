import { useEffect, useId, useMemo } from 'react'
import type { SketchMediaFile } from '@/types/sketch'

type IdeMediaPreviewProps = {
  media: SketchMediaFile
}

function formatBytes(size: number) {
  if (!size || size < 1024) return `${size || 0} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function fontFamilyFromFilename(filename: string) {
  const base = filename.split('/').pop() || filename
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

export function IdeMediaPreview({ media }: IdeMediaPreviewProps) {
  const styleId = useId()
  const family = useMemo(
    () => fontFamilyFromFilename(media.filename),
    [media.filename],
  )

  useEffect(() => {
    if (media.kind !== 'font') return
    const el = document.createElement('style')
    el.id = `ide-font-preview-${styleId}`
    el.textContent = `
      @font-face {
        font-family: ${JSON.stringify(family)};
        src: url(${JSON.stringify(media.url)});
        font-display: swap;
      }
    `
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [family, media.kind, media.url, styleId])

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-auto p-6 text-center">
      <p className="font-mono text-xs text-muted">{media.filename}</p>
      {media.kind === 'image' ? (
        <img
          src={media.url}
          alt={media.filename}
          className="max-h-[min(28rem,60vh)] max-w-full object-contain"
        />
      ) : media.kind === 'audio' ? (
        <audio controls src={media.url} className="w-full max-w-md">
          <track kind="captions" />
        </audio>
      ) : media.kind === 'font' ? (
        <p
          className="max-w-lg text-3xl leading-snug text-foreground"
          style={{ fontFamily: `"${family}", sans-serif` }}
        >
          The quick brown fox jumps over the lazy dog.
        </p>
      ) : (
        <p className="text-sm text-muted">Preview not available for this file type.</p>
      )}
      <p className="text-xs text-muted">
        {media.kind} · {formatBytes(media.size)}
        {media.content_type ? ` · ${media.content_type}` : ''}
      </p>
      <p className="max-w-sm text-xs text-muted">
        {media.kind === 'font' ? (
          <>
            p5: <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px]">loadFont(&apos;{media.filename}&apos;)</code>
            <br />
            Processing:{' '}
            <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px]">
              createFont(&quot;{family}&quot;, 32)
            </code>
          </>
        ) : (
          <>
            Use as{' '}
            <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px]">
              {media.filename}
            </code>{' '}
            in loadImage / loadSound / loadAudio.
          </>
        )}
      </p>
    </div>
  )
}
