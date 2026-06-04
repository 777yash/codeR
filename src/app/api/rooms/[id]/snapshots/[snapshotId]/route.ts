import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserRoomRole } from '@/lib/api/room-access'
import { verifyCsrfOrigin } from '@/lib/csrf'
import * as Y from 'yjs'

function decodeContent(data: Uint8Array): string {
  const doc = new Y.Doc()
  // Prisma Bytes = Uint8Array<ArrayBuffer>; yjs expects Uint8Array<ArrayBufferLike>
  Y.applyUpdate(doc, data as unknown as Uint8Array)

  const fileList = doc.getMap<string>('file-list')
  if (fileList.size > 0) {
    const files = Array.from(fileList.values())
      .map((v) => JSON.parse(v) as { id: string; order: number })
      .sort((a, b) => a.order - b.order)
    if (files.length > 0) {
      return doc.getText(`file:${files[0].id}`).toString()
    }
  }

  return doc.getText('content').toString()
}

export async function DELETE(
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
    select: { roomId: true },
  })

  if (!snapshot || snapshot.roomId !== roomId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.documentSnapshot.delete({ where: { id: snapshotId } })
  return new NextResponse(null, { status: 204 })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: roomId, snapshotId } = await params
  const role = await getUserRoomRole(roomId, session.user.id)
  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const snapshot = await prisma.documentSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      label: true,
      createdAt: true,
      data: true,
      roomId: true,
      createdBy: { select: { name: true, image: true } },
    },
  })

  if (!snapshot || snapshot.roomId !== roomId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const content = decodeContent(snapshot.data)

  return NextResponse.json({
    id: snapshot.id,
    label: snapshot.label,
    createdAt: snapshot.createdAt,
    createdBy: snapshot.createdBy,
    content,
  })
}
