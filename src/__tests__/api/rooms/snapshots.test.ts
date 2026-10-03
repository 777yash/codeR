import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { NextRequest } from 'next/server'
vi.mock('server-only', () => ({}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/api/room-access', () => ({ getUserRoomRole: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    documentSnapshot: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))
import { auth } from '@/auth'
import { getUserRoomRole } from '@/lib/api/room-access'
import { prisma } from '@/lib/prisma'
import { POST as create } from '@/app/api/rooms/[id]/snapshots/route'
import { POST as restore } from '@/app/api/rooms/[id]/snapshots/[snapshotId]/restore/route'
import { GET as detail } from '@/app/api/rooms/[id]/snapshots/[snapshotId]/route'
import { PUT as persist } from '@/app/api/rooms/[id]/snapshot/route'
import { POST as auto } from '@/app/api/rooms/[id]/snapshots/auto/route'
import { POST as flush } from '@/app/api/rooms/[id]/snapshot/flush/route'
import {
  encodeSnapshot,
  MAX_SNAPSHOT_BYTES,
  MAX_SNAPSHOT_JSON_BYTES,
  readSnapshot,
} from '@/lib/yjs-snapshot-codec'
const params = Promise.resolve({ id: 'room', snapshotId: 'snapshot' })
const context = { params }
const url = 'http://localhost:3000/api/rooms/room/snapshot'
const request = (body: string | Uint8Array, internal = false) =>
  new NextRequest(url, {
    method: 'POST',
    body: body as BodyInit,
    headers: internal ? { 'x-internal-secret': 'internal' } : {},
  })
function bytes(text = 'valid') {
  const doc = new Y.Doc()
  doc.getText('content').insert(0, text)
  const result = encodeSnapshot(doc)
  doc.destroy()
  return result
}
beforeEach(() => {
  vi.stubEnv('NEXTJS_INTERNAL_SECRET', 'internal')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
  )
  vi.mocked(auth).mockResolvedValue({ user: { id: 'user' } } as never)
  vi.mocked(getUserRoomRole).mockResolvedValue('EDITOR')
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    contentSnapshot: bytes(),
  } as never)
  vi.mocked(prisma.documentSnapshot.findUnique).mockResolvedValue({
    roomId: 'room',
    data: bytes(),
  } as never)
  vi.mocked(prisma.documentSnapshot.create).mockResolvedValue({
    id: 'new',
  } as never)
})
describe('snapshot creation', () => {
  it.each([
    '{',
    '{"data":""}',
    '{"data":"!!!!"}',
    '{"data":"////"}',
    '{"data":123}',
  ])('rejects invalid request %s before writing', async (body) => {
    expect((await create(request(body), context)).status).toBe(400)
    expect(prisma.documentSnapshot.create).not.toHaveBeenCalled()
  })
  it('rejects invalid workspace metadata', async () => {
    const doc = new Y.Doc()
    doc.getMap('file-list').set('file', 'not JSON')
    const data = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
    doc.destroy()
    expect(
      (await create(request(JSON.stringify({ data })), context)).status
    ).toBe(400)
    expect(prisma.documentSnapshot.create).not.toHaveBeenCalled()
  })
  it('accepts valid client bytes and a valid persisted fallback', async () => {
    expect(
      (
        await create(
          request(
            JSON.stringify({
              label: 'version',
              data: bytes().toString('base64'),
            })
          ),
          context
        )
      ).status
    ).toBe(201)
    expect((await create(request('{}'), context)).status).toBe(201)
    expect(prisma.documentSnapshot.create).toHaveBeenCalledTimes(2)
  })
  it('validates persisted fallback bytes', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      contentSnapshot: Buffer.from('bad'),
    } as never)
    expect((await create(request('{}'), context)).status).toBe(400)
    expect(prisma.documentSnapshot.create).not.toHaveBeenCalled()
  })
  it('bounds JSON before parsing, including chunked bodies', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_SNAPSHOT_JSON_BYTES))
        controller.enqueue(new Uint8Array(1))
        controller.close()
      },
    })
    const req = new Request(url, {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit)
    expect((await create(req, context)).status).toBe(413)
    expect(prisma.documentSnapshot.create).not.toHaveBeenCalled()
  })
})
describe('stored corrupt snapshots', () => {
  it('rejects restore before replacing the current snapshot or calling the server', async () => {
    vi.mocked(prisma.documentSnapshot.findUnique).mockResolvedValue({
      roomId: 'room',
      data: Buffer.from('bad'),
    } as never)
    expect((await restore(request('{}'), context)).status).toBe(400)
    expect(prisma.room.update).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('returns a controlled history-read error', async () => {
    vi.mocked(prisma.documentSnapshot.findUnique).mockResolvedValue({
      roomId: 'room',
      data: Buffer.from('bad'),
    } as never)
    expect((await detail(new Request(url), context)).status).toBe(400)
  })
  it('allows valid restore', async () => {
    expect((await restore(request('{}'), context)).status).toBe(200)
    expect(prisma.room.update).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
describe('binary persistence boundaries', () => {
  it.each([persist, auto, flush])(
    'rejects malformed or oversized binary snapshots without writing',
    async (handler) => {
      expect((await handler(request('bad', true), context)).status).toBe(400)
      expect(
        (
          await handler(
            request(new Uint8Array(MAX_SNAPSHOT_BYTES + 1), true),
            context
          )
        ).status
      ).toBe(413)
      expect(prisma.room.updateMany).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    }
  )
  it('validates merged flush state and preserves both documents', async () => {
    const incoming = new Y.Doc()
    incoming.getText('file:new').insert(0, 'offline')
    expect(
      (await flush(request(Y.encodeStateAsUpdate(incoming)), context)).status
    ).toBe(204)
    incoming.destroy()
    const call = vi.mocked(prisma.room.updateMany).mock.calls[0][0]
    const doc = readSnapshot(call!.data!.contentSnapshot as Uint8Array)
    expect(doc.getText('content').toString()).toBe('valid')
    expect(doc.getText('file:new').toString()).toBe('offline')
    doc.destroy()
  })
  it('keeps authorization checks ahead of validation', async () => {
    vi.mocked(getUserRoomRole).mockResolvedValue('VIEWER')
    expect((await create(request('bad'), context)).status).toBe(403)
    expect((await flush(request('bad'), context)).status).toBe(403)
    expect((await persist(request('bad'), context)).status).toBe(401)
  })
})
