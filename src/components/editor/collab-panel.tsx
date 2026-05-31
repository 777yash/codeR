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
} from 'lucide-react'
import { toast } from 'sonner'
import { usePresence } from '@/hooks/use-presence'
import {
  sendChatMessage,
  subscribeToChatMessages,
  getChatMessages,
  type ChatMessageData,
} from '@/components/editor/editor-client'

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
}

function colorFromUserId(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `hsl(${hash % 360}, 80%, 60%)`
}

const ROLE_STYLE: Record<string, string> = {
  OWNER: 'text-[#FF2D55] bg-[rgba(255,45,85,0.12)]',
  EDITOR: 'text-[#32D74B] bg-[rgba(50,215,75,0.10)]',
  VIEWER: 'text-[#888888] bg-white/[0.05]',
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

type Tab = 'users' | 'chat' | 'history'

export function CollabPanel({
  roomId,
  members = [],
  currentUserId,
  currentUserName,
}: CollabPanelProps) {
  const [tab, setTab] = useState<Tab>('users')
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Chat state — lazy init reads current Yjs array before first subscriber fires
  const [messages, setMessages] = useState<ChatMessageData[]>(getChatMessages)
  const [chatInput, setChatInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribeToChatMessages((msgs) => setMessages([...msgs]))
    return unsub
  }, [])

  useEffect(() => {
    if (tab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, tab])

  const handleSendMessage = useCallback(() => {
    const content = chatInput.trim()
    if (!content || !currentUserId) return
    sendChatMessage({
      id: crypto.randomUUID(),
      userId: currentUserId,
      userName: currentUserName ?? currentUserId,
      content,
      timestamp: Date.now(),
    })
    setChatInput('')
  }, [chatInput, currentUserId, currentUserName])

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

  const tabs: { id: Tab; icon: React.ReactNode }[] = [
    { id: 'users', icon: <Users className="h-3 w-3" /> },
    { id: 'chat', icon: <MessageSquare className="h-3 w-3" /> },
    { id: 'history', icon: <History className="h-3 w-3" /> },
  ]

  return (
    <div className="border-app bg-app-surface flex w-[280px] shrink-0 flex-col overflow-hidden border-l">
      {/* Tab bar */}
      <div className="border-app flex h-10 shrink-0 items-stretch border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1 text-xs font-medium capitalize transition-colors ${
              tab === t.id
                ? 'text-app border-b-2 border-[#FF2D55]'
                : 'text-app-dim hover:text-app-muted'
            }`}
          >
            {t.icon}
            {t.id === 'users'
              ? `Users (${onlineMembers.length})`
              : t.id.charAt(0).toUpperCase() + t.id.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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

            {/* Offline members */}
            {offlineMembers.length > 0 && (
              <>
                <div className="border-app border-t px-4 pt-3 pb-1">
                  <p className="text-app-dim text-[10px] font-semibold tracking-widest uppercase">
                    Offline · {offlineMembers.length}
                  </p>
                </div>
                {offlineMembers.map((member) => {
                  const isMe = member.id === currentUserId
                  const roleStyle = ROLE_STYLE[member.role] ?? ROLE_STYLE.VIEWER
                  const roleLabel = ROLE_LABEL[member.role] ?? member.role
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-sm px-4 py-2.5 opacity-40"
                    >
                      <div className="text-app-dim flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-semibold">
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
                      <div className="h-2 w-2 shrink-0 rounded-full bg-[#444]" />
                    </div>
                  )
                })}
              </>
            )}

            {/* Invite section */}
            {canInvite && (
              <div className="px-3 py-2">
                {!showInvite ? (
                  <button
                    onClick={() => setShowInvite(true)}
                    className="border-app-mid text-app-muted flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors hover:border-[rgba(255,45,85,0.30)] hover:bg-[rgba(255,45,85,0.08)] hover:text-[#FF2D55]"
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
                      className="border-app-mid bg-app text-app placeholder:text-app-dim mb-2 w-full rounded border px-2 py-1.5 text-xs outline-none focus:border-[#FF2D55]/50"
                    />

                    <div className="mb-2 flex gap-2">
                      {(['EDITOR', 'VIEWER'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
                            role === r
                              ? 'bg-app-card-hover text-[#FF2D55]'
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
                      className="flex w-full items-center justify-center gap-1.5 rounded bg-[#FF2D55] py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                    >
                      {inviting && <Loader2 className="h-3 w-3 animate-spin" />}
                      {inviting ? 'Inviting…' : 'Send invite'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'chat' && (
          <div className="flex h-full flex-col">
            {/* Messages */}
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
                    <div
                      className={`max-w-[200px] rounded-lg px-2.5 py-1.5 text-xs break-words ${
                        isMe
                          ? 'bg-[rgba(255,45,85,0.15)] text-[#F0F0F0]'
                          : 'bg-white/[0.06] text-[#E0E0E0]'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-app shrink-0 border-t p-2">
              <div className="border-app-mid bg-app flex items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:border-[#FF2D55]/50">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Message…"
                  maxLength={500}
                  className="text-app placeholder:text-app-dim min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="text-app-dim transition-colors hover:text-[#FF2D55] disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <History className="text-app-card-hover h-8 w-8" />
            <p className="text-app-dim text-xs">Coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}
