import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const buf = await req.arrayBuffer()

  if (buf.byteLength === 0) {
    return NextResponse.json({ error: 'Empty snapshot' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentSnapshot.create({
      data: {
        roomId,
        data: Buffer.from(buf),
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
