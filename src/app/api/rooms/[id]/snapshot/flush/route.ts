import { NextRequest, NextResponse } from 'next/server'
import * as Y from 'yjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserRoomRole } from '@/lib/api/room-access'
import { verifyCsrfOrigin } from '@/lib/csrf'
import {
  decodeInto,
  encodeSnapshot,
  MAX_SNAPSHOT_BYTES,
} from '@/lib/yjs-snapshot-codec'
import { readLimitedBody } from '@/lib/snapshot-body'
import { snapshotErrorResponse } from '@/lib/api/snapshot-validation'

/**
 * Member-authorized snapshot flush. The collab-server's interval/last-leave
 * saves leave a window where client-only Yjs state (AI scaffolds, edits made
 * while the WS was down) is lost if the tab closes first. Clients POST their
 * full state here; it CRDT-merges with the stored snapshot, so a stale client
 * can never erase newer state — the merge is a union.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const role = await getUserRoomRole(id, session.user.id)
  if (!role || role === 'VIEWER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let bytes: Buffer
  try {
    bytes = await readLimitedBody(req, MAX_SNAPSHOT_BYTES)
  } catch (error) {
    return snapshotErrorResponse(error)
  }

  const room = await prisma.room.findUnique({
    where: { id },
    select: { contentSnapshot: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const doc = new Y.Doc()
  let merged: Buffer
  try {
    if (room.contentSnapshot) {
      decodeInto(doc, room.contentSnapshot as unknown as Uint8Array)
    }
    decodeInto(doc, bytes)
    merged = encodeSnapshot(doc)
  } catch (error) {
    return snapshotErrorResponse(error)
  } finally {
    doc.destroy()
  }

  // updateMany silently no-ops if room was deleted — avoids P2025 throw
  await prisma.room.updateMany({
    where: { id },
    data: { contentSnapshot: merged as unknown as Uint8Array<ArrayBuffer> },
  })

  return new Response(null, { status: 204 })
}
