import { EventEmitter } from 'node:events'
import type { WebsocketProvider } from 'y-websocket'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { startCollabConnection } from '@/lib/collab-connection'

function fixture() {
  const provider = Object.assign(new EventEmitter(), {
    shouldConnect: false,
    params: {},
    connect: vi.fn(),
  })
  const callbacks = {
    onRole: vi.fn(),
    onRoleChanged: vi.fn(),
    onDenied: vi.fn(),
    onDisconnected: vi.fn(),
  }
  const stop = startCollabConnection(
    provider as unknown as WebsocketProvider,
    'room',
    42,
    callbacks
  )
  return { provider, callbacks, stop }
}
const ticket = (token = 'first', role = 'EDITOR') =>
  new Response(JSON.stringify({ token, role }))

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('obtains a fresh ticket before every connection and disables native reconnect', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ticket())
    .mockResolvedValueOnce(ticket('second'))
  vi.stubGlobal('fetch', fetcher)
  const f = fixture()
  await vi.advanceTimersByTimeAsync(0)
  expect(f.provider.params).toEqual({ ticket: 'first' })
  expect(f.provider.connect).toHaveBeenCalledTimes(1)
  f.provider.shouldConnect = true
  f.provider.emit('connection-close', {})
  expect(f.provider.shouldConnect).toBe(false)
  await vi.advanceTimersByTimeAsync(1000)
  expect(f.provider.params).toEqual({ ticket: 'second' })
  expect(f.provider.connect).toHaveBeenCalledTimes(2)
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ clientId: 42 })
  f.stop()
})

it('does not reuse local state after a role change', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(ticket())
      .mockResolvedValueOnce(ticket('second', 'VIEWER'))
  )
  const f = fixture()
  await vi.advanceTimersByTimeAsync(0)
  f.provider.emit('connection-close', {})
  await vi.advanceTimersByTimeAsync(1000)
  expect(f.callbacks.onRoleChanged).toHaveBeenCalledOnce()
  expect(f.provider.connect).toHaveBeenCalledTimes(1)
  f.stop()
})

it.each([401, 403])(
  'stops reconnecting when the ticket API denies access (%s)',
  async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }))
    vi.stubGlobal('fetch', fetcher)
    const f = fixture()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(f.callbacks.onDenied).toHaveBeenCalledWith(status)
    expect(f.provider.connect).not.toHaveBeenCalled()
    f.stop()
  }
)

it('retries transient failures and cancels pending retries on cleanup', async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(ticket())
  vi.stubGlobal('fetch', fetcher)
  const f = fixture()
  await vi.advanceTimersByTimeAsync(1000)
  expect(f.provider.connect).toHaveBeenCalledOnce()
  f.provider.emit('connection-close', {})
  f.stop()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it('ignores ticket responses after the editor is disposed', async () => {
  let resolve!: (response: Response) => void
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done
      })
    )
  )
  const f = fixture()
  f.stop()
  resolve(ticket())
  await vi.advanceTimersByTimeAsync(0)
  expect(f.provider.connect).not.toHaveBeenCalled()
  expect(f.callbacks.onRole).not.toHaveBeenCalled()
})
