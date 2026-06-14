import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'vs-dark' | 'light'
type LineNumbers = 'on' | 'off' | 'relative'
type WordWrap = 'on' | 'off'

export interface EditorFile {
  id: string
  name: string
  content: string
  language: string
}

interface EditorState {
  theme: Theme
  setTheme: (theme: Theme) => void

  language: string
  setLanguage: (language: string) => void

  lineNumbers: LineNumbers
  setLineNumbers: (lineNumbers: LineNumbers) => void

  minimap: boolean
  setMinimap: (minimap: boolean) => void

  wordWrap: WordWrap
  setWordWrap: (wordWrap: WordWrap) => void

  fontSize: number
  setFontSize: (fontSize: number) => void

  files: EditorFile[]
  activeFileId: string | null
  openFileIds: string[]
  addFile: (file: EditorFile) => void
  removeFile: (id: string) => void
  updateFileContent: (id: string, content: string) => void
  setActiveFile: (id: string) => void
  closeFile: (id: string) => void
  closeOtherFiles: (id: string) => void
  renameFile: (id: string, name: string) => void
  setFiles: (files: EditorFile[]) => void

  isSaving: boolean
  setIsSaving: (isSaving: boolean) => void

  lastSaved: Date | null
  setLastSaved: (date: Date) => void

  executionPanelOpen: boolean
  setExecutionPanelOpen: (open: boolean) => void

  terminalOpen: boolean
  setTerminalOpen: (open: boolean) => void

  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void

  inlineSuggest: boolean
  setInlineSuggest: (inlineSuggest: boolean) => void

  explorerCollapsed: boolean
  setExplorerCollapsed: (collapsed: boolean) => void

  collabCollapsed: boolean
  setCollabCollapsed: (collapsed: boolean) => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      theme: 'vs-dark',
      setTheme: (theme) => set({ theme }),

      language: 'javascript',
      setLanguage: (language) => {
        set({ language })
        const { activeFileId, files } = get()
        if (activeFileId) {
          set({
            files: files.map((f) =>
              f.id === activeFileId ? { ...f, language } : f
            ),
          })
        }
      },

      lineNumbers: 'on',
      setLineNumbers: (lineNumbers) => set({ lineNumbers }),

      minimap: true,
      setMinimap: (minimap) => set({ minimap }),

      wordWrap: 'off',
      setWordWrap: (wordWrap) => set({ wordWrap }),

      fontSize: 14,
      setFontSize: (fontSize) => set({ fontSize }),

      files: [
        { id: 'default', name: 'main.js', content: '', language: 'javascript' },
      ],
      activeFileId: 'default',
      openFileIds: ['default'],
      addFile: (file) => set((state) => ({ files: [...state.files, file] })),
      removeFile: (id) =>
        set((state) => {
          const newFiles = state.files.filter((f) => f.id !== id)
          const openFileIds = state.openFileIds.filter((f) => f !== id)
          let newActiveId = state.activeFileId
          if (state.activeFileId === id) {
            newActiveId =
              openFileIds[openFileIds.length - 1] ??
              (newFiles.length > 0 ? newFiles[newFiles.length - 1].id : null)
          }
          return { files: newFiles, openFileIds, activeFileId: newActiveId }
        }),
      updateFileContent: (id, content) =>
        set((state) => ({
          files: state.files.map((f) => (f.id === id ? { ...f, content } : f)),
        })),
      setActiveFile: (id) => {
        const state = get()
        const file = state.files.find((f) => f.id === id)
        const openFileIds = state.openFileIds.includes(id)
          ? state.openFileIds
          : [...state.openFileIds, id]
        set(
          file
            ? { activeFileId: id, language: file.language, openFileIds }
            : { activeFileId: id, openFileIds }
        )
      },
      // Closes the tab only — the file stays in the workspace
      closeFile: (id) =>
        set((state) => {
          if (state.openFileIds.length <= 1) return {}
          const openFileIds = state.openFileIds.filter((f) => f !== id)
          if (state.activeFileId !== id) return { openFileIds }
          const nextId = openFileIds[openFileIds.length - 1]
          const next = state.files.find((f) => f.id === nextId)
          return {
            openFileIds,
            activeFileId: nextId,
            ...(next ? { language: next.language } : {}),
          }
        }),
      closeOtherFiles: (id) =>
        set((state) => {
          const file = state.files.find((f) => f.id === id)
          return {
            openFileIds: [id],
            activeFileId: id,
            ...(file ? { language: file.language } : {}),
          }
        }),
      renameFile: (id, name) =>
        set((state) => ({
          files: state.files.map((f) => (f.id === id ? { ...f, name } : f)),
        })),
      setFiles: (files) =>
        set((state) => {
          const valid = new Set(files.map((f) => f.id))
          let openFileIds = state.openFileIds.filter((id) => valid.has(id))
          if (openFileIds.length === 0 && files.length > 0) {
            openFileIds = [files[0].id]
          }
          return { files, openFileIds }
        }),

      isSaving: false,
      setIsSaving: (isSaving) => set({ isSaving }),

      lastSaved: null,
      setLastSaved: (date) => set({ lastSaved: date }),

      // Terminal + execution panel are both fixed bottom drawers — only one may be open
      executionPanelOpen: false,
      setExecutionPanelOpen: (open) =>
        set(
          open
            ? { executionPanelOpen: true, terminalOpen: false }
            : { executionPanelOpen: false }
        ),

      terminalOpen: false,
      setTerminalOpen: (open) =>
        set(
          open
            ? { terminalOpen: true, executionPanelOpen: false }
            : { terminalOpen: false }
        ),

      previewOpen: false,
      setPreviewOpen: (open) => set({ previewOpen: open }),

      inlineSuggest: true,
      setInlineSuggest: (inlineSuggest) => set({ inlineSuggest }),

      explorerCollapsed: false,
      setExplorerCollapsed: (collapsed) =>
        set({ explorerCollapsed: collapsed }),

      collabCollapsed: false,
      setCollabCollapsed: (collapsed) => set({ collabCollapsed: collapsed }),
    }),
    {
      name: 'coder-editor-prefs',
      // Only persist user preferences — not ephemeral runtime state
      partialize: (state) => ({
        theme: state.theme,
        lineNumbers: state.lineNumbers,
        minimap: state.minimap,
        wordWrap: state.wordWrap,
        fontSize: state.fontSize,
        inlineSuggest: state.inlineSuggest,
        explorerCollapsed: state.explorerCollapsed,
        collabCollapsed: state.collabCollapsed,
      }),
    }
  )
)
