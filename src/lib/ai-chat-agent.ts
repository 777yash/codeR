import {
  sendChatMessage,
  updateChatMessage,
  getAllFilesContent,
  signalAiAbort,
  clearAiControl,
  subscribeAiControl,
} from '@/components/editor/editor-client'
import {
  applyScaffold,
  runScaffold,
  formatCommand,
  type ScaffoldResponse,
} from '@/lib/ai-scaffold-apply'
import { runInTerminal } from '@/components/editor/terminal-panel'
import { normalizeNpxCommand } from '@/lib/webcontainer-run'

// Word-boundary so a user named "aiden" (@aiden) doesn't trigger; matches @ai
// anywhere in the message.
const AI_TRIGGER = /(^|\s)@ai\b/i

export function messageTriggersAi(content: string): boolean {
  return AI_TRIGGER.test(content)
}

/** Strip the first @ai token, return the remaining instruction. */
export function extractAiPrompt(content: string): string {
  return content.replace(/@ai\b/i, '').replace(/\s+/g, ' ').trim()
}

type Capture = (event: string, props?: Record<string, unknown>) => void

interface AiTriggerCtx {
  roomId: string
  triggeredBy: string
  prompt: string
  capture?: Capture
}

// reqId → controller, so the abort observer (and a same-browser Stop) can cancel
// the in-flight fetch. Owner Stop from another browser routes through the Yjs
// control map instead (see requestAiAbort).
const controllers = new Map<string, AbortController>()

/** Owner/triggerer Stop → flags the shared control map; the triggering client
 * observes it and aborts. Same call works from any browser. */
export function requestAiAbort(reqId: string): void {
  signalAiAbort(reqId)
}

type FailReason = 'not_configured' | 'rate_limited' | 'generation' | 'network'

/**
 * Runs an @ai action triggered from the shared room chat. ONLY the client that
 * sent the message calls this (natural single-executor election — one browser
 * typed @ai), so the AI reply is generated once and written back into the Yjs
 * chat array for every collaborator to see.
 */
export async function handleAiChatTrigger(ctx: AiTriggerCtx): Promise<void> {
  const { roomId, triggeredBy, prompt, capture } = ctx
  const reqId = crypto.randomUUID()
  const aiMsgId = crypto.randomUUID()

  // Pending AI bubble — lands in every collaborator's chat as "AI is thinking…"
  sendChatMessage({
    id: aiMsgId,
    userId: 'ai',
    userName: 'AI',
    content: '',
    timestamp: Date.now(),
    ai: { status: 'generating', triggeredBy, reqId },
  })

  // `@ai run <cmd>` — deterministic shell exec, no model call.
  const runMatch = /^run\s+([\s\S]+)/i.exec(prompt)
  if (runMatch) {
    const cmd = runMatch[1].trim()
    runInTerminal(normalizeNpxCommand(cmd))
    updateChatMessage(aiMsgId, {
      content: `Ran \`${cmd}\` in the terminal.`,
      ai: { status: 'done', kind: 'chat', triggeredBy, reqId },
    })
    capture?.('ai_chat_triggered', { intent: 'run' })
    return
  }

  const controller = new AbortController()
  controllers.set(reqId, controller)
  const unsub = subscribeAiControl((abortedReqId) => {
    if (abortedReqId === reqId) controller.abort()
  })

  const fail = (content: string, reason: FailReason) => {
    updateChatMessage(aiMsgId, {
      content,
      ai: { status: 'error', triggeredBy, reqId },
    })
    capture?.('ai_chat_failed', { reason })
  }

  try {
    const res = await fetch('/api/ai/scaffold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        prompt,
        roomId,
        source: 'chat',
        existingFiles: getAllFilesContent(),
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
          : res.status === 403
            ? 'AI is disabled for this room.'
            : (details ?? error ?? 'Request failed.'),
        reason
      )
      return
    }

    const result = (await res.json()) as ScaffoldResponse

    if (result.mode === 'chat') {
      updateChatMessage(aiMsgId, {
        content: result.text,
        ai: { status: 'done', kind: 'chat', triggeredBy, reqId },
      })
      capture?.('ai_chat_triggered', { intent: 'chat' })
      return
    }

    // Scaffold: files sync to all collaborators via Yjs; the run happens in the
    // triggering browser's container. Other members get a "Run here" button.
    const count = applyScaffold(result)
    const ran = await runScaffold(result)
    updateChatMessage(aiMsgId, {
      content: result.text,
      ai: {
        status: 'done',
        kind: 'scaffold',
        triggeredBy,
        reqId,
        files: result.files.map((f) => f.filename),
        buildCommand: formatCommand(result.buildCommand) ?? undefined,
        startCommand: formatCommand(result.startCommand) ?? undefined,
      },
    })
    capture?.('ai_chat_triggered', {
      intent: 'scaffold',
      file_count: count,
      ran,
    })
  } catch (err) {
    const stopped = err instanceof DOMException && err.name === 'AbortError'
    if (stopped) {
      updateChatMessage(aiMsgId, {
        content: 'Generation stopped.',
        ai: { status: 'error', triggeredBy, reqId },
      })
    } else {
      fail('Network error — try again.', 'network')
    }
  } finally {
    controllers.delete(reqId)
    clearAiControl(reqId)
    unsub()
  }
}

/**
 * Re-run a scaffold's build+start in THIS browser's container (files already
 * synced via Yjs). Used by the "Run here" button other collaborators see.
 */
export function runScaffoldHere(build?: string, start?: string): void {
  const combined = [build, start].filter(Boolean).join(' && ')
  if (combined) runInTerminal(normalizeNpxCommand(combined))
}
