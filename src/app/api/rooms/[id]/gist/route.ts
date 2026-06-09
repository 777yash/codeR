import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyCsrfOrigin } from '@/lib/csrf'

const MAX_FILE_CONTENT = 100_000

const gistSchema = z.object({
  description: z.string().max(1000).optional(),
  isPublic: z.boolean(),
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        content: z.string().max(MAX_FILE_CONTENT),
      })
    )
    .min(1)
    .max(30),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const { id } = await params

  const room = await prisma.room.findUnique({
    where: { id },
    select: {
      isPublic: true,
      ownerId: true,
      members: { where: { userId }, select: { role: true } },
    },
  })
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  const hasAccess =
    room.ownerId === userId || room.members.length > 0 || room.isPublic
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = gistSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { description, isPublic, files } = parsed.data

  // GitHub rejects files with empty/whitespace-only content; map dedupes names.
  const gistFiles: Record<string, { content: string }> = {}
  for (const file of files) {
    if (file.content.trim().length === 0) continue
    gistFiles[file.name] = { content: file.content }
  }
  if (Object.keys(gistFiles).length === 0) {
    return NextResponse.json(
      { error: 'Nothing to export — all files are empty.' },
      { status: 400 }
    )
  }

  const account = await prisma.account.findFirst({
    where: { userId, provider: 'github' },
    select: { access_token: true, scope: true },
  })
  if (!account?.access_token) {
    return NextResponse.json(
      { error: 'Sign in with GitHub to export gists.' },
      { status: 409 }
    )
  }
  // GitHub returns granted scopes comma-separated; tolerate spaces too.
  if (!account.scope?.split(/[,\s]+/).includes('gist')) {
    return NextResponse.json(
      { error: 'Re-sign in with GitHub to enable gist export.' },
      { status: 409 }
    )
  }

  let res: Response
  try {
    res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'codeR',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: description || undefined,
        public: isPublic,
        files: gistFiles,
      }),
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach GitHub.' },
      { status: 502 }
    )
  }

  if (res.status === 401) {
    return NextResponse.json(
      { error: 'Re-sign in with GitHub to enable gist export.' },
      { status: 409 }
    )
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: 'GitHub gist export failed.' },
      { status: 502 }
    )
  }

  const gist = (await res.json()) as { html_url: string }
  return NextResponse.json({ url: gist.html_url }, { status: 201 })
}
