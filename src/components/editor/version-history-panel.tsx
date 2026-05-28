'use client'

import { useState, useCallback, useRef } from 'react'
import {
  History,
  X,
  ArrowLeft,
  Loader2,
  BookmarkCheck,
  Clock,
} from 'lucide-react'
import { DiffEditor } from '@monaco-editor/react'
import { formatDistanceToNow } from 'date-fns'
import { getEditorContent } from './editor-client'

interface Snapshot {
  id: string
  label: string | null
  createdAt: string
  createdBy: { name: string | null; image: string | null } | null
}

interface SnapshotDetail extends Snapshot {
  content: string
}

type Tab = 'named' | 'auto'

interface VersionHistoryPanelProps {
  roomId: string
  roomLanguage: string
}

const MIN_WIDTH = 380
const MAX_WIDTH_RATIO = 0.92
const DEFAULT_WIDTH = 640

export function VersionHistoryPanel({
  roomId,
  roomLanguage,
}: VersionHistoryPanelProps) {
  const [open, setOpen] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [selected, setSelected] = useState<SnapshotDetail | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [currentContent, setCurrentContent] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('named')
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)

  const isResizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  const fetchList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/snapshots`)
      if (res.ok) setSnapshots(await res.json())
    } finally {
      setListLoading(false)
    }
  }, [roomId])

  async function openDiff(snapshot: Snapshot) {
    setDiffLoading(true)
    setCurrentContent(getEditorContent())
    try {
      const res = await fetch(`/api/rooms/${roomId}/snapshots/${snapshot.id}`)
      if (res.ok) setSelected(await res.json())
    } finally {
      setDiffLoading(false)
    }
  }

  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    isResizing.current = true
    resizeStartX.current = e.clientX
    resizeStartWidth.current = panelWidth

    function onMouseMove(ev: MouseEvent) {
      if (!isResizing.current) return
      const delta = resizeStartX.current - ev.clientX
      const maxWidth = Math.floor(window.innerWidth * MAX_WIDTH_RATIO)
      setPanelWidth(
        Math.min(
          Math.max(resizeStartWidth.current + delta, MIN_WIDTH),
          maxWidth
        )
      )
    }

    function onMouseUp() {
      isResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const named = snapshots.filter((s) => s.label !== null)
  const autoSaves = snapshots.filter((s) => s.label === null)
  const visible = activeTab === 'named' ? named : autoSaves

  return (
    <>
      <button
        onClick={() => {
          setSelected(null)
          setOpen(true)
          fetchList()
        }}
        title="Version history"
        className="text-app-dim hover:text-app-muted flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5"
      >
        <History className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <div
            className="border-app bg-app-surface relative z-10 flex h-full flex-col overflow-hidden border-l"
            style={{ width: panelWidth }}
          >
            {/* Resize handle — left edge */}
            <div
              onMouseDown={startResize}
              className="absolute top-0 left-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[#FF2D55]/40"
              title="Drag to resize"
            />

            {/* Header */}
            <div className="border-app flex h-12 shrink-0 items-center justify-between border-b px-5">
              <div className="flex items-center gap-2">
                {selected && (
                  <button
                    onClick={() => setSelected(null)}
                    className="text-app-dim hover:text-app mr-1 flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <h2 className="text-app text-sm font-semibold">
                  {selected
                    ? (selected.label ?? 'Auto-saved')
                    : 'Version History'}
                </h2>
                {selected && (
                  <span className="text-app-dim text-xs">
                    {formatDistanceToNow(new Date(selected.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-app-dim hover:text-app flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs — only visible in list view */}
            {!selected && (
              <div className="border-app flex shrink-0 border-b">
                {(
                  [
                    {
                      id: 'named' as Tab,
                      label: 'Named',
                      count: named.length,
                      icon: BookmarkCheck,
                    },
                    {
                      id: 'auto' as Tab,
                      label: 'Auto-saves',
                      count: autoSaves.length,
                      icon: Clock,
                    },
                  ] as const
                ).map(({ id, label, count, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 border-b-2 px-5 py-2.5 text-xs font-medium transition-colors ${
                      activeTab === id
                        ? 'border-[#FF2D55] text-[#FF2D55]'
                        : 'border-transparent text-[#555555] hover:text-[#888888]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] ${
                        activeTab === id
                          ? 'bg-[#FF2D55]/20 text-[#FF2D55]'
                          : 'bg-white/5 text-[#555555]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col">
              {!selected ? (
                listLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="text-app-dim h-5 w-5 animate-spin" />
                  </div>
                ) : visible.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2">
                    {activeTab === 'named' ? (
                      <>
                        <BookmarkCheck className="text-app-dim h-8 w-8" />
                        <p className="text-app-muted text-sm">
                          No named versions yet
                        </p>
                        <p className="text-app-dim text-xs">
                          Use the bookmark button to save a named version
                        </p>
                      </>
                    ) : (
                      <>
                        <Clock className="text-app-dim h-8 w-8" />
                        <p className="text-app-muted text-sm">
                          No auto-saves yet
                        </p>
                        <p className="text-app-dim text-xs">
                          Auto-saves appear every 60 seconds while editing
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto py-2">
                    {visible.map((snap) => (
                      <button
                        key={snap.id}
                        onClick={() => openDiff(snap)}
                        className="hover:bg-app-card-hover flex w-full items-center gap-3 px-5 py-3 text-left transition-colors"
                      >
                        <div className="shrink-0">
                          {snap.label ? (
                            <BookmarkCheck className="h-4 w-4 text-[#FF2D55]" />
                          ) : (
                            <Clock className="text-app-dim h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-app truncate text-xs font-medium">
                            {snap.label ?? 'Auto-saved'}
                          </p>
                          <p className="text-app-dim mt-0.5 text-xs">
                            {formatDistanceToNow(new Date(snap.createdAt), {
                              addSuffix: true,
                            })}
                            {snap.createdBy?.name
                              ? ` · ${snap.createdBy.name}`
                              : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : diffLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="text-app-dim h-5 w-5 animate-spin" />
                </div>
              ) : (
                /* Diff view */
                <div className="flex flex-1 flex-col">
                  <div className="border-app flex shrink-0 items-center justify-between border-b px-5 py-2">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-app-dim flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#555]" />
                        Snapshot
                      </span>
                      <span className="text-app-dim flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#FF2D55]" />
                        Current
                      </span>
                    </div>
                    {selected.createdBy?.name && (
                      <span className="text-app-dim text-xs">
                        by {selected.createdBy.name}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <DiffEditor
                      original={selected.content}
                      modified={currentContent}
                      language={roomLanguage}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        renderOverviewRuler: false,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
