import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { z } from 'zod'
import { getUserRoomRole } from '@/lib/api/room-access'
import { prisma } from '@/lib/prisma'
import { reserveInlineAiQuota } from '@/lib/inline-ai-quota'
import { isSensitiveAiFile } from '@/lib/ai-context'
import { readLimitedJson, RequestBodyError } from '@/lib/limited-json'

export const maxDuration = 20

const requestSchema = z.object({
  roomId: z.string().min(1).max(128),
  filename: z.string().min(1).max(1024),
  prefix: z.string().max(16000),
  suffix: z.string().max(8000).default(''),
  language: z.string().max(64).default(''),
  otherFiles: z
    .array(
      z.object({
        name: z.string().min(1).max(1024),
        content: z.string().max(8000),
      })
    )
    .max(3)
    .default([]),
})

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({ content: z.string().max(8192).optional() })
          .optional(),
        text: z.string().max(8192).optional(),
      })
    )
    .min(1),
})

function failure(status: number, error: string, retryAfter?: number) {
  return NextResponse.json(
    { completion: '', error },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
      },
    }
  )
}

const LANG_FILENAME: Record<string, string> = {
  javascript: 'script.js',
  typescript: 'script.ts',
  python: 'script.py',
  java: 'Main.java',
  cpp: 'main.cpp',
  c: 'main.c',
  csharp: 'Program.cs',
  go: 'main.go',
  rust: 'main.rs',
  ruby: 'script.rb',
  php: 'index.php',
  swift: 'main.swift',
  kotlin: 'Main.kt',
  scala: 'Main.scala',
  r: 'script.r',
  shell: 'script.sh',
  lua: 'script.lua',
  dart: 'main.dart',
}

const HASH_COMMENT_LANGS = new Set(['python', 'ruby', 'r', 'shell', 'perl'])

function lineComment(lang: string, text: string): string {
  return HASH_COMMENT_LANGS.has(lang) ? `# ${text}` : `// ${text}`
}

// Smart prefix: always include file header (imports/top-level) + recent lines near cursor
const HEADER_LINES = 20
const RECENT_LINES = 60
const SUFFIX_LINES = 30
const OTHER_FILE_LINES = 60
const MAX_OTHER_FILES = 3

function buildPrefix(raw: string, lang: string): string {
  const lines = raw.split('\n')
  if (lines.length <= HEADER_LINES + RECENT_LINES) return raw

  const header = lines.slice(0, HEADER_LINES)
  const recentStart = lines.length - RECENT_LINES
  // No gap between header and recent — just return raw
  if (recentStart <= HEADER_LINES) return raw

  const recent = lines.slice(recentStart)
  const sep = lineComment(lang, '...')
  return [...header, sep, ...recent].join('\n')
}

function buildSuffix(raw: string): string {
  const lines = raw.split('\n')
  return lines.slice(0, SUFFIX_LINES).join('\n')
}

function buildContextBlocks(
  otherFiles: { name: string; content: string }[],
  lang: string
): string {
  return otherFiles
    .slice(0, MAX_OTHER_FILES)
    .filter((f) => f.content.trim().length > 0)
    .map((f) => {
      const lines = f.content.split('\n').slice(0, OTHER_FILE_LINES).join('\n')
      const open = lineComment(lang, `=== context: ${f.name} ===`)
      const close = lineComment(lang, `=== end: ${f.name} ===`)
      return `${open}\n${lines}\n${close}`
    })
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ completion: '' }, { status: 401 })
  }

  let input: unknown
  try {
    input = await readLimitedJson(req, 128 * 1024)
  } catch (error) {
    return failure(
      error instanceof RequestBodyError ? error.status : 400,
      'Invalid request body'
    )
  }
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return failure(400, 'Invalid completion request')
  const {
    roomId,
    filename: activeFilename,
    prefix,
    suffix,
    language,
    otherFiles,
  } = parsed.data
  const role = await getUserRoomRole(roomId, session.user.id)
  if (!role || role === 'VIEWER') return failure(403, 'Forbidden')
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { aiChatEnabled: true },
  })
  if (!room?.aiChatEnabled) return failure(403, 'AI is disabled for this room')
  if (isSensitiveAiFile(activeFilename))
    return failure(403, 'AI is disabled for sensitive files')
  const key = process.env.CODESTRAL_API_KEY?.trim()
  if (!key) return failure(503, 'Inline completions are not configured')

  try {
    req.signal.throwIfAborted()
    const quota = await reserveInlineAiQuota(
      session.user.id,
      roomId,
      req.signal
    )
    if (!quota.allowed)
      return failure(429, 'Inline AI quota exceeded', quota.retryAfter)
  } catch {
    return failure(
      req.signal.aborted ? 499 : 503,
      'Inline AI quota is unavailable'
    )
  }

  const lang = language ?? ''
  const filename = lang ? (LANG_FILENAME[lang] ?? 'file') : 'file'
  const fileHeader = lang ? `${lineComment(lang, `File: ${filename}`)}\n` : ''

  const contextBlocks =
    otherFiles && otherFiles.length > 0
      ? buildContextBlocks(
          otherFiles.filter((file) => !isSensitiveAiFile(file.name)),
          lang
        ) + '\n\n'
      : ''

  const prompt = contextBlocks + fileHeader + buildPrefix(prefix, lang)

  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(8000)])
  try {
    signal.throwIfAborted()
    const res = await fetch('https://codestral.mistral.ai/v1/fim/completions', {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'codestral-latest',
        prompt,
        suffix: buildSuffix(suffix ?? ''),
        max_tokens: 128,
        stop: ['```'],
      }),
    })

    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined)
      return failure(502, 'Inline completion provider is unavailable')
    }

    const parsed = completionSchema.safeParse(
      await readLimitedJson(res, 64 * 1024)
    )
    if (!parsed.success)
      return failure(502, 'Invalid inline completion response')
    const data = parsed.data
    const completion =
      data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? ''
    return NextResponse.json(
      { completion },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return failure(
      req.signal.aborted ? 499 : signal.aborted ? 504 : 502,
      'Inline completion failed'
    )
  }
}
