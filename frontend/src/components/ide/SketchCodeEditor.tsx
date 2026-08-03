import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { cn } from '@/lib/utils'
import { useTheme } from '@/theme/ThemeProvider'

function languageExtension(filename: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.css')) return css()
  if (lower.endsWith('.json')) return json()
  // .js, .mjs, .pde (Processing-like), and unknown → JS highlighting
  return javascript()
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
  },
  '.cm-scroller': {
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    lineHeight: '1.55',
    overflowX: 'auto',
  },
  '.cm-content': {
    padding: '12px 0',
  },
  '.cm-gutters': {
    border: 'none',
  },
})

type SketchCodeEditorProps = {
  filename: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SketchCodeEditor({
  filename,
  value,
  onChange,
  className,
}: SketchCodeEditorProps) {
  const { theme } = useTheme()
  const extensions = useMemo(
    () => [languageExtension(filename), editorTheme],
    [filename],
  )

  return (
    <div className={cn('h-full min-h-0', className)}>
      <CodeMirror
        value={value}
        height="100%"
        style={{ height: '100%' }}
        theme={theme === 'dark' ? oneDark : 'light'}
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
        }}
        className="h-full [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
        aria-label="Source editor"
      />
    </div>
  )
}
