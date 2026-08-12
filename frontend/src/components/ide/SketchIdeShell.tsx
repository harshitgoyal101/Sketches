import { useEffect, type ReactNode } from 'react'
import { IdeFilesPanel } from '@/components/ide/IdeFilesPanel'
import { IdeWorkspace } from '@/components/ide/IdeWorkspace'
import type { IdeFile } from '@/components/ide/ideFiles'
import { SketchDetailAtmosphere } from '@/components/sketch/SketchDetailAtmosphere'
import type { PreviewRuntimeError } from '@/lib/previewErrors'
import type { SketchMediaFile } from '@/types/sketch'
import { cn } from '@/lib/utils'

type SketchIdeShellProps = {
  eyebrow?: string
  title: string
  onTitleChange: (title: string) => void
  titlePlaceholder?: string
  running: boolean
  previewPaused?: boolean
  status: string | null
  dirty: boolean
  error: string | null
  toolbar: ReactNode
  footer?: ReactNode
  files: IdeFile[]
  media?: SketchMediaFile[]
  activeFilename: string
  filesOpen: boolean
  onFilesOpenChange: (open: boolean) => void
  onSelectFile: (filename: string) => void
  onAddFile: () => void
  onUploadMedia?: (files: FileList) => void
  uploadingMedia?: boolean
  onRenameFile: (from: string, to: string) => boolean | void
  onDeleteFile: (filename: string) => void
  onRenameMedia?: (from: string, to: string) => boolean | void | Promise<boolean | void>
  onDeleteMedia?: (filename: string) => void
  onRenameError?: (message: string | null) => void
  activeFile: IdeFile | null
  activeMedia?: SketchMediaFile | null
  onChangeContent: (content: string) => void
  previewHtml: string | null
  previewNonce: number
  runtimeError: PreviewRuntimeError | null
  onRestart: () => void
  onDismissError: () => void
  onPreviewResizeRestart: () => void
  /** Ctrl/Cmd+S — same action as the Save toolbar button. */
  onSave?: () => void | Promise<void>
  emptyPreviewLabel?: string
  loading?: boolean
  loadingLabel?: string
}

export function SketchIdeShell({
  eyebrow,
  title,
  onTitleChange,
  titlePlaceholder = 'Untitled sketch',
  running,
  previewPaused = false,
  status,
  dirty,
  error,
  toolbar,
  footer,
  files,
  media = [],
  activeFilename,
  filesOpen,
  onFilesOpenChange,
  onSelectFile,
  onAddFile,
  onUploadMedia,
  uploadingMedia = false,
  onRenameFile,
  onDeleteFile,
  onRenameMedia,
  onDeleteMedia,
  onRenameError,
  activeFile,
  activeMedia = null,
  onChangeContent,
  previewHtml,
  previewNonce,
  runtimeError,
  onRestart,
  onDismissError,
  onPreviewResizeRestart,
  onSave,
  emptyPreviewLabel,
  loading = false,
  loadingLabel = 'Loading editor…',
}: SketchIdeShellProps) {
  useEffect(() => {
    if (!onSave) return
    const save = onSave
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      if (e.key.toLowerCase() !== 's') return
      e.preventDefault()
      void save()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSave])

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-background">
      <SketchDetailAtmosphere />

      <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background/55 px-3 py-2 backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {eyebrow ? (
            <p className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-primary sm:block">
              {eyebrow}
            </p>
          ) : null}
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent font-display text-base font-bold text-foreground outline-none placeholder:text-muted focus:ring-0 sm:max-w-sm sm:text-lg"
            aria-label="Sketch title"
            placeholder={titlePlaceholder}
          />
          <span
            className={cn(
              'hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] sm:inline-flex',
              running
                ? 'border-primary/35 text-primary'
                : previewPaused
                  ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                  : 'border-border text-muted',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                running
                  ? 'animate-pulse bg-primary'
                  : previewPaused
                    ? 'bg-amber-500'
                    : 'bg-muted',
              )}
            />
            {running ? 'Updating…' : previewPaused ? 'Paused' : status || 'Live'}
          </span>
          {dirty ? (
            <span className="hidden text-[11px] text-primary md:inline">Unsaved</span>
          ) : null}
          {error ? (
            <span className="truncate text-[11px] text-destructive" role="alert">
              {error}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbar}</div>
      </header>

      {loading ? (
        <p className="relative z-10 px-6 py-16 text-center text-sm text-muted">
          {loadingLabel}
        </p>
      ) : (
        <div className="relative z-10 flex min-h-0 w-full flex-1 overflow-hidden">
          <IdeFilesPanel
            files={files}
            media={media}
            activeFilename={activeFilename}
            filesOpen={filesOpen}
            onToggle={onFilesOpenChange}
            onSelect={onSelectFile}
            onAdd={onAddFile}
            onUpload={onUploadMedia}
            uploading={uploadingMedia}
            onRename={onRenameFile}
            onDelete={onDeleteFile}
            onRenameMedia={onRenameMedia}
            onDeleteMedia={onDeleteMedia}
            onRenameError={onRenameError}
          />
          <IdeWorkspace
            activeFile={activeFile}
            activeMedia={activeMedia}
            onChangeContent={onChangeContent}
            previewHtml={previewHtml}
            previewNonce={previewNonce}
            running={running}
            previewPaused={previewPaused}
            runtimeError={runtimeError}
            onRestart={onRestart}
            onDismissError={onDismissError}
            onPreviewResizeRestart={onPreviewResizeRestart}
            emptyPreviewLabel={emptyPreviewLabel}
            filesOpen={filesOpen}
            onFilesOpenChange={onFilesOpenChange}
          />
        </div>
      )}

      {footer}
    </div>
  )
}
