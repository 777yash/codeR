import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Only the collab-server calls these endpoints. Guard with a shared secret. */
function isAuthorized(req: Request): boolean {
  const secret = process.env.NEXTJS_INTERNAL_SECRET
  if (!secret) return false
  return req.headers.get('x-internal-secret') === secret
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const room = await prisma.room.findUnique({
    where: { id },
    select: { contentSnapshot: true },
  })

  if (!room) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!room.contentSnapshot) {
    return new Response(null, { status: 204 })
  }

  return new Response(room.contentSnapshot, {
    status: 200,
    headers: { 'content-type': 'application/octet-stream' },
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const buf = await req.arrayBuffer()

  await prisma.room.update({
    where: { id },
    data: { contentSnapshot: Buffer.from(buf) },
  })

  return new Response(null, { status: 204 })
}
