import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { prepareGistFiles } from '@/lib/gist-files'

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

  const parsed = gistSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { description, isPublic, files } = parsed.data

  let gistFiles: Record<string, { content: string }>
  try {
    gistFiles = prepareGistFiles(files)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
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
      { error: 'Connect GitHub to export gists.', code: 'GITHUB_RECONNECT' },
      { status: 409 }
    )
  }
  // GitHub returns granted scopes comma-separated; tolerate spaces too.
  if (!account.scope?.split(/[,\s]+/).includes('gist')) {
    return NextResponse.json(
      {
        error: 'Reconnect GitHub to enable gist export.',
        code: 'GITHUB_RECONNECT',
      },
      { status: 409 }
    )
  }

  let res: Response
  try {
    res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
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
      {
        error: 'Reconnect GitHub to enable gist export.',
        code: 'GITHUB_RECONNECT',
      },
      { status: 409 }
    )
  }
  if (!res.ok) {
    if (
      res.status === 403 &&
      !res.headers.has('retry-after') &&
      res.headers.get('x-ratelimit-remaining') !== '0'
    ) {
      return NextResponse.json(
        {
          error: 'GitHub denied gist access. Reconnect GitHub.',
          code: 'GITHUB_RECONNECT',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      {
        error:
          res.status === 429 ||
          res.headers.has('retry-after') ||
          res.headers.get('x-ratelimit-remaining') === '0'
            ? 'GitHub rate limit reached. Try again later.'
            : 'GitHub gist export failed.',
      },
      { status: 502 }
    )
  }

  const gist = z
    .object({
      html_url: z
        .string()
        .url()
        .refine((value) => {
          const url = new URL(value)
          return (
            url.protocol === 'https:' &&
            url.hostname === 'gist.github.com' &&
            !url.username &&
            !url.password
          )
        }),
    })
    .safeParse(await res.json().catch(() => null))
  if (!gist.success)
    return NextResponse.json(
      { error: 'Invalid response from GitHub.' },
      { status: 502 }
    )
  return NextResponse.json({ url: gist.data.html_url }, { status: 201 })
}
