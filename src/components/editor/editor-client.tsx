'use client'

import { useCallback, useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useDebouncedCallback } from 'use-debounce'
import { useEditorStore } from '@/stores/editor-store'

interface EditorClientProps {
  roomId: string
  initialContent?: string
  initialLanguage?: string
  readOnly?: boolean
}

export function EditorClient({
  roomId,
  initialContent,
  initialLanguage,
  readOnly = false,
}: EditorClientProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const {
    theme,
    language,
    lineNumbers,
    minimap,
    wordWrap,
    fontSize,
    files,
    activeFileId,
    updateFileContent,
    setIsSaving,
    setLastSaved,
    addFile,
    setActiveFile,
  } = useEditorStore()

  useEffect(() => {
    if (
      initialContent !== undefined &&
      files.length === 1 &&
      files[0].id === 'default'
    ) {
      updateFileContent('default', initialContent)
    }
  }, [initialContent])

  useEffect(() => {
    if (initialLanguage && files.length === 1) {
      useEditorStore.getState().setLanguage(initialLanguage)
      useEditorStore
        .getState()
        .updateFileContent('default', initialContent || '')
    }
  }, [initialLanguage])

  const saveContent = useDebouncedCallback(async (content: string) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/rooms/${roomId}/document`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (response.ok) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }, 500)

  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor

      editor.addCommand(
        2048 | 49, // Cmd+S (Mac) / Ctrl+S (Windows)
        () => {
          const activeFile = files.find((f) => f.id === activeFileId)
          if (activeFile) {
            fetch(`/api/rooms/${roomId}/document`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: activeFile.content }),
            }).then(() => setLastSaved(new Date()))
          }
        }
      )
    },
    [activeFileId, files, roomId, setLastSaved]
  )

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeFileId && value !== undefined) {
        updateFileContent(activeFileId, value)
        saveContent(value)
      }
    },
    [activeFileId, updateFileContent, saveContent]
  )

  const activeFile = files.find((f) => f.id === activeFileId)

  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'csharp',
      go: 'go',
      rust: 'rust',
      ruby: 'ruby',
      php: 'php',
      swift: 'swift',
      kotlin: 'kotlin',
      scala: 'scala',
      r: 'r',
      sql: 'sql',
      bash: 'shell',
      lua: 'lua',
      perl: 'perl',
      haskell: 'haskell',
      elixir: 'elixir',
      clojure: 'clojure',
      dart: 'dart',
      julia: 'julia',
      matlab: 'matlab',
      vbnet: 'vb',
      cobol: 'cobol',
      fortran: 'fortran',
      assembly: 'asm',
    }
    return languageMap[lang] || lang
  }

  return (
    <Editor
      height="100%"
      language={getMonacoLanguage(activeFile?.language || language)}
      value={activeFile?.content || ''}
      theme={theme}
      onChange={handleEditorChange}
      onMount={handleEditorMount}
      options={{
        readOnly,
        fontSize,
        fontFamily: "'JetBrains Mono', monospace",
        lineNumbers: lineNumbers === 'off' ? 'off' : lineNumbers,
        minimap: { enabled: minimap },
        wordWrap: wordWrap,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        padding: { top: 8 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
    />
  )
}
