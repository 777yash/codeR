import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/components/editor/editor-client', () => ({
  applyExternalFileContents: vi.fn(() => ({ updated: 0, added: 1 })),
  removeSharedFile: vi.fn(),
  getAllFilesContent: vi.fn(() => []),
}))
vi.mock('@/lib/webcontainer-fs', () => ({ writeContainerFile: vi.fn() }))
vi.mock('@/lib/webcontainer', () => ({ getWebContainerStatus: vi.fn() }))
vi.mock('@/lib/webcontainer-run', () => ({
  normalizeNpxCommand: vi.fn((s: string) => s),
}))
vi.mock('@/components/editor/terminal-panel', () => ({
  runInTerminal: vi.fn(),
}))
vi.mock('@/stores/editor-store', () => ({
  useEditorStore: { getState: vi.fn() },
}))

import {
  applyScaffold,
  runScaffold,
  formatCommand,
  fixJsonContent,
  type ScaffoldResponse,
} from '@/lib/ai-scaffold-apply'
import {
  applyExternalFileContents,
  removeSharedFile,
  getAllFilesContent,
} from '@/components/editor/editor-client'
import { writeContainerFile } from '@/lib/webcontainer-fs'
import { getWebContainerStatus } from '@/lib/webcontainer'
import { runInTerminal } from '@/components/editor/terminal-panel'
import { useEditorStore } from '@/stores/editor-store'

type StoreFile = { id: string; name: string; content: string }

function setStoreFiles(files: StoreFile[]) {
  vi.mocked(useEditorStore.getState).mockReturnValue({ files } as never)
  // Real content comes from Yjs (getAllFilesContent), not store.content
  vi.mocked(getAllFilesContent).mockReturnValue(
    files.map((f) => ({ name: f.name, content: f.content }))
  )
}

function scaffold(over: Partial<ScaffoldResponse> = {}): ScaffoldResponse {
  return {
    text: 'ok',
    files: [{ filename: 'index.js', contents: 'console.log(1)' }],
    buildCommand: { mainItem: 'npm', commands: ['install'] },
    startCommand: { mainItem: 'npm', commands: ['run', 'dev'] },
    actions: [],
    ...over,
  }
}

describe('formatCommand', () => {
  it('joins mainItem + commands', () => {
    expect(formatCommand({ mainItem: 'npm', commands: ['run', 'dev'] })).toBe(
      'npm run dev'
    )
    expect(formatCommand({ mainItem: 'node', commands: ['index.js'] })).toBe(
      'node index.js'
    )
  })
  it('returns null for empty / missing mainItem', () => {
    expect(formatCommand(undefined)).toBeNull()
    expect(formatCommand({ mainItem: '', commands: [] })).toBeNull()
  })
})

describe('fixJsonContent', () => {
  it('passes valid JSON through unchanged', () => {
    expect(fixJsonContent('package.json', '{"name":"app"}')).toBe(
      '{"name":"app"}'
    )
  })

  it('unescapes a double-escaped .json file', () => {
    const corrupted = '{\\n  \\"name\\": \\"app\\"}'
    expect(fixJsonContent('package.json', corrupted)).toBe(
      '{\n  "name": "app"}'
    )
  })

  it('leaves non-json files untouched', () => {
    const js = 'const x = "a\\nb"'
    expect(fixJsonContent('app.js', js)).toBe(js)
  })

  it('returns the original when it cannot recover valid JSON', () => {
    expect(fixJsonContent('bad.json', '{not json')).toBe('{not json')
  })
})

describe('applyScaffold', () => {
  beforeEach(() => {
    vi.mocked(applyExternalFileContents).mockReturnValue({
      updated: 0,
      added: 1,
    })
  })

  it('deletes files named in actions by mapped id', () => {
    setStoreFiles([{ id: 'a', name: 'old.js', content: 'x' }])
    applyScaffold(
      scaffold({ actions: [{ type: 'delete', filename: 'old.js' }] })
    )
    expect(removeSharedFile).toHaveBeenCalledWith('a')
  })

  it('returns updated + added count', () => {
    setStoreFiles([{ id: 'a', name: 'a.js', content: 'x' }])
    vi.mocked(applyExternalFileContents).mockReturnValue({
      updated: 1,
      added: 2,
    })
    expect(applyScaffold(scaffold())).toBe(3)
  })

  it('removes the empty placeholder after a greenfield apply', () => {
    setStoreFiles([{ id: 'default', name: 'main.js', content: '' }])
    applyScaffold(scaffold())
    expect(removeSharedFile).toHaveBeenCalledWith('default')
  })

  it('keeps the placeholder when the scaffold regenerates it', () => {
    setStoreFiles([{ id: 'default', name: 'main.js', content: '' }])
    applyScaffold(scaffold({ files: [{ filename: 'main.js', contents: 'x' }] }))
    expect(removeSharedFile).not.toHaveBeenCalled()
  })

  it('does not remove empty files in a non-greenfield room', () => {
    setStoreFiles([
      { id: 'a', name: 'a.js', content: 'code' },
      { id: 'b', name: 'empty.js', content: '' },
    ])
    applyScaffold(scaffold())
    expect(removeSharedFile).not.toHaveBeenCalled()
  })

  it('editing one file does not delete the rest of the project', () => {
    setStoreFiles([
      { id: 'pkg', name: 'package.json', content: '{ "name": "app" }' },
      { id: 'html', name: 'index.html', content: '<!doctype html>' },
      { id: 'app', name: 'src/App.jsx', content: 'export default App' },
    ])
    applyScaffold(
      scaffold({ files: [{ filename: 'src/App.jsx', contents: 'edited' }] })
    )
    expect(removeSharedFile).not.toHaveBeenCalled()
  })

  it('fresh mode removes existing files not in the generated set', () => {
    setStoreFiles([
      { id: 'a', name: 'a.js', content: 'code' },
      { id: 'b', name: 'keep.js', content: 'x' },
    ])
    applyScaffold(
      scaffold({
        files: [
          { filename: 'keep.js', contents: 'y' },
          { filename: 'new.js', contents: 'z' },
        ],
      }),
      { fresh: true }
    )
    expect(removeSharedFile).toHaveBeenCalledWith('a')
    expect(removeSharedFile).not.toHaveBeenCalledWith('b')
  })
})

describe('runScaffold', () => {
  it('no-ops when the runtime is not ready', async () => {
    vi.mocked(getWebContainerStatus).mockReturnValue('booting')
    expect(await runScaffold(scaffold())).toBe(false)
    expect(runInTerminal).not.toHaveBeenCalled()
  })

  it('no-ops on a delete-only response (no files generated)', async () => {
    vi.mocked(getWebContainerStatus).mockReturnValue('ready')
    expect(await runScaffold(scaffold({ files: [] }))).toBe(false)
    expect(runInTerminal).not.toHaveBeenCalled()
  })

  it('writes files then injects the normalized combined command', async () => {
    vi.mocked(getWebContainerStatus).mockReturnValue('ready')
    await runScaffold(scaffold())
    expect(writeContainerFile).toHaveBeenCalledWith(
      'index.js',
      'console.log(1)'
    )
    expect(runInTerminal).toHaveBeenCalledWith('npm install && npm run dev')
  })

  it('skips an empty build command', async () => {
    vi.mocked(getWebContainerStatus).mockReturnValue('ready')
    await runScaffold(
      scaffold({ buildCommand: { mainItem: '', commands: [] } })
    )
    expect(runInTerminal).toHaveBeenCalledWith('npm run dev')
  })
})
