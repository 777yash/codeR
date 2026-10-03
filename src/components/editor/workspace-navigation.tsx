'use client'
import { Code2, FolderOpen, MessageSquare, PanelRight } from 'lucide-react'
import { useEditorStore } from '@/stores/editor-store'

export function WorkspaceNavigation() {
  const explorerCollapsed = useEditorStore((s) => s.explorerCollapsed)
  const collabCollapsed = useEditorStore((s) => s.collabCollapsed)
  const setExplorerCollapsed = useEditorStore((s) => s.setExplorerCollapsed)
  const setCollabCollapsed = useEditorStore((s) => s.setCollabCollapsed)
  return (
    <nav className="editor-activity-rail" aria-label="Workspace panels">
      <Code2 className="editor-rail-brand h-4 w-4" aria-hidden />
      <button
        aria-label="Toggle explorer"
        title="Explorer"
        aria-pressed={!explorerCollapsed}
        onClick={() => setExplorerCollapsed(!explorerCollapsed)}
      >
        <FolderOpen className="h-4 w-4" />
      </button>
      <button
        aria-label="Toggle collaboration"
        title="Collaboration"
        aria-pressed={!collabCollapsed}
        onClick={() => setCollabCollapsed(!collabCollapsed)}
      >
        <MessageSquare className="h-4 w-4" />
      </button>
      <span className="flex-1" />
      <PanelRight className="h-3.5 w-3.5 opacity-30" aria-hidden />
    </nav>
  )
}
export function FileBreadcrumb() {
  const files = useEditorStore((s) => s.files)
  const activeFileId = useEditorStore((s) => s.activeFileId)
  const active = files.find((file) => file.id === activeFileId)
  if (!active) return null
  const parts = active.name.split('/')
  return (
    <div
      className="editor-file-breadcrumb"
      aria-label="Current file path"
      title={active.name}
    >
      {parts.map((part, index) => (
        <span
          key={index}
          className={index === parts.length - 1 ? 'text-app-muted' : ''}
        >
          {index > 0 && <span className="px-2 opacity-40">/</span>}
          {part}
        </span>
      ))}
    </div>
  )
}
