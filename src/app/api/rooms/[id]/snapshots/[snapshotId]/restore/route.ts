import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserRoomRole } from '@/lib/api/room-access'
import { verifyCsrfOrigin } from '@/lib/csrf'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

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
  const collabHttpUrl = (
    process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? 'ws://localhost:1234'
  )
    .replace(/^ws:\/\//, 'http://')
    .replace(/^wss:\/\//, 'https://')

  const base64Data = Buffer.from(
    snapshot.data as unknown as Uint8Array
  ).toString('base64')

  try {
    const resetRes = await fetch(`${collabHttpUrl}/reset-doc/${roomId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.NEXTJS_INTERNAL_SECRET ?? '',
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
