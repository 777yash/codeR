export const maxDuration = 60 // Vercel max for Hobby plan

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canPerform } from '@/lib/room-permissions'
import { getUserRoomRole } from '@/lib/api/room-access'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { normalizeRemoteExecution } from '@/lib/execution-result'

const ONECOMPILER_URL = 'https://onecompiler-apis.p.rapidapi.com/api/v1/run'
const MAX_CODE_LENGTH = 50_000
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

// Monaco language → { onecompiler slug, filename }
// javascript maps to nodejs (full Node.js runtime, not browser JS)
// java: file MUST be Main.java, public class MUST be named Main
const LANG_MAP: Record<string, { language: string; filename: string }> = {
  python: { language: 'python', filename: 'index.py' },
  javascript: { language: 'nodejs', filename: 'index.js' },
  typescript: { language: 'typescript', filename: 'index.ts' },
  java: { language: 'java', filename: 'Main.java' },
  cpp: { language: 'cpp', filename: 'index.cpp' },
  c: { language: 'c', filename: 'index.c' },
  csharp: { language: 'csharp', filename: 'index.cs' },
  go: { language: 'go', filename: 'main.go' },
  rust: { language: 'rust', filename: 'index.rs' },
  ruby: { language: 'ruby', filename: 'index.rb' },
  php: { language: 'php', filename: 'index.php' },
  swift: { language: 'swift', filename: 'index.swift' },
  kotlin: { language: 'kotlin', filename: 'index.kt' },
  scala: { language: 'scala', filename: 'Main.scala' },
  r: { language: 'r', filename: 'index.r' },
  bash: { language: 'bash', filename: 'index.sh' },
  lua: { language: 'lua', filename: 'index.lua' },
  perl: { language: 'perl', filename: 'index.pl' },
  haskell: { language: 'haskell', filename: 'index.hs' },
  elixir: { language: 'elixir', filename: 'index.exs' },
  clojure: { language: 'clojure', filename: 'index.clj' },
  dart: { language: 'dart', filename: 'index.dart' },
  julia: { language: 'julia', filename: 'index.jl' },
  sql: { language: 'sqlite', filename: 'index.sql' },
  matlab: { language: 'octave', filename: 'index.m' },
  cobol: { language: 'cobol', filename: 'index.cob' },
  fortran: { language: 'fortran', filename: 'index.f90' },
  vbnet: { language: 'vb', filename: 'index.vb' },
  assembly: { language: 'assembly', filename: 'index.asm' },
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): {
  allowed: boolean
  retryAfter?: number
} {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return { allowed: true }
}

const executeSchema = z.object({
  roomId: z.string().min(1),
  language: z.string().min(1),
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        content: z.string().max(MAX_CODE_LENGTH),
      })
    )
    .min(1)
    .max(20),
  stdin: z.string().max(10_000).optional(),
})

export async function POST(req: Request) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json().catch(() => null)
  const parsed = executeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { roomId, language, files: inputFiles, stdin = '' } = parsed.data

  const langConfig = LANG_MAP[language]
  if (!langConfig) {
    return NextResponse.json(
      { error: `Language '${language}' not supported` },
      { status: 400 }
    )
  }

  const role = await getUserRoomRole(roomId, userId)
  if (!role || !canPerform('run', role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rateLimit = checkRateLimit(userId)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    )
  }

  const apiKey = process.env.ONECOMPILER_RAPIDAPI_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Execution service not configured' },
      { status: 502 }
    )
  }

  const startMs = Date.now()
  let execRes: Response
  const abort = new AbortController()
  const abortTimer = setTimeout(() => abort.abort(), 55_000)

  try {
    execRes = await fetch(ONECOMPILER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'onecompiler-apis.p.rapidapi.com',
      },
      body: JSON.stringify({
        language: langConfig.language,
        stdin,
        files: inputFiles.map((f) => ({
          name:
            language === 'go' && inputFiles.length === 1
              ? langConfig.filename
              : language === 'scala' &&
                  inputFiles.length === 1 &&
                  ['main.scala', 'index.scala'].includes(f.name) &&
                  /^\s*object\s+Main\b/m.test(f.content)
                ? langConfig.filename
                : f.name,
          content: f.content,
        })),
      }),
      signal: abort.signal,
    })
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      {
        error: timedOut
          ? 'Execution timed out (55s limit)'
          : 'Execution service unavailable',
      },
      { status: timedOut ? 408 : 502 }
    )
  } finally {
    clearTimeout(abortTimer)
  }

  if (!execRes.ok) {
    return NextResponse.json(
      { error: 'Execution service error' },
      { status: 502 }
    )
  }

  const durationMs = Date.now() - startMs
  const resultSchema = z.object({
    status: z.string(),
    exception: z.string().nullish(),
    error: z.string().nullish(),
    stdout: z.string().nullish(),
    stderr: z.string().nullish(),
    executionTime: z.number().nonnegative().nullish(),
    exitCode: z.number().int().nullish(),
  })
  const parsedResult = resultSchema.safeParse(
    await execRes.json().catch(() => null)
  )
  if (!parsedResult.success) {
    return NextResponse.json(
      { error: 'Invalid execution service response' },
      { status: 502 }
    )
  }
  const result = parsedResult.data
  if (result.error || result.status === 'failed') {
    const timedOut = /timed?\s*out|timeout/i.test(result.error ?? '')
    return NextResponse.json(
      {
        error: timedOut
          ? 'Execution service timed out'
          : 'Execution service rejected the request',
      },
      { status: timedOut ? 408 : 502 }
    )
  }
  const normalized = normalizeRemoteExecution(result, durationMs)
  const {
    stdout,
    stderr,
    exitCode,
    execStatus,
    durationMs: execDurationMs,
  } = normalized

  // Fire-and-forget — don't block response on DB write
  prisma.executionLog
    .create({
      data: {
        language,
        stdin: stdin || null,
        stdout: stdout || null,
        stderr: stderr || null,
        exitCode,
        execStatus,
        durationMs: execDurationMs,
        roomId,
        submittedById: userId,
      },
    })
    .catch(() => {
      /* non-critical */
    })

  return NextResponse.json({
    stdout,
    stderr,
    exitCode,
    execStatus,
    durationMs: execDurationMs,
    language,
  })
}
