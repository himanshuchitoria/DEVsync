// frontend/src/utils/monaco.ts
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Fix Monaco worker URLs for Vite
self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

// Custom VS Code Dark+ theme matching your glassmorphism UI
monaco.editor.defineTheme('codecollabDark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'f8f8f2', background: '1e1e1e' },
    { token: 'comment', foreground: '6272a4' },
    { token: 'keyword', foreground: 'ff79c6' },
    { token: 'string', foreground: 'f1fa8c' },
    { token: 'number', foreground: 'bd93f9' },
    { token: 'function', foreground: '50fa7b' },
    { token: 'type', foreground: 'ffb86c' },
    { token: 'variable.parameter', foreground: '8be9fd' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editor.lineHighlightBackground': '#161b22',
    'editorCursor.foreground': '#f1fa8c',
    'editor.selectionBackground': '#23863640',
    'editor.inactiveSelectionBackground': '#23863620',
    'editorGutter.background': '#161b22',
    'editorGutter.addedBackground': '#238636',
    'editorGutter.deletedBackground': '#f85149',
    'editorLineNumber.foreground': '#8b949e',
    'editor.selectionHighlightBackground': '#23863630',
    'editorCursor.background': '#f1fa8c',
    'editor.lineHighlightBorderBox': '#30363d',
  },
})

// Language configurations for syntax highlighting
const languageConfig: Record<string, monaco.languages.ILanguageConfiguration> = {
  typescript: {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  },
  javascript: {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  },
  python: {
    comments: { lineComment: '#', blockComment: ['"""', '"""'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: { 
      markers: { 
        start: new RegExp('^\\s*#pragma\\s+region'), 
        end: new RegExp('^\\s*#pragma\\s+endregion') 
      } 
    },
  },
}

// Register languages and configurations
Object.entries(languageConfig).forEach(([lang, config]) => {
  monaco.languages.register({ id: lang })
  monaco.languages.setLanguageConfiguration(lang, config)
})

// Default Monaco options for CodeCollab
export const monacoOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  theme: 'codecollabDark',
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  renderWhitespace: 'boundary',
  renderIndentGuides: true,
  cursorStyle: 'line',
  occurrencesHighlight: true,
  renderLineHighlight: 'gutter',
  codeLens: true,
  bracketMatching: 'always',
  formatOnPaste: true,
  formatOnType: true,
  multiCursorModifier: 'alt',
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true
  },
  parameterHints: {
    enabled: true
  },
  suggest: {
    showIcons: true,
    preview: true
  },
}

// Language map for file extensions
export const languageForExtension: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  json: 'json',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  html: 'html',
  htm: 'html',
  sh: 'shell',
  bash: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  java: 'java',
  cpp: 'cpp',
  c: 'cpp',
  go: 'go',
  rust: 'rust',
  php: 'php',
  rb: 'ruby',
}

export const getLanguageFromFile = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  return languageForExtension[ext || ''] || 'plaintext'
}

export default monaco
