import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MAX_SNAPSHOT_BYTES, validateSnapshot } from '@/lib/yjs-snapshot-codec'
import { readLimitedBody } from '@/lib/snapshot-body'
import { snapshotErrorResponse } from '@/lib/api/snapshot-validation'

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
  let buf: Buffer
  try {
    buf = await readLimitedBody(req, MAX_SNAPSHOT_BYTES)
    validateSnapshot(buf)
  } catch (error) {
    return snapshotErrorResponse(error)
  }

  // updateMany silently no-ops if room was deleted — avoids P2025 throw
  await prisma.room.updateMany({
    where: { id },
    data: { contentSnapshot: buf as unknown as Uint8Array<ArrayBuffer> },
  })

  return new Response(null, { status: 204 })
}
