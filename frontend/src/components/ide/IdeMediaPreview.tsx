import type { SketchMediaFile } from '@/types/sketch'

type IdeMediaPreviewProps = {
  media: SketchMediaFile
}

function formatBytes(size: number) {
  if (!size || size < 1024) return `${size || 0} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function IdeMediaPreview({ media }: IdeMediaPreviewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-auto p-6 text-center">
      <p className="font-mono text-xs text-muted">{media.filename}</p>
      {media.kind === 'image' ? (
        <img
          src={media.url}
          alt={media.filename}
          className="max-h-[min(28rem,60vh)] max-w-full object-contain"
        />
      ) : (
        <audio controls src={media.url} className="w-full max-w-md">
          <track kind="captions" />
        </audio>
      )}
      <p className="text-xs text-muted">
        {media.kind} · {formatBytes(media.size)}
        {media.content_type ? ` · ${media.content_type}` : ''}
      </p>
      <p className="max-w-sm text-xs text-muted">
        Use as{' '}
        <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px]">
          {media.filename}
        </code>{' '}
        in loadImage / loadSound / loadAudio.
      </p>
    </div>
  )
}
