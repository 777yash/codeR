export const maxDuration = 60 // Vercel max for Hobby plan — model calls can be slow

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { verifyCsrfOrigin } from '@/lib/csrf'

const ENDPOINT = 'https://models.github.ai/inference/chat/completions'
// gpt-4o-mini: strict json_schema support, non-reasoning (no reasoning tokens
// eating the free-tier output cap), "Low" tier = higher daily request allowance.
// Env-overridable so a model deprecation doesn't require a code change.
const MODEL = process.env.GITHUB_MODELS_MODEL || 'openai/gpt-4o-mini'
const API_VERSION = '2026-03-10'
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
- "chat": the user is asking a question, wants an explanation, debugging help, a recommendation, or general/research discussion. Put your answer in "text" (focused; markdown allowed). Leave "files" empty ([]), "actions" empty ([]), and BOTH commands with an empty "mainItem".
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
- Output is capped (~4000 tokens). Keep scaffolds MINIMAL (fewest files, concise code, no boilerplate) and answers focused. Never get cut off mid-file.
- Always set "text": for "scaffold", a short (1-3 sentence) summary of what you created or changed; for "chat", the full answer.`

const requestSchema = z.object({
  prompt: z.string().min(1).max(2_000),
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

// Keep secret-bearing files out of the model context (injection + leak surface)
const SECRET_FILE = /(^|\/)\.env|\.(pem|key)$|secret|credential/i

const commandSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    mainItem: { type: 'string' },
    commands: { type: 'array', items: { type: 'string' } },
  },
  required: ['mainItem', 'commands'],
}

// OpenAI structured outputs (strict): every key must be in `required` and
// `additionalProperties: false` on every object. `actions` is always present ([] when empty).
const scaffoldSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    mode: { type: 'string', enum: ['chat', 'scaffold'] },
    text: { type: 'string' },
    files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          filename: { type: 'string' },
          contents: { type: 'string' },
        },
        required: ['filename', 'contents'],
      },
    },
    buildCommand: commandSchema,
    startCommand: commandSchema,
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          filename: { type: 'string' },
        },
        required: ['type', 'filename'],
      },
    },
  },
  required: [
    'mode',
    'text',
    'files',
    'buildCommand',
    'startCommand',
    'actions',
  ],
}

// strict json_schema returns valid JSON, but fall back defensively
export function parseAiResponse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const fenced =
      text.match(/```json\n([\s\S]*?)\n```/) ??
      text.match(/```\n([\s\S]*?)\n```/)
    if (fenced) {
      try {
        return JSON.parse(fenced[1])
      } catch {
        /* fall through */
      }
    }
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1))
      } catch {
        /* fall through */
      }
    }
    return null
  }
}

function buildContext(files: { name: string; content: string }[]): string {
  return files
    .filter((f) => f.content.trim().length > 0 && !SECRET_FILE.test(f.name))
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

  const token = process.env.GITHUB_MODELS_TOKEN
  if (!token) {
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

  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { prompt, existingFiles, history } = parsed.data

  const userContent =
    existingFiles && existingFiles.length > 0
      ? `Existing project files:\n${buildContext(existingFiles)}\n\nUser request: ${prompt}`
      : prompt

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...(history ?? []),
    { role: 'user', content: userContent },
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55_000)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'scaffold',
            strict: true,
            schema: scaffoldSchema,
          },
        },
        temperature: 0.2,
        // Free tier caps output ~4000 tokens/request — requesting more 400s
        max_completion_tokens: 4000,
      }),
    })

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500)
      console.error('[scaffold] github models error', res.status, detail)
      return NextResponse.json(
        { error: 'AI generation failed', details: `${res.status}: ${detail}` },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      choices?: {
        message?: { content?: string; refusal?: string }
        finish_reason?: string
      }[]
    }
    const choice = data.choices?.[0]
    if (choice?.message?.refusal) {
      return NextResponse.json(
        { error: choice.message.refusal, details: choice.message.refusal },
        { status: 502 }
      )
    }
    const content = choice?.message?.content ?? ''
    if (!content) {
      const reason = choice?.finish_reason
        ? `No output (finish_reason: ${choice.finish_reason})`
        : 'Model returned an empty response'
      console.error('[scaffold] empty response:', reason)
      return NextResponse.json(
        { error: reason, details: reason },
        { status: 502 }
      )
    }

    const scaffold = parseAiResponse(content)
    if (
      !scaffold ||
      typeof scaffold !== 'object' ||
      !Array.isArray((scaffold as { files?: unknown }).files)
    ) {
      console.error('[scaffold] unparseable response:', content.slice(0, 500))
      return NextResponse.json(
        {
          error: 'AI returned an unexpected response — try rephrasing',
          details:
            'Response was not valid scaffold JSON (it may have been truncated)',
        },
        { status: 502 }
      )
    }

    return NextResponse.json(scaffold)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[scaffold] error:', message)
    return NextResponse.json(
      { error: 'AI generation failed', details: message },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
