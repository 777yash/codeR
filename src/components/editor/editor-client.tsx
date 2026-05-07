'use client'

import { useCallback, useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useEditorStore } from '@/stores/editor-store'

interface EditorClientProps {
  roomId: string
  userId: string
  userName?: string
  initialLanguage?: string
  readOnly?: boolean
}

export function EditorClient({
  roomId,
  userId,
  userName,
  initialLanguage,
  readOnly = false,
}: EditorClientProps) {
  const cleanupRef = useRef<(() => void) | null>(null)

  const {
    theme,
    language,
    lineNumbers,
    minimap,
    wordWrap,
    fontSize,
    setLanguage,
    setLastSaved,
  } = useEditorStore()

  useEffect(() => {
    if (initialLanguage) setLanguage(initialLanguage)
  }, [initialLanguage, setLanguage])

  const handleEditorMount: OnMount = useCallback(
    async (editor) => {
      // Dynamic imports — all run browser-only, after editor mount.
      // Avoids static import of monaco-editor (y-monaco) breaking SSR/webpack.
      const [Y, { WebsocketProvider }, { MonacoBinding }] = await Promise.all([
        import('yjs'),
        import('y-websocket'),
        import('y-monaco'),
      ])

      editor.addCommand(2048 | 49, () => setLastSaved(new Date()))

      const wsUrl =
        process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? 'ws://localhost:1234'

      const ydoc = new Y.Doc()
      const provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
        connect: true,
      })
      const ytext = ydoc.getText('content')
      const binding = new MonacoBinding(
        ytext,
        editor.getModel()!,
        new Set([editor]),
        provider.awareness
      )

      const userColor = `#${Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0')}`

      provider.awareness.setLocalStateField('user', {
        id: userId,
        name: userName ?? userId,
        color: userColor,
      })

      // Inject per-user CSS for remote cursor colors (y-monaco only adds class names, no CSS)
      const styleEl = document.createElement('style')
      styleEl.id = `y-monaco-cursors-${roomId}`
      document.head.appendChild(styleEl)

      const updateCursorStyles = () => {
        const states = provider.awareness.getStates() as Map<
          number,
          { user?: { color?: string; name?: string } }
        >
        let css = ''
        states.forEach((state, clientId) => {
          if (clientId === ydoc.clientID) return
          const color = state.user?.color ?? '#888888'
          const name = (state.user?.name ?? 'Anonymous').replace(/"/g, '')
          css += `.yRemoteSelection-${clientId}{background-color:${color}40}
.yRemoteSelectionHead-${clientId}{border-color:${color};background-color:${color}}
.yRemoteSelectionHead-${clientId}::after{content:"${name}";background-color:${color}}
`
        })
        styleEl.textContent = css
      }

      provider.awareness.on('change', updateCursorStyles)
      updateCursorStyles()

      provider.on('status', ({ status }: { status: string }) => {
        if (status === 'connected') setLastSaved(new Date())
      })

      cleanupRef.current = () => {
        provider.awareness.off('change', updateCursorStyles)
        styleEl.remove()
        binding.destroy()
        provider.destroy()
        ydoc.destroy()
      }
    },
    [roomId, userId, setLastSaved]
  )

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  const getMonacoLanguage = (lang: string): string => {
    const map: Record<string, string> = {
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
    return map[lang] ?? lang
  }

  return (
    <Editor
      height="100%"
      language={getMonacoLanguage(language)}
      theme={theme}
      onMount={handleEditorMount}
      options={{
        readOnly,
        fontSize,
        fontFamily: "'JetBrains Mono', monospace",
        lineNumbers: lineNumbers === 'off' ? 'off' : lineNumbers,
        minimap: { enabled: minimap },
        wordWrap,
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
