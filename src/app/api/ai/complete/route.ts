import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

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
  const key = env.CODESTRAL_API_KEY
  if (!key) return NextResponse.json({ completion: '' }, { status: 503 })

  const { prefix, suffix, language, otherFiles } = (await req.json()) as {
    prefix: string
    suffix: string
    language?: string
    otherFiles?: { name: string; content: string }[]
  }

  const lang = language ?? ''
  const filename = lang ? (LANG_FILENAME[lang] ?? 'file') : 'file'
  const fileHeader = lang ? `${lineComment(lang, `File: ${filename}`)}\n` : ''

  const contextBlocks =
    otherFiles && otherFiles.length > 0
      ? buildContextBlocks(otherFiles, lang) + '\n\n'
      : ''

  const prompt = contextBlocks + fileHeader + buildPrefix(prefix, lang)

  const res = await fetch('https://codestral.mistral.ai/v1/fim/completions', {
    method: 'POST',
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
    const errText = await res.text()
    console.error('[codestral] error', res.status, errText)
    return NextResponse.json({ completion: '' })
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; text?: string }[]
  }
  const completion =
    data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? ''
  return NextResponse.json({ completion })
}
