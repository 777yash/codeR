import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

async function getUserRoomRole(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  })
  if (!room) return null
  if (room.ownerId === userId) return 'OWNER' as const

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: roomId, snapshotId } = await params
  const role = await getUserRoomRole(roomId, session.user.id)
  if (role !== 'OWNER' && role !== 'EDITOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const snapshot = await prisma.documentSnapshot.findUnique({
    where: { id: snapshotId },
    select: { data: true, roomId: true },
  })
  if (!snapshot || snapshot.roomId !== roomId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Write restored bytes as the room's persistent snapshot
  await prisma.room.update({
    where: { id: roomId },
    data: { contentSnapshot: snapshot.data },
  })

  // Derive collab-server HTTP URL from WebSocket URL
  const collabHttpUrl = env.NEXT_PUBLIC_COLLAB_WS_URL.replace(
    /^ws:\/\//,
    'http://'
  ).replace(/^wss:\/\//, 'https://')

  const base64Data = Buffer.from(
    snapshot.data as unknown as Uint8Array
  ).toString('base64')

  try {
    const resetRes = await fetch(`${collabHttpUrl}/reset-doc/${roomId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.NEXTJS_INTERNAL_SECRET,
      },
      body: JSON.stringify({ data: base64Data }),
      signal: AbortSignal.timeout(5000),
    })
    if (!resetRes.ok) {
      console.warn(
        `[restore] collab-server /reset-doc returned ${resetRes.status}`
      )
    }
  } catch (err) {
    // Collab-server offline — DB already updated; clients see restored state on reconnect
    console.warn('[restore] collab-server unreachable:', err)
  }

  return NextResponse.json({ ok: true })
}
