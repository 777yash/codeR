'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  UserPlus,
  MessageSquare,
  History,
  Users,
  X,
  Loader2,
  Send,
  Code2,
  Copy,
  Check,
  ArrowLeft,
  BookmarkCheck,
  Clock,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { editor } from 'monaco-editor'

const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => ({ default: m.DiffEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded bg-[var(--coder-bg-surface)]" />
    ),
  }
)
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { usePresence } from '@/hooks/use-presence'
import { useEditorStore } from '@/stores/editor-store'
import { colorFromUserId } from '@/lib/color'
import {
  sendChatMessage,
  subscribeToChatMessages,
  getChatMessages,
  getEditorContent,
  type ChatMessageData,
} from '@/components/editor/editor-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CollabMember {
  id: string
  name: string | null
  image: string | null
  role: string
}

interface CollabPanelProps {
  roomId: string
  members?: CollabMember[]
  currentUserId?: string
  currentUserName?: string
  roomLanguage?: string
  canSave?: boolean
  mobileOpen?: boolean
}

interface Snapshot {
  id: string
  label: string | null
  createdAt: string
  createdBy: { name: string | null; image: string | null } | null
}

interface SnapshotDetail extends Snapshot {
  content: string
}

type Tab = 'users' | 'chat' | 'history'
type HistorySubTab = 'named' | 'auto'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, string> = {
  OWNER: 'text-[var(--coder-accent)] bg-[var(--coder-accent-glow)]',
  EDITOR: 'text-[#32D74B] bg-[rgba(50,215,75,0.10)]',
  VIEWER: 'text-[var(--coder-text-secondary)] bg-[var(--coder-bg-card-hover)]',
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

const HIST_MIN_WIDTH = 380
const HIST_MAX_WIDTH_RATIO = 0.92
const HIST_DEFAULT_WIDTH = 640

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function renderWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\S+)/)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-semibold text-[var(--coder-accent)]">
        {part}
      </span>
    ) : (
      part
    )
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CollabPanel({
  roomId,
  members = [],
  currentUserId,
  currentUserName,
  roomLanguage = 'javascript',
  canSave = false,
  mobileOpen = false,
}: CollabPanelProps) {
  // ── Tab ────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('users')

  // ── Invite state ──────────────────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const posthog = usePostHog()

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessageData[]>(getChatMessages)
  const [chatInput, setChatInput] = useState('')
  const [isCodeMode, setIsCodeMode] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [lastRead, setLastRead] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const editorLanguage = useEditorStore((s) => s.language)

  // ── History state ─────────────────────────────────────────────────────────
  const [histSnapshots, setHistSnapshots] = useState<Snapshot[]>([])
  const [histListLoading, setHistListLoading] = useState(false)
  const [histSelected, setHistSelected] = useState<SnapshotDetail | null>(null)
  const [histDiffLoading, setHistDiffLoading] = useState(false)
  const [histCurrentContent, setHistCurrentContent] = useState('')
  const [histSubTab, setHistSubTab] = useState<HistorySubTab>('named')
  const [histDiffWidth, setHistDiffWidth] = useState(HIST_DEFAULT_WIDTH)
  const [histDeletingId, setHistDeletingId] = useState<string | null>(null)
  const [histRestoring, setHistRestoring] = useState(false)
  const [histConfirmRestore, setHistConfirmRestore] = useState(false)
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const isResizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // ── Chat effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = subscribeToChatMessages((msgs) => setMessages([...msgs]))
    return unsub
  }, [])

  useEffect(() => {
    if (tab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, tab])

  const unreadCount =
    tab !== 'chat' ? Math.max(0, messages.length - lastRead) : 0

  // ── History effects ───────────────────────────────────────────────────────

  const fetchHistList = useCallback(async () => {
    setHistListLoading(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/snapshots`)
      if (res.ok) setHistSnapshots(await res.json())
    } finally {
      setHistListLoading(false)
    }
  }, [roomId])

  // Re-fetch history list when SaveVersionDialog saves while history tab is open
  useEffect(() => {
    const handler = () => {
      if (tab === 'history') void fetchHistList()
    }
    window.addEventListener('coder:version-saved', handler)
    return () => window.removeEventListener('coder:version-saved', handler)
  }, [tab, fetchHistList])

  // Refresh DiffEditor layout when diff becomes visible
  useEffect(() => {
    if (histSelected && !histDiffLoading && diffEditorRef.current) {
      requestAnimationFrame(() => diffEditorRef.current?.layout())
    }
  }, [histSelected, histDiffLoading])

  // ── History handlers ──────────────────────────────────────────────────────

  async function openHistDiff(snapshot: Snapshot) {
    setHistConfirmRestore(false)
    setHistDiffLoading(true)
    setHistCurrentContent(getEditorContent())
    try {
      const res = await fetch(`/api/rooms/${roomId}/snapshots/${snapshot.id}`)
      if (res.ok) setHistSelected(await res.json())
    } finally {
      setHistDiffLoading(false)
    }
  }

  async function deleteHistSnapshot(e: React.MouseEvent, snapshotId: string) {
    e.stopPropagation()
    setHistDeletingId(snapshotId)
    try {
      const res = await fetch(`/api/rooms/${roomId}/snapshots/${snapshotId}`, {
        method: 'DELETE',
      })
      if (res.ok)
        setHistSnapshots((prev) => prev.filter((s) => s.id !== snapshotId))
    } finally {
      setHistDeletingId(null)
    }
  }

  async function restoreHistSnapshot(snapshotId: string) {
    setHistRestoring(true)
    setHistConfirmRestore(false)
    try {
      const res = await fetch(
        `/api/rooms/${roomId}/snapshots/${snapshotId}/restore`,
        { method: 'POST' }
      )
      if (res.ok) {
        toast.success('Restored — all editors updated')
        diffEditorRef.current?.setModel(null)
        setHistSelected(null)
      } else {
        toast.error('Restore failed')
      }
    } finally {
      setHistRestoring(false)
    }
  }

  function startHistResize(e: React.MouseEvent) {
    e.preventDefault()
    isResizing.current = true
    resizeStartX.current = e.clientX
    resizeStartWidth.current = histDiffWidth

    function onMouseMove(ev: MouseEvent) {
      if (!isResizing.current) return
      const delta = resizeStartX.current - ev.clientX
      const maxWidth = Math.floor(window.innerWidth * HIST_MAX_WIDTH_RATIO)
      setHistDiffWidth(
        Math.min(
          Math.max(resizeStartWidth.current + delta, HIST_MIN_WIDTH),
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

  const histNamed = histSnapshots.filter((s) => s.label !== null)
  const histAuto = histSnapshots.filter((s) => s.label === null)
  const histVisible = histSubTab === 'named' ? histNamed : histAuto
  const showDiff = !!histSelected && !histDiffLoading

  // ── Mention helpers ───────────────────────────────────────────────────────

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return members.filter(
      (m) =>
        m.name && m.name.toLowerCase().startsWith(q) && m.id !== currentUserId
    )
  }, [mentionQuery, members, currentUserId])

  const insertMention = useCallback(
    (name: string) => {
      setChatInput(chatInput.replace(/@\S*$/, `@${name} `))
      setMentionQuery(null)
    },
    [chatInput]
  )

  const handleInputChange = useCallback((value: string) => {
    setChatInput(value)
    const match = value.match(/@(\S*)$/)
    setMentionQuery(match ? match[1] : null)
  }, [])

  const handleSendMessage = useCallback(() => {
    const content = chatInput.trim()
    if (!content || !currentUserId) return
    sendChatMessage({
      id: crypto.randomUUID(),
      userId: currentUserId,
      userName: currentUserName ?? currentUserId,
      content,
      timestamp: Date.now(),
      ...(isCodeMode
        ? { type: 'code' as const, language: editorLanguage }
        : {}),
    })
    posthog?.capture('chat_message_sent', { has_code: isCodeMode })
    setChatInput('')
    setMentionQuery(null)
  }, [
    chatInput,
    currentUserId,
    currentUserName,
    isCodeMode,
    editorLanguage,
    posthog,
  ])

  const handleCopy = useCallback((content: string, id: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      })
      .catch(() => {})
  }, [])

  // ── Presence ──────────────────────────────────────────────────────────────

  const onlineIds = usePresence(roomId)
  const onlineMembers = useMemo(
    () => members.filter((m) => onlineIds.includes(m.id)),
    [members, onlineIds]
  )
  const offlineMembers = useMemo(
    () => members.filter((m) => !onlineIds.includes(m.id)),
    [members, onlineIds]
  )

  const myRole = members.find((m) => m.id === currentUserId)?.role
  const canInvite = myRole === 'OWNER'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setInviteError('')
    try {
      const res = await fetch(`/api/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const data = (await res.json()) as {
        error?: string
        user?: { name: string }
      }
      if (!res.ok) {
        setInviteError(data.error ?? 'Failed to invite')
      } else {
        toast.success(`Invited ${data.user?.name ?? email}`)
        setEmail('')
        setShowInvite(false)
      }
    } catch {
      setInviteError('Network error')
    } finally {
      setInviting(false)
    }
  }

  // ── Tab definitions ───────────────────────────────────────────────────────

  const tabs: { id: Tab; icon: React.ReactNode }[] = [
    { id: 'users', icon: <Users className="h-3 w-3" /> },
    { id: 'chat', icon: <MessageSquare className="h-3 w-3" /> },
    { id: 'history', icon: <History className="h-3 w-3" /> },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={`border-app bg-app-surface flex-col overflow-hidden border-l max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:w-[82%] max-md:max-w-[320px] max-md:shadow-[-4px_0_24px_rgba(0,0,0,0.5)] md:flex md:w-[280px] md:shrink-0 ${
          mobileOpen ? 'max-md:flex' : 'max-md:hidden'
        }`}
      >
        {/* Tab bar */}
        <div className="border-app flex h-10 shrink-0 items-stretch border-b">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'chat') setLastRead(messages.length)
                if (t.id === 'history') void fetchHistList()
                setTab(t.id)
              }}
              className={`relative flex flex-1 items-center justify-center gap-1 text-xs font-medium capitalize transition-colors ${
                tab === t.id
                  ? 'text-app border-b-2 border-[var(--coder-accent)]'
                  : 'text-app-dim hover:text-app-muted'
              }`}
            >
              {t.icon}
              {t.id === 'users'
                ? `Users (${onlineMembers.length})`
                : t.id.charAt(0).toUpperCase() + t.id.slice(1)}
              {t.id === 'chat' && unreadCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--coder-accent)] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Users tab ────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <>
              <p className="text-app-dim px-4 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase">
                Online · {onlineMembers.length}
              </p>

              {onlineMembers.length === 0 && (
                <p className="text-app-dim px-4 py-3 text-xs">
                  No one else online
                </p>
              )}

              {onlineMembers.map((member) => {
                const color = colorFromUserId(member.id)
                const roleStyle = ROLE_STYLE[member.role] ?? ROLE_STYLE.VIEWER
                const roleLabel = ROLE_LABEL[member.role] ?? member.role
                const isMe = member.id === currentUserId
                return (
                  <div
                    key={member.id}
                    className="hover-app-card flex items-center gap-3 rounded-sm px-4 py-2.5 transition-colors"
                  >
                    <div
                      style={{ backgroundColor: color + '28', color }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    >
                      {getInitials(member.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-app truncate text-sm font-medium">
                          {member.name ?? 'Unknown'}
                        </span>
                        {isMe && (
                          <span className="text-app-dim shrink-0 text-[10px]">
                            (you)
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-block rounded-full px-1.5 py-px text-[10px] font-medium ${roleStyle}`}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    <div className="h-2 w-2 shrink-0 rounded-full bg-[#32D74B]" />
                  </div>
                )
              })}

              {offlineMembers.length > 0 && (
                <>
                  <div className="border-app border-t px-4 pt-3 pb-1">
                    <p className="text-app-dim text-[10px] font-semibold tracking-widest uppercase">
                      Offline · {offlineMembers.length}
                    </p>
                  </div>
                  {offlineMembers.map((member) => {
                    const isMe = member.id === currentUserId
                    const roleStyle =
                      ROLE_STYLE[member.role] ?? ROLE_STYLE.VIEWER
                    const roleLabel = ROLE_LABEL[member.role] ?? member.role
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-sm px-4 py-2.5 opacity-40"
                      >
                        <div className="text-app-dim flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--coder-bg-card-hover)] text-[11px] font-semibold">
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-app-dim truncate text-sm font-medium">
                              {member.name ?? 'Unknown'}
                            </span>
                            {isMe && (
                              <span className="text-app-dim shrink-0 text-[10px]">
                                (you)
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block rounded-full px-1.5 py-px text-[10px] font-medium ${roleStyle}`}
                          >
                            {roleLabel}
                          </span>
                        </div>
                        <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--coder-text-tertiary)]" />
                      </div>
                    )
                  })}
                </>
              )}

              {canInvite && (
                <div className="px-3 py-2">
                  {!showInvite ? (
                    <button
                      onClick={() => setShowInvite(true)}
                      className="border-app-mid text-app-muted flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors hover:border-[var(--coder-border-accent)] hover:bg-[var(--coder-accent-dim)] hover:text-[var(--coder-accent)]"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Invite to room
                    </button>
                  ) : (
                    <form
                      onSubmit={handleInvite}
                      className="border-app-mid bg-app-surface rounded-md border p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-app text-xs font-medium">
                          Invite member
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowInvite(false)
                            setInviteError('')
                            setEmail('')
                          }}
                          className="text-app-dim hover:text-app-muted"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="border-app-mid bg-app text-app placeholder:text-app-dim mb-2 w-full rounded border px-2 py-1.5 text-xs outline-none focus:border-[var(--coder-accent)]/50"
                      />
                      <div className="mb-2 flex gap-2">
                        {(['EDITOR', 'VIEWER'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
                              role === r
                                ? 'bg-app-card-hover text-[var(--coder-accent)]'
                                : 'text-app-dim hover:text-app-muted'
                            }`}
                          >
                            {r.charAt(0) + r.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                      {inviteError && (
                        <p className="mb-2 text-[11px] text-[#FF453A]">
                          {inviteError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={inviting || !email.trim()}
                        className="flex w-full items-center justify-center gap-1.5 rounded bg-[var(--coder-accent)] py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                      >
                        {inviting && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {inviting ? 'Inviting…' : 'Send invite'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Chat tab ─────────────────────────────────────────────────── */}
          {tab === 'chat' && (
            <div className="flex h-full flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                    <MessageSquare className="text-app-dim h-7 w-7" />
                    <p className="text-app-dim text-xs">No messages yet</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.userId === currentUserId
                  const color = colorFromUserId(msg.userId)
                  const time = new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color }}
                        >
                          {isMe ? 'You' : msg.userName || 'Unknown'}
                        </span>
                        <span className="text-app-dim text-[10px]">{time}</span>
                      </div>
                      {msg.type === 'code' ? (
                        <div className="w-[232px] overflow-hidden rounded-md border border-[var(--coder-border)]">
                          <div className="flex items-center justify-between bg-[var(--coder-bg-card-hover)] px-2 py-1">
                            <span className="font-mono text-[10px] text-[var(--coder-text-secondary)]">
                              {msg.language ?? 'code'}
                            </span>
                            <button
                              onClick={() => handleCopy(msg.content, msg.id)}
                              className="text-app-dim hover:text-app transition-colors"
                              title="Copy code"
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-3 w-3 text-[#32D74B]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <pre className="max-h-[140px] overflow-auto bg-[var(--coder-bg-surface)] px-2.5 py-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-[var(--coder-text-primary)]">
                            <code>{msg.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[200px] rounded-lg px-2.5 py-1.5 text-xs break-words ${
                            isMe
                              ? 'bg-[var(--coder-accent-glow)] text-[var(--coder-text-primary)]'
                              : 'bg-[var(--coder-bg-card-hover)] text-[var(--coder-text-primary)]'
                          }`}
                        >
                          {renderWithMentions(msg.content)}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat input */}
              <div className="border-app relative shrink-0 border-t p-2">
                {mentionQuery !== null &&
                  !isCodeMode &&
                  mentionSuggestions.length > 0 && (
                    <div className="border-app-mid bg-app-surface absolute right-2 bottom-full left-2 mb-1 overflow-hidden rounded-md border shadow-lg">
                      {mentionSuggestions.map((m) => (
                        <button
                          key={m.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            insertMention(m.name ?? m.id)
                          }}
                          className="hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-left"
                        >
                          <div
                            style={{
                              backgroundColor: colorFromUserId(m.id) + '28',
                              color: colorFromUserId(m.id),
                            }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                          >
                            {getInitials(m.name)}
                          </div>
                          <span className="text-app text-xs">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                {isCodeMode ? (
                  <div className="border-app-mid bg-app rounded-md border focus-within:border-[var(--coder-accent)]/50">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Paste code… (Ctrl+Enter to send)"
                      maxLength={4000}
                      rows={4}
                      className="text-app placeholder:text-app-dim w-full resize-none bg-transparent px-2 pt-2 pb-1 font-mono text-[11px] leading-relaxed outline-none"
                    />
                    <div className="flex items-center justify-between border-t border-[var(--coder-border)] px-2 py-1">
                      <span className="font-mono text-[10px] text-[var(--coder-text-secondary)]">
                        {editorLanguage}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setIsCodeMode(false)
                            setChatInput('')
                          }}
                          className="text-app-dim hover:text-app-muted text-[10px] transition-colors"
                        >
                          text
                        </button>
                        <button
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim()}
                          className="text-app-dim transition-colors hover:text-[var(--coder-accent)] disabled:opacity-30"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-app-mid bg-app flex items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:border-[var(--coder-accent)]/50">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setMentionQuery(null)
                          return
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (
                            mentionSuggestions.length > 0 &&
                            mentionQuery !== null
                          ) {
                            insertMention(
                              mentionSuggestions[0].name ??
                                mentionSuggestions[0].id
                            )
                            return
                          }
                          handleSendMessage()
                        }
                      }}
                      placeholder="Message… (@ to mention)"
                      maxLength={500}
                      className="text-app placeholder:text-app-dim min-w-0 flex-1 bg-transparent text-xs outline-none"
                    />
                    <button
                      onClick={() => {
                        setIsCodeMode(true)
                        setChatInput('')
                        setMentionQuery(null)
                      }}
                      className="text-app-dim transition-colors hover:text-[var(--coder-accent)]"
                      title="Share code snippet"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className="text-app-dim transition-colors hover:text-[var(--coder-accent)] disabled:opacity-30"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── History tab ───────────────────────────────────────────────── */}
          {tab === 'history' && (
            <div className="flex h-full flex-col">
              {/* Sub-tabs */}
              <div className="border-app flex shrink-0 border-b">
                {(
                  [
                    {
                      id: 'named' as HistorySubTab,
                      label: 'Named',
                      count: histNamed.length,
                      Icon: BookmarkCheck,
                    },
                    {
                      id: 'auto' as HistorySubTab,
                      label: 'Auto',
                      count: histAuto.length,
                      Icon: Clock,
                    },
                  ] as const
                ).map(({ id, label, count, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setHistSubTab(id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-medium transition-colors ${
                      histSubTab === id
                        ? 'border-[var(--coder-accent)] text-[var(--coder-accent)]'
                        : 'border-transparent text-[var(--coder-text-tertiary)] hover:text-[var(--coder-text-secondary)]'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] ${
                        histSubTab === id
                          ? 'bg-[var(--coder-accent)]/20 text-[var(--coder-accent)]'
                          : 'bg-[var(--coder-bg-card-hover)] text-[var(--coder-text-tertiary)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* List */}
              {histListLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="text-app-dim h-5 w-5 animate-spin" />
                </div>
              ) : histVisible.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
                  {histSubTab === 'named' ? (
                    <>
                      <BookmarkCheck className="text-app-dim h-7 w-7" />
                      <p className="text-app-dim text-xs">No named versions</p>
                      <p className="text-app-dim text-[10px]">
                        Use the bookmark button to save one
                      </p>
                    </>
                  ) : (
                    <>
                      <Clock className="text-app-dim h-7 w-7" />
                      <p className="text-app-dim text-xs">No auto-saves yet</p>
                      <p className="text-app-dim text-[10px]">
                        Auto-saves appear every 60s while editing
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto py-1">
                  {histVisible.map((snap) => (
                    <div
                      key={snap.id}
                      className="hover:bg-app-card-hover group flex w-full items-center gap-2 px-3 py-2.5 transition-colors"
                    >
                      <button
                        onClick={() => openHistDiff(snap)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <div className="shrink-0">
                          {snap.label ? (
                            <BookmarkCheck className="h-3.5 w-3.5 text-[var(--coder-accent)]" />
                          ) : (
                            <Clock className="text-app-dim h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-app truncate text-xs font-medium">
                            {snap.label ?? 'Auto-saved'}
                          </p>
                          <p className="text-app-dim mt-0.5 text-[10px]">
                            {formatDistanceToNow(new Date(snap.createdAt), {
                              addSuffix: true,
                            })}
                            {snap.createdBy?.name
                              ? ` · ${snap.createdBy.name}`
                              : ''}
                          </p>
                        </div>
                      </button>
                      {canSave && (
                        <button
                          onClick={(e) => deleteHistSnapshot(e, snap.id)}
                          disabled={histDeletingId === snap.id}
                          title="Delete snapshot"
                          className="text-app-dim invisible flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors group-hover:visible hover:bg-[var(--coder-bg-card-hover)] hover:text-red-400 disabled:opacity-50"
                        >
                          {histDeletingId === snap.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── History diff overlay ──────────────────────────────────────────── */}
      {(histSelected || histDiffLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              diffEditorRef.current?.setModel(null)
              setHistSelected(null)
            }}
          />
          <div
            className="border-app bg-app-surface relative z-10 flex h-full flex-col overflow-hidden border-l"
            style={{ width: histDiffWidth }}
          >
            {/* Resize handle */}
            <div
              onMouseDown={startHistResize}
              className="absolute top-0 left-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[var(--coder-accent)]/40"
            />

            {/* Overlay header */}
            <div className="border-app flex h-12 shrink-0 items-center justify-between border-b px-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHistSelected(null)
                    setHistConfirmRestore(false)
                  }}
                  className="text-app-dim hover:text-app mr-1 flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <h2 className="text-app text-sm font-semibold">
                  {histSelected
                    ? (histSelected.label ?? 'Auto-saved')
                    : 'Loading…'}
                </h2>
                {histSelected && (
                  <span className="text-app-dim text-xs">
                    {formatDistanceToNow(new Date(histSelected.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  diffEditorRef.current?.setModel(null)
                  setHistSelected(null)
                }}
                className="text-app-dim hover:text-app flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Diff body */}
            <div className="flex min-h-0 flex-1 flex-col">
              {histDiffLoading && (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="text-app-dim h-5 w-5 animate-spin" />
                </div>
              )}

              <div
                className="flex flex-1 flex-col"
                style={{ display: showDiff ? 'flex' : 'none' }}
              >
                {/* Diff toolbar */}
                <div className="border-app flex shrink-0 items-center justify-between border-b px-5 py-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-app-dim flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--coder-accent)]" />
                      Snapshot
                    </span>
                    <span className="text-app-dim flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#9bb955]" />
                      Current
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {histSelected?.createdBy?.name && (
                      <span className="text-app-dim text-xs">
                        by {histSelected.createdBy.name}
                      </span>
                    )}
                    {canSave &&
                      (histConfirmRestore ? (
                        <div className="flex items-center gap-2">
                          <span className="text-app-dim text-xs">
                            Restore this version?
                          </span>
                          <button
                            onClick={() =>
                              histSelected &&
                              restoreHistSnapshot(histSelected.id)
                            }
                            disabled={histRestoring}
                            className="flex items-center gap-1 rounded bg-[var(--coder-accent)]/15 px-2 py-1 text-xs font-medium text-[var(--coder-accent)] transition-colors hover:bg-[var(--coder-accent)]/25 disabled:opacity-50"
                          >
                            {histRestoring && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            Yes
                          </button>
                          <button
                            onClick={() => setHistConfirmRestore(false)}
                            className="text-app-dim rounded px-2 py-1 text-xs transition-colors hover:text-[var(--coder-text-primary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setHistConfirmRestore(true)}
                          disabled={histRestoring}
                          className="flex items-center gap-1.5 rounded bg-[var(--coder-bg-card-hover)] px-2.5 py-1 text-xs font-medium text-[var(--coder-text-primary)] transition-colors hover:bg-[var(--coder-bg-card-active)] disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </button>
                      ))}
                  </div>
                </div>

                <div className="flex-1">
                  <DiffEditor
                    original={histSelected?.content ?? ''}
                    modified={histCurrentContent}
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
                    onMount={(ed) => {
                      diffEditorRef.current = ed
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
