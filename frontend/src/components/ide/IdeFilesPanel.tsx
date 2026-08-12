import { useEffect, useRef, useState } from 'react'
import {
  Image as ImageIcon,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IdeFile } from './ideFiles'
import type { SketchMediaFile } from '@/types/sketch'

const MEDIA_ACCEPT =
  'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.ogg,.m4a'

type IdeFilesPanelProps = {
  files: IdeFile[]
  media?: SketchMediaFile[]
  activeFilename: string
  filesOpen: boolean
  onToggle: (open: boolean) => void
  onSelect: (filename: string) => void
  onAdd: () => void
  onUpload?: (files: FileList) => void
  onRename: (from: string, to: string) => boolean | void
  onDelete: (filename: string) => void
  onRenameMedia?: (from: string, to: string) => boolean | void | Promise<boolean | void>
  onDeleteMedia?: (filename: string) => void
  uploading?: boolean
  onRenameError?: (message: string | null) => void
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
}

export function IdeFilesPanel({
  files,
  media = [],
  activeFilename,
  filesOpen,
  onToggle,
  onSelect,
  onAdd,
  onUpload,
  onRename,
  onDelete,
  onRenameMedia,
  onDeleteMedia,
  uploading = false,
  onRenameError,
}: IdeFilesPanelProps) {
  const [renamingFilename, setRenamingFilename] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [renamingMedia, setRenamingMedia] = useState(false)
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const skipRenameCommit = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!renamingFilename) return
    const id = window.requestAnimationFrame(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(id)
  }, [renamingFilename])

  useEffect(() => {
    if (!filesOpen || !isMobileViewport()) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onToggle(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filesOpen, onToggle])

  function startRename(filename: string, isMain: boolean, isMedia = false) {
    if (isMain) return
    setRenamingFilename(filename)
    setRenameDraft(filename)
    setRenamingMedia(isMedia)
    onRenameError?.(null)
  }

  async function commitRename() {
    if (skipRenameCommit.current) {
      skipRenameCommit.current = false
      setRenamingFilename(null)
      setRenamingMedia(false)
      return
    }
    if (!renamingFilename) return
    const trimmed = renameDraft.trim()
    if (!trimmed || trimmed === renamingFilename) {
      setRenamingFilename(null)
      setRenamingMedia(false)
      return
    }
    const nameTaken =
      files.some((f) => f.filename === trimmed) ||
      media.some((m) => m.filename === trimmed)
    if (nameTaken) {
      onRenameError?.('A file with that name already exists.')
      renameInputRef.current?.select()
      return
    }
    if (renamingMedia) {
      const ok = await onRenameMedia?.(renamingFilename, trimmed)
      if (ok === false) {
        renameInputRef.current?.select()
        return
      }
    } else {
      const target = files.find((f) => f.filename === renamingFilename)
      if (!target || target.is_main) {
        setRenamingFilename(null)
        setRenamingMedia(false)
        return
      }
      const ok = onRename(renamingFilename, trimmed)
      if (ok === false) {
        renameInputRef.current?.select()
        return
      }
    }
    setRenamingFilename(null)
    setRenamingMedia(false)
    onRenameError?.(null)
  }

  function selectFile(filename: string) {
    onSelect(filename)
    if (isMobileViewport()) onToggle(false)
  }

  if (!filesOpen) {
    return (
      <div className="hidden shrink-0 flex-col items-center border-border bg-surface py-2 lg:flex lg:w-9 lg:border-r">
        <button
          type="button"
          onClick={() => onToggle(true)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-btn text-foreground/70 hover:bg-primary/10 hover:text-primary"
          aria-label="Show files panel"
          title="Show files"
        >
          <PanelLeftOpen size={15} aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-30 bg-black/45 lg:hidden"
        aria-label="Close files sidebar"
        onClick={() => onToggle(false)}
      />
      <aside
        className={cn(
          'absolute inset-y-0 left-0 z-40 flex w-[min(15.5rem,86vw)] flex-col text-foreground',
          'border-r border-border bg-surface shadow-[8px_0_28px_-16px_rgba(0,0,0,0.35)]',
          'lg:static lg:z-auto lg:w-[13rem] lg:shadow-none',
        )}
        aria-label="Files"
      >
        <div className="flex h-full min-h-0 flex-col p-2">
          <div className="mb-2 flex shrink-0 items-center gap-1 px-0.5">
            <p className="min-w-0 flex-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/65">
              Files
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-6 cursor-pointer items-center gap-0.5 rounded-btn px-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              title="Add code file"
            >
              <Plus size={12} aria-hidden />
              <span>Add</span>
            </button>
            {onUpload ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={MEDIA_ACCEPT}
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const list = e.target.files
                    if (list && list.length > 0) onUpload(list)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex h-6 cursor-pointer items-center gap-0.5 rounded-btn px-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Upload images or audio"
                >
                  <Upload size={12} aria-hidden />
                  <span>{uploading ? '…' : 'Upload'}</span>
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => onToggle(false)}
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-btn text-foreground/65 hover:bg-background hover:text-foreground"
              aria-label="Hide files panel"
              title="Hide files"
            >
              <PanelLeftClose size={14} aria-hidden />
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {files.map((file) => {
              const active = file.filename === activeFilename
              const renaming = renamingFilename === file.filename && !renamingMedia
              return (
                <li key={`code:${file.filename}`} className="group/file">
                  <div
                    className={cn(
                      'flex items-center gap-0.5 rounded-btn border transition-colors',
                      active || renaming
                        ? 'border-primary/35 bg-primary/12'
                        : 'border-transparent hover:border-border hover:bg-background',
                    )}
                  >
                    {renaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => void commitRename()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void commitRename()
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            skipRenameCommit.current = true
                            setRenamingFilename(null)
                            setRenamingMedia(false)
                            onRenameError?.(null)
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-xs text-foreground outline-none"
                        aria-label="Rename file"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectFile(file.filename)}
                        onDoubleClick={() => startRename(file.filename, file.is_main, false)}
                        className={cn(
                          'flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left',
                          active
                            ? 'text-primary'
                            : 'text-foreground/80 group-hover/file:text-foreground',
                        )}
                      >
                        <span className="truncate font-mono text-xs">{file.filename}</span>
                        {file.is_main ? (
                          <span className="shrink-0 text-[10px] uppercase text-foreground/55">
                            main
                          </span>
                        ) : null}
                      </button>
                    )}
                    {!file.is_main && !renaming ? (
                      <div className="mr-0.5 flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelect(file.filename)
                            startRename(file.filename, false, false)
                          }}
                          className={cn(
                            'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-btn text-foreground/55',
                            'opacity-100 hover:bg-primary/15 hover:text-primary sm:opacity-0 sm:group-hover/file:opacity-100 sm:focus-visible:opacity-100',
                            active && 'sm:opacity-100',
                          )}
                          aria-label={`Rename ${file.filename}`}
                          title={`Rename ${file.filename}`}
                        >
                          <Pencil size={11} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(file.filename)
                          }}
                          className={cn(
                            'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-btn text-foreground/55',
                            'opacity-100 hover:bg-destructive/15 hover:text-destructive sm:opacity-0 sm:group-hover/file:opacity-100 sm:focus-visible:opacity-100',
                            active && 'sm:opacity-100',
                          )}
                          aria-label={`Delete ${file.filename}`}
                          title={`Delete ${file.filename}`}
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
            {media.length > 0 ? (
              <li className="px-1.5 pb-0.5 pt-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/55">
                  Media
                </p>
              </li>
            ) : null}
            {media.map((item) => {
              const active = item.filename === activeFilename
              const renaming = renamingFilename === item.filename && renamingMedia
              const Icon = item.kind === 'audio' ? Music : ImageIcon
              return (
                <li key={`media:${item.filename}`} className="group/file">
                  <div
                    className={cn(
                      'flex items-center gap-0.5 rounded-btn border transition-colors',
                      active || renaming
                        ? 'border-primary/35 bg-primary/12'
                        : 'border-transparent hover:border-border hover:bg-background',
                    )}
                  >
                    {renaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => void commitRename()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void commitRename()
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            skipRenameCommit.current = true
                            setRenamingFilename(null)
                            setRenamingMedia(false)
                            onRenameError?.(null)
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-xs text-foreground outline-none"
                        aria-label="Rename media file"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectFile(item.filename)}
                        onDoubleClick={() => startRename(item.filename, false, true)}
                        className={cn(
                          'flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left',
                          active
                            ? 'text-primary'
                            : 'text-foreground/80 group-hover/file:text-foreground',
                        )}
                      >
                        <Icon size={12} className="shrink-0 opacity-70" aria-hidden />
                        <span className="truncate font-mono text-xs">{item.filename}</span>
                      </button>
                    )}
                    {!renaming ? (
                      <div className="mr-0.5 flex shrink-0 items-center">
                        {onRenameMedia ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(item.filename)
                              startRename(item.filename, false, true)
                            }}
                            className={cn(
                              'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-btn text-foreground/55',
                              'opacity-100 hover:bg-primary/15 hover:text-primary sm:opacity-0 sm:group-hover/file:opacity-100 sm:focus-visible:opacity-100',
                              active && 'sm:opacity-100',
                            )}
                            aria-label={`Rename ${item.filename}`}
                            title={`Rename ${item.filename}`}
                          >
                            <Pencil size={11} aria-hidden />
                          </button>
                        ) : null}
                        {onDeleteMedia ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteMedia(item.filename)
                            }}
                            className={cn(
                              'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-btn text-foreground/55',
                              'opacity-100 hover:bg-destructive/15 hover:text-destructive sm:opacity-0 sm:group-hover/file:opacity-100 sm:focus-visible:opacity-100',
                              active && 'sm:opacity-100',
                            )}
                            aria-label={`Delete ${item.filename}`}
                            title={`Delete ${item.filename}`}
                          >
                            <Trash2 size={12} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </>
  )
}
