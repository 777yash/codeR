export const maxDuration = 60 // Vercel max for Hobby plan

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canPerform } from '@/lib/room-permissions'
import type { Role } from '@/generated/prisma/client'

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
  go: { language: 'go', filename: 'index.go' },
  rust: { language: 'rust', filename: 'index.rs' },
  ruby: { language: 'ruby', filename: 'index.rb' },
  php: { language: 'php', filename: 'index.php' },
  swift: { language: 'swift', filename: 'index.swift' },
  kotlin: { language: 'kotlin', filename: 'index.kt' },
  scala: { language: 'scala', filename: 'index.scala' },
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

async function getUserRoomRole(
  roomId: string,
  userId: string
): Promise<Role | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  })
  if (!room) return null
  if (room.ownerId === userId) return 'OWNER'

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

const executeSchema = z.object({
  roomId: z.string().min(1),
  language: z.string().min(1),
  code: z.string().max(MAX_CODE_LENGTH),
  stdin: z.string().max(10_000).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const parsed = executeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { roomId, language, code, stdin = '' } = parsed.data

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
        files: [{ name: langConfig.filename, content: code }],
      }),
      signal: abort.signal,
    })
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      {
        error: timedOut
          ? 'Execution timed out (15s limit)'
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
  const result = (await execRes.json()) as {
    status: string // "success" | "error" | "timeout" | "compilation_error"
    exception: string | null
    stdout: string | null
    stderr: string | null
    executionTime: number | null
  }

  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? result.exception ?? ''
  const exitCode = result.status === 'success' ? 0 : 1
  const execDurationMs = result.executionTime ?? durationMs

  // Fire-and-forget — don't block response on DB write
  prisma.executionLog
    .create({
      data: {
        language,
        stdin: stdin || null,
        stdout: stdout || null,
        stderr: stderr || null,
        exitCode,
        execStatus: result.status,
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
    execStatus: result.status,
    durationMs: execDurationMs,
    language,
  })
}
