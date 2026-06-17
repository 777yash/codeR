'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Send,
  Loader2,
  FileCode,
  AlertCircle,
  Play,
  Square,
  Trash2,
  RotateCcw,
  Terminal,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { getAllFilesContent } from '@/components/editor/editor-client'
import {
  applyScaffold,
  runScaffold,
  type ScaffoldResponse,
} from '@/lib/ai-scaffold-apply'

interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind?: 'chat' | 'scaffold'
  files?: string[]
  status?: 'generating' | 'done' | 'error'
  ran?: boolean
}

interface AiPanelProps {
  roomId: string
  canScaffold: boolean
}

type FailReason =
  | 'not_configured'
  | 'rate_limited'
  | 'generation'
  | 'network'
  | 'stopped'

const EXAMPLES = [
  'Explain what the code in this room does',
  'How do I add WebSocket support to this?',
  'Build an Express API with a /hello route',
]

function storageKey(roomId: string): string {
  return `coder-ai-chat:${roomId}`
}

// Prior turns (user prompts + assistant answers) so follow-ups keep context
function buildHistory(
  messages: AiMessage[]
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter(
      (m) =>
        (m.role === 'user' ||
          (m.status === 'done' && m.role === 'assistant')) &&
        m.content.trim().length > 0
    )
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content }))
}

export function AiPanel({ roomId, canScaffold }: AiPanelProps) {
  const posthog = usePostHog()
  // Lazy init is safe: this panel only mounts after a client-side tab switch
  // (the parent's tab defaults to 'users'), so it never server-renders.
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey(roomId))
      return raw ? (JSON.parse(raw) as AiMessage[]) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
    try {
      localStorage.setItem(storageKey(roomId), JSON.stringify(messages))
    } catch {
      /* quota / unavailable — non-fatal */
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, roomId])

  const run = useCallback(
    async (prompt: string) => {
      const userMsg: AiMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
      }
      const pendingId = crypto.randomUUID()
      const pendingMsg: AiMessage = {
        id: pendingId,
        role: 'assistant',
        content: '',
        status: 'generating',
      }
      const history = buildHistory(messagesRef.current)
      setMessages((prev) => [...prev, userMsg, pendingMsg])
      setInput('')
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller
      const startedAt = performance.now()

      const patch = (changes: Partial<AiMessage>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, ...changes } : m))
        )
      const fail = (content: string, reason: FailReason) => {
        patch({ status: 'error', content })
        posthog?.capture('ai_scaffold_failed', { reason })
      }

      try {
        const res = await fetch('/api/ai/scaffold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            prompt,
            roomId,
            source: 'panel',
            existingFiles: getAllFilesContent(),
            history,
          }),
        })

        if (!res.ok) {
          const { error, details } = (await res.json().catch(() => ({}))) as {
            error?: string
            details?: string
          }
          const reason: FailReason =
            res.status === 503
              ? 'not_configured'
              : res.status === 429
                ? 'rate_limited'
                : 'generation'
          fail(
            res.status === 503
              ? 'AI is not configured on this server.'
              : (details ?? error ?? 'Request failed.'),
            reason
          )
          return
        }

        const result = (await res.json()) as ScaffoldResponse
        const latency_ms = Math.round(performance.now() - startedAt)

        if (result.mode === 'chat') {
          patch({ status: 'done', kind: 'chat', content: result.text })
          posthog?.capture('ai_chat_answered', { latency_ms })
          return
        }

        const count = applyScaffold(result)
        const ran = await runScaffold(result)
        patch({
          status: 'done',
          kind: 'scaffold',
          content: result.text,
          files: result.files.map((f) => f.filename),
          ran,
        })
        posthog?.capture('ai_scaffold_generated', {
          file_count: count,
          ran,
          latency_ms,
        })
      } catch (err) {
        const stopped = err instanceof DOMException && err.name === 'AbortError'
        fail(
          stopped ? 'Generation stopped.' : 'Network error — try again.',
          stopped ? 'stopped' : 'network'
        )
      } finally {
        abortRef.current = null
        setBusy(false)
      }
    },
    [posthog, roomId]
  )

  const clearConversation = useCallback(() => {
    setMessages([])
    try {
      localStorage.removeItem(storageKey(roomId))
    } catch {
      /* non-fatal */
    }
  }, [roomId])

  const submit = useCallback(
    (rawPrompt: string) => {
      const prompt = rawPrompt.trim()
      if (!prompt || busy || !canScaffold) return
      // /clear slash command — wipe the conversation, don't call the model
      if (prompt.toLowerCase() === '/clear') {
        clearConversation()
        setInput('')
        return
      }
      void run(prompt)
    },
    [busy, canScaffold, run, clearConversation]
  )

  const regenerate = useCallback(() => {
    const lastUser = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === 'user')
    if (lastUser && !busy) void run(lastUser.content)
  }, [busy, run])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  if (!canScaffold) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <Sparkles className="text-app-dim h-7 w-7" />
        <p className="text-app-dim text-xs">
          Viewers can&apos;t use the AI assistant
        </p>
      </div>
    )
  }

  const last = messages[messages.length - 1]
  const canRegenerate =
    !busy &&
    last?.role === 'assistant' &&
    (last.status === 'done' || last.status === 'error')

  return (
    <div className="flex h-full flex-col">
      {messages.length > 0 && (
        <div className="border-app flex shrink-0 items-center justify-between border-b px-3 py-1.5">
          <span className="text-app-dim text-[10px] font-semibold tracking-wide uppercase">
            AI Assistant
          </span>
          <button
            onClick={clearConversation}
            disabled={busy}
            className="text-app-dim flex items-center gap-1 text-[10px] transition-colors hover:text-[#FF453A] disabled:opacity-30"
            title="Clear conversation"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 py-10 text-center">
            <Sparkles className="text-app-dim h-7 w-7" />
            <p className="text-app-dim text-xs">
              Ask about your code, research an idea, or describe a project to
              build.
            </p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="border-app-mid text-app-muted rounded-md border px-2.5 py-1.5 text-[11px] transition-colors hover:border-[var(--coder-border-accent)] hover:text-[var(--coder-accent)]"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[210px] rounded-lg bg-[var(--coder-accent-glow)] px-2.5 py-1.5 text-xs break-words text-[var(--coder-text-primary)]">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[var(--coder-accent)]" />
                <span className="text-[10px] font-semibold text-[var(--coder-accent)]">
                  AI
                </span>
              </div>

              {msg.status === 'generating' && (
                <div className="text-app-dim flex items-center gap-1.5 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking…
                </div>
              )}

              {msg.status === 'error' && (
                <div className="flex items-start gap-1.5 text-xs text-[#FF453A]">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="break-words">{msg.content}</span>
                </div>
              )}

              {msg.status === 'done' && (
                <>
                  <p className="text-app text-xs break-words whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  {msg.kind === 'scaffold' &&
                    msg.files &&
                    msg.files.length > 0 && (
                      <>
                        <div className="flex flex-col gap-1">
                          {msg.files.map((name) => (
                            <div
                              key={name}
                              className="text-app-muted flex items-center gap-1.5 rounded bg-[var(--coder-bg-card-hover)] px-2 py-1 font-mono text-[10px]"
                            >
                              <FileCode className="h-3 w-3 shrink-0" />
                              <span className="truncate">{name}</span>
                            </div>
                          ))}
                        </div>
                        {msg.ran ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#32D74B]">
                            <Play className="h-2.5 w-2.5" />
                            Running in terminal
                          </div>
                        ) : (
                          <div className="text-app-dim flex items-center gap-1.5 text-[10px]">
                            <Terminal className="h-2.5 w-2.5" />
                            Files applied — open the terminal to run.
                          </div>
                        )}
                      </>
                    )}
                </>
              )}
            </div>
          )
        )}

        {canRegenerate && (
          <button
            onClick={regenerate}
            className="border-app-mid text-app-muted mx-auto flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors hover:border-[var(--coder-border-accent)] hover:text-[var(--coder-accent)]"
          >
            <RotateCcw className="h-3 w-3" />
            Regenerate
          </button>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-app shrink-0 border-t p-2">
        <div className="border-app-mid bg-app rounded-md border focus-within:border-[var(--coder-accent)]/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(input)
              }
            }}
            placeholder="Ask a question or describe a project…  (/clear to reset)"
            maxLength={2000}
            rows={3}
            disabled={busy}
            className="text-app placeholder:text-app-dim w-full resize-none bg-transparent px-2 pt-2 pb-1 text-xs outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-end border-t border-[var(--coder-border)] px-2 py-1">
            {busy ? (
              <button
                onClick={stop}
                className="flex items-center gap-1 text-[10px] text-[#FF453A] transition-opacity hover:opacity-80"
                title="Stop generation"
              >
                <Square className="h-3 w-3 fill-current" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => submit(input)}
                disabled={!input.trim()}
                className="text-app-dim transition-colors hover:text-[var(--coder-accent)] disabled:opacity-30"
                title="Send (Enter)"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
