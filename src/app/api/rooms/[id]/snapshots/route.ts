import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canPerform } from '@/lib/room-permissions'
import { getUserRoomRole } from '@/lib/api/room-access'
import { verifyCsrfOrigin } from '@/lib/csrf'
import {
  decodeSnapshotBase64,
  MAX_SNAPSHOT_JSON_BYTES,
  SnapshotValidationError,
  validateSnapshot,
} from '@/lib/yjs-snapshot-codec'
import { readLimitedBody } from '@/lib/snapshot-body'
import { snapshotErrorResponse } from '@/lib/api/snapshot-validation'

const createSnapshotSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  data: z.string().optional(), // base64-encoded Yjs state from client
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: roomId } = await params
  const role = await getUserRoomRole(roomId, session.user.id)

  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const snapshots = await prisma.documentSnapshot.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      label: true,
      createdAt: true,
      createdBy: { select: { name: true, image: true } },
    },
  })

  return NextResponse.json(snapshots)
}

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

  const { id: roomId } = await params
  const role = await getUserRoomRole(roomId, session.user.id)

  if (!role || !canPerform('edit', role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    const raw = await readLimitedBody(req, MAX_SNAPSHOT_JSON_BYTES)
    try {
      body = JSON.parse(raw.toString('utf8'))
    } catch {
      throw new SnapshotValidationError('Invalid JSON')
    }
  } catch (error) {
    return snapshotErrorResponse(error)
  }
  const parsed = createSnapshotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  let snapshotBytes: Buffer | null = null

  if (parsed.data.data !== undefined) {
    try {
      snapshotBytes = decodeSnapshotBase64(parsed.data.data)
    } catch (error) {
      return snapshotErrorResponse(error)
    }
  } else {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { contentSnapshot: true },
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    if (!room.contentSnapshot) {
      return NextResponse.json(
        { error: 'No content to snapshot yet' },
        { status: 422 }
      )
    }
    snapshotBytes = Buffer.from(room.contentSnapshot)
  }

  try {
    validateSnapshot(snapshotBytes)
  } catch (error) {
    return snapshotErrorResponse(error)
  }

  const snapshot = await prisma.documentSnapshot.create({
    data: {
      roomId,
      data: snapshotBytes as unknown as Uint8Array<ArrayBuffer>,
      label: parsed.data.label ?? null,
      createdById: session.user.id,
    },
    select: {
      id: true,
      label: true,
      createdAt: true,
      createdBy: { select: { name: true, image: true } },
    },
  })

  return NextResponse.json(snapshot, { status: 201 })
}
