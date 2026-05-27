import { create } from 'zustand'

export type Theme = 'vs-dark' | 'light'
export type LineNumbers = 'on' | 'off' | 'relative'
export type WordWrap = 'on' | 'off'

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
  addFile: (file: EditorFile) => void
  removeFile: (id: string) => void
  updateFileContent: (id: string, content: string) => void
  setActiveFile: (id: string) => void
  renameFile: (id: string, name: string) => void
  setFiles: (files: EditorFile[]) => void

  isSaving: boolean
  setIsSaving: (isSaving: boolean) => void

  lastSaved: Date | null
  setLastSaved: (date: Date) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
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
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  removeFile: (id) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== id)
      let newActiveId = state.activeFileId
      if (state.activeFileId === id) {
        newActiveId =
          newFiles.length > 0 ? newFiles[newFiles.length - 1].id : null
      }
      return { files: newFiles, activeFileId: newActiveId }
    }),
  updateFileContent: (id, content) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, content } : f)),
    })),
  setActiveFile: (id) => {
    const file = get().files.find((f) => f.id === id)
    if (file) {
      set({ activeFileId: id, language: file.language })
    } else {
      set({ activeFileId: id })
    }
  },
  renameFile: (id, name) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, name } : f)),
    })),
  setFiles: (files) => set({ files }),

  isSaving: false,
  setIsSaving: (isSaving) => set({ isSaving }),

  lastSaved: null,
  setLastSaved: (date) => set({ lastSaved: date }),
}))
