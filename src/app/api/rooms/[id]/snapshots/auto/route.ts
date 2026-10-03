import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MAX_SNAPSHOT_BYTES, validateSnapshot } from '@/lib/yjs-snapshot-codec'
import { readLimitedBody } from '@/lib/snapshot-body'
import { snapshotErrorResponse } from '@/lib/api/snapshot-validation'

const AUTO_SNAPSHOT_CAP = 50

function isAuthorized(req: Request): boolean {
  const secret = process.env.NEXTJS_INTERNAL_SECRET
  if (!secret) return false
  return req.headers.get('x-internal-secret') === secret
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: roomId } = await params
  let buf: Buffer
  try {
    buf = await readLimitedBody(req, MAX_SNAPSHOT_BYTES)
    validateSnapshot(buf)
  } catch (error) {
    return snapshotErrorResponse(error)
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentSnapshot.create({
      data: {
        roomId,
        data: buf as unknown as Uint8Array<ArrayBuffer>,
        label: null,
        createdById: null,
      },
    })

    // keep only the 50 most recent auto-saves (label IS NULL)
    const oldest = await tx.documentSnapshot.findMany({
      where: { roomId, label: null },
      orderBy: { createdAt: 'desc' },
      skip: AUTO_SNAPSHOT_CAP,
      select: { id: true },
    })

    if (oldest.length > 0) {
      await tx.documentSnapshot.deleteMany({
        where: { id: { in: oldest.map((s) => s.id) } },
      })
    }
  })

  return new Response(null, { status: 204 })
}
