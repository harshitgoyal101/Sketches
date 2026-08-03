export type IdeFile = {
  filename: string
  content: string
  language: string
  is_main: boolean
  asset_type: string
}

export const IDE_FILES_OPEN_KEY = 'sketches101-ide-files-open'
export const IDE_EDITOR_RATIO_KEY = 'sketches101-ide-editor-ratio'
export const IDE_EDITOR_RATIO_MIN = 0.28
export const IDE_EDITOR_RATIO_MAX = 0.72
export const IDE_AUTO_RUN_MS = 450

export function inferAssetType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.pde')) {
    return 'js'
  }
  return 'other'
}

export function languageFromFilename(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.json')) return 'json'
  return 'javascript'
}

export function uniqueFilename(existing: string[], base: string): string {
  if (!existing.includes(base)) return base
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  let n = 2
  while (existing.includes(`${stem}${n}${ext}`)) n += 1
  return `${stem}${n}${ext}`
}

export function readFilesOpenPreference(defaultOpen = true): boolean {
  try {
    const raw = localStorage.getItem(IDE_FILES_OPEN_KEY)
    return raw == null ? defaultOpen : raw === '1'
  } catch {
    return defaultOpen
  }
}

export function writeFilesOpenPreference(open: boolean) {
  try {
    localStorage.setItem(IDE_FILES_OPEN_KEY, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function readEditorRatioPreference(defaultRatio = 0.55): number {
  try {
    const raw = Number(localStorage.getItem(IDE_EDITOR_RATIO_KEY))
    if (
      Number.isFinite(raw) &&
      raw >= IDE_EDITOR_RATIO_MIN &&
      raw <= IDE_EDITOR_RATIO_MAX
    ) {
      return raw
    }
  } catch {
    /* ignore */
  }
  return defaultRatio
}

export function writeEditorRatioPreference(ratio: number) {
  try {
    localStorage.setItem(IDE_EDITOR_RATIO_KEY, String(ratio))
  } catch {
    /* ignore */
  }
}
