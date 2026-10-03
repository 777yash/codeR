import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/webcontainer', () => ({ getBootedWebContainer: vi.fn() }))
import { getBootedWebContainer } from '@/lib/webcontainer'
import {
  mountAllFiles,
  writeContainerFile,
  removeContainerFile,
  flushContainerFiles,
} from '@/lib/webcontainer-fs'
import { prepareRunCommand } from '@/lib/webcontainer-run'

const disk = new Map<string, string>()
const container = {
  mount: vi.fn(async () => undefined),
  fs: {
    mkdir: vi.fn(async () => undefined),
    writeFile: vi.fn(async (path: string, content: string) => {
      disk.set(path, content)
    }),
    rm: vi.fn(async (path: string) => {
      disk.delete(path)
    }),
    readFile: vi.fn(async (path: string) => {
      if (!disk.has(path)) throw new Error('ENOENT')
      return disk.get(path)!
    }),
    readdir: vi.fn(async () => ['dependency']),
  },
}
beforeEach(() => {
  disk.clear()
  container.fs.writeFile.mockImplementation(async (path, content) => {
    disk.set(path, content)
  })
  container.mount.mockResolvedValue(undefined)
  const booted = Promise.resolve(container)
  vi.mocked(getBootedWebContainer).mockReturnValue(booted as never)
})

describe('Run filesystem barrier', () => {
  it('waits for an old in-flight write, then replaces it with current Yjs content', async () => {
    let release!: () => void
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    container.fs.writeFile.mockImplementationOnce(async (path, content) => {
      started()
      await blocked
      disk.set(path, content)
    })
    const oldWrite = writeContainerFile('main.js', 'old')
    await ready
    const prepared = prepareRunCommand('main.js', [
      { name: 'main.js', content: 'latest-keystroke' },
    ])
    await Promise.resolve()
    expect(container.fs.readFile).not.toHaveBeenCalled()
    release()
    expect(await prepared).toBe('node main.js')
    await oldWrite
    expect(disk.get('main.js')).toBe('latest-keystroke')
  })
  it('reads the current package.json after flushing instead of choosing a stale script', async () => {
    disk.set('package.json', '{"scripts":{"dev":"old"}}')
    const command = await prepareRunCommand('main.js', [
      {
        name: 'package.json',
        content: '{"scripts":{"start":"node latest.js"}}',
      },
      { name: 'latest.js', content: 'new' },
    ])
    expect(command).toBe('npm run start')
    expect(disk.get('latest.js')).toBe('new')
  })
  it('orders mounts and removals before the current Run snapshot', async () => {
    await Promise.all([
      mountAllFiles([{ name: 'main.js', content: 'initial' }]),
      removeContainerFile('main.js'),
      flushContainerFiles([{ name: 'main.js', content: 'current' }]),
    ])
    expect(container.mount).toHaveBeenCalled()
    expect(container.fs.rm).toHaveBeenCalled()
    expect(disk.get('main.js')).toBe('current')
  })
  it('stops before selecting a command if a current write fails, and permits a later retry', async () => {
    container.fs.writeFile.mockRejectedValueOnce(new Error('Disk write failed'))
    await expect(
      prepareRunCommand('main.js', [{ name: 'main.js', content: 'new' }])
    ).rejects.toThrow('Disk write failed')
    expect(container.fs.readFile).not.toHaveBeenCalled()
    expect(
      await prepareRunCommand('main.js', [
        { name: 'main.js', content: 'retry' },
      ])
    ).toBe('node main.js')
  })
  it('does not run when the runtime is missing', async () => {
    vi.mocked(getBootedWebContainer).mockReturnValue(null)
    await expect(prepareRunCommand('main.js', [])).rejects.toThrow(
      'Runtime is not ready'
    )
    expect(container.fs.readFile).not.toHaveBeenCalled()
  })
  it('does not select a command for a different runtime if teardown occurs during sync', async () => {
    container.fs.writeFile.mockImplementationOnce(async () => {
      vi.mocked(getBootedWebContainer).mockReturnValue(null)
    })
    await expect(
      prepareRunCommand('main.js', [{ name: 'main.js', content: 'new' }])
    ).rejects.toThrow('Runtime changed')
    expect(container.fs.readFile).not.toHaveBeenCalled()
  })
  it('rejects invalid paths rather than silently running stale disk content', async () => {
    await expect(
      prepareRunCommand('main.js', [{ name: '../main.js', content: 'new' }])
    ).rejects.toThrow('Invalid file path')
    expect(container.fs.readFile).not.toHaveBeenCalled()
  })
})
