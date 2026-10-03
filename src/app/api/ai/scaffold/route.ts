export const maxDuration = 60 // Vercel max for Hobby plan — model calls can be slow

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserRoomRole } from '@/lib/api/room-access'
import { checkRoomAiRateLimit } from '@/lib/rate-limit-redis'
import { verifyCsrfOrigin } from '@/lib/csrf'
import {
  callGroqModel,
  DEFAULT_GROQ_MODEL,
  GroqHttpError,
  groqModelSchema,
  type GroqMessage,
} from '@/lib/groq'
import { isSensitiveAiFile } from '@/lib/ai-context'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_CONTEXT_FILES = 4
const MAX_CONTEXT_CHARS = 4_000

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

const SYSTEM_INSTRUCTION = `You are an AI assistant inside a collaborative code editor. You help with the user's project: answering questions, explaining and debugging code, discussing approaches and research, AND scaffolding or modifying runnable projects when asked. The runtime is an in-browser Node.js sandbox (WebContainer).

Choose a "mode" for every request:
- "chat": the user is asking a question, wants an explanation, debugging help, a recommendation, or general/research discussion. Put your answer in "text" (focused; markdown allowed). Leave "files" empty ([]), "actions" empty ([]), and set BOTH commands to { "mainItem": "", "commands": [] }.
- "scaffold": the user asks you to build, create, add, or change a runnable project. Fill "files" and the commands.

For "scaffold" mode:
- "files": array of { "filename", "contents" }. filename MAY include nested paths like "src/index.js". Generate EVERY file the project needs to run — never leave it empty. Put the RAW file text in "contents" — do NOT add extra backslash escaping; the JSON encoding handles newlines and quotes. For .json files like package.json, write normal JSON ({ "name": "app", ... }), never a pre-escaped string.
- "buildCommand": { "mainItem": "npm", "commands": ["install"] }
- "startCommand": { "mainItem": "npm", "commands": ["run", "dev"] } — prefer an npm "dev"/"start" script; use { "mainItem": "node", "commands": ["index.js"] } only for a single-file program with no package.json.
- "actions": array of { "type": "delete", "filename": "old.js" } to remove files when editing an existing project. Use [] when nothing is removed.
- If the user asks to delete/clear/remove the project or files and you are NOT creating anything runnable: list every file to remove in "actions", leave "files" empty ([]), and set BOTH commands' "mainItem" to "" so nothing runs.

Rules:
- The sandbox runs Node.js. For web apps prefer a dev server that binds 0.0.0.0 and prints a URL (Express, or Vite for frontend).
- If you scaffold a Vite project, pin "vite": "^7.0.0" in package.json devDependencies. Do NOT use Vite 8 — its rolldown bundler crashes in this sandbox.
- React + Vite specifics (get these EXACTLY right or the app won't boot):
  - Put JSX ONLY in files ending ".jsx" or ".tsx". NEVER write JSX in a ".js" file — esbuild parses ".js" as plain JS and the build fails.
  - The entry is "src/main.jsx". "index.html" at the project root must load it: <script type="module" src="/src/main.jsx"></script>.
  - Include "@vitejs/plugin-react" in devDependencies AND a "vite.config.js" that registers it. The dev server runs inside an in-browser sandbox and is previewed through a *.webcontainer-api.io host, so the config MUST allow it: import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()], server: { host: true, allowedHosts: true } }). Without server.host + server.allowedHosts the preview is blocked and stays blank.
  - Include "react" and "react-dom" in dependencies.
- Every import path MUST resolve to a file you actually generate. Use correct relative paths: a file in "src/" imports a sibling as "./Name", NOT "./src/Name". Re-check each import against your file list before finalizing.
- Output is capped (~4000 tokens per response). Keep scaffolds MINIMAL (fewest files, concise code, no boilerplate) and answers focused. If the request would exceed the cap, CUT optional features/styling — a smaller COMPLETE project always beats a truncated one. Every file you emit must be complete and runnable; never stop mid-file.
- Always set "text": for "scaffold", a short (1-3 sentence) summary of what you created or changed; for "chat", the full answer.
- Return ONLY a valid JSON object matching the supplied schema. No markdown fences, introductory prose, or reasoning tags outside the JSON.`

const requestSchema = z.object({
  prompt: z.string().min(1).max(2_000),
  roomId: z.string().min(1),
  // 'chat' = typed into the shared room chat (@ai) → audit-logged; 'panel' =
  // the private AI tab → not logged (it's one user's scratchpad). Default panel.
  source: z.enum(['chat', 'panel']).optional(),
  existingFiles: z
    .array(z.object({ name: z.string(), content: z.string() }))
    .optional(),
  // Prior turns (summaries + prompts) so "now add auth" understands the context
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4_000),
      })
    )
    .max(10)
    .optional(),
})

const commandSchema = z.strictObject({
  mainItem: z.string().max(256),
  commands: z.array(z.string().max(2048)).max(50),
})

const responseSchema = z
  .strictObject({
    mode: z.enum(['chat', 'scaffold']),
    text: z.string().max(100_000),
    files: z
      .array(
        z.strictObject({
          filename: z.string().min(1).max(1024),
          contents: z.string().max(250_000),
        })
      )
      .max(100),
    buildCommand: commandSchema,
    startCommand: commandSchema,
    actions: z
      .array(
        z.strictObject({
          type: z.literal('delete'),
          filename: z.string().min(1).max(1024),
        })
      )
      .max(100),
  })
  .refine(
    (value) =>
      value.mode !== 'chat' ||
      (value.files.length === 0 &&
        value.actions.length === 0 &&
        !value.buildCommand.mainItem &&
        value.buildCommand.commands.length === 0 &&
        !value.startCommand.mainItem &&
        value.startCommand.commands.length === 0),
    { message: 'Chat responses cannot modify files or run commands' }
  )

// Provider schema uses the portable structural subset. Local validation above
// additionally enforces size limits and chat-only restrictions.
const providerCommandSchema = z.strictObject({
  mainItem: z.string(),
  commands: z.array(z.string()),
})
const scaffoldSchema = z.toJSONSchema(
  z.strictObject({
    mode: z.enum(['chat', 'scaffold']),
    text: z.string(),
    files: z.array(
      z.strictObject({ filename: z.string(), contents: z.string() })
    ),
    buildCommand: providerCommandSchema,
    startCommand: providerCommandSchema,
    actions: z.array(
      z.strictObject({ type: z.enum(['delete']), filename: z.string() })
    ),
  })
)

function buildContext(files: { name: string; content: string }[]): string {
  return files
    .filter((f) => f.content.trim().length > 0 && !isSensitiveAiFile(f.name))
    .slice(0, MAX_CONTEXT_FILES)
    .map((f) => `--- ${f.name} ---\n${f.content.slice(0, MAX_CONTEXT_CHARS)}`)
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.GROQ_API_KEY?.trim()
  const model = groqModelSchema.safeParse(
    process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL
  )
  if (!token || !model.success) {
    return NextResponse.json(
      { error: 'AI scaffolding is not configured' },
      { status: 503 }
    )
  }

  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — try again in a minute' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { prompt, roomId, source, existingFiles, history } = parsed.data

  // Room access: the request ships the room's files to the model, so the caller
  // MUST be a member who can edit. Closes the gap where any authed user could
  // read another room's code via this route.
  const role = await getUserRoomRole(roomId, session.user.id)
  if (!role || role === 'VIEWER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { aiChatEnabled: true },
  })
  if (!room?.aiChatEnabled) {
    return NextResponse.json(
      { error: 'AI is disabled for this room' },
      { status: 403 }
    )
  }
  if (!(await checkRoomAiRateLimit(roomId))) {
    return NextResponse.json(
      { error: 'Room AI limit reached — try again later' },
      { status: 429 }
    )
  }

  const userContent =
    existingFiles && existingFiles.length > 0
      ? `Existing project files:\n${buildContext(existingFiles)}\n\nUser request: ${prompt}`
      : prompt

  const messages: GroqMessage[] = [
    {
      role: 'system',
      content: SYSTEM_INSTRUCTION,
    },
    ...(history ?? []),
    { role: 'user', content: userContent },
  ]

  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(55_000)])

  try {
    const choice = await callGroqModel(
      token,
      model.data,
      messages,
      scaffoldSchema,
      signal
    )
    if (choice?.message?.refusal) {
      return NextResponse.json(
        { error: choice.message.refusal, details: choice.message.refusal },
        { status: 502 }
      )
    }
    const content = choice?.message?.content ?? ''
    if (!content) {
      const reason = 'Model returned an empty response'
      console.error('[scaffold] empty response')
      return NextResponse.json(
        { error: reason, details: reason },
        { status: 502 }
      )
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(content)
    } catch {
      decoded = null
    }
    const parsedResponse = responseSchema.safeParse(decoded)
    if (!parsedResponse.success || choice.finish_reason !== 'stop') {
      console.error('[scaffold] invalid or truncated Groq response')
      return NextResponse.json(
        {
          error: 'AI returned an unexpected response — try rephrasing',
          details:
            'Response did not match the required JSON schema or was truncated',
        },
        { status: 502 }
      )
    }
    const scaffold = parsedResponse.data

    // Audit log @ai chat actions only (shared/public surface). The private AI
    // panel is a per-user scratchpad — don't write its prompts to a room log.
    if (source === 'chat') {
      try {
        await prisma.aiActionLog.create({
          data: {
            roomId,
            userId: session.user.id,
            actionType: scaffold.mode === 'scaffold' ? 'scaffold' : 'chat',
            prompt: prompt.slice(0, 2_000),
            filesChanged: scaffold.files.length,
          },
        })
      } catch (logErr) {
        console.error('[scaffold] audit log failed', logErr)
      }
    }

    return NextResponse.json(scaffold)
  } catch (err) {
    if (err instanceof GroqHttpError && err.status === 429) {
      return NextResponse.json(
        {
          error:
            'AI provider rate limit reached — try again later or shorten the request',
        },
        { status: 429, headers: { 'Retry-After': String(err.retryAfter) } }
      )
    }
    if (signal.aborted) {
      return NextResponse.json(
        {
          error: req.signal.aborted
            ? 'Request cancelled'
            : 'AI generation timed out',
        },
        { status: req.signal.aborted ? 499 : 504 }
      )
    }
    // Network/SDK errors can echo inputs; log only safe provider status metadata.
    console.error('[scaffold] generation failed', {
      upstreamStatus: err instanceof GroqHttpError ? err.status : undefined,
    })
    return NextResponse.json(
      { error: 'AI generation failed — try again later' },
      { status: 502 }
    )
  }
}
