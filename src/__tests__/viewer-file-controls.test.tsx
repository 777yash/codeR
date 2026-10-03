import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/editor/editor-client', () => ({
  addSharedFile: vi.fn(),
  removeSharedFile: vi.fn(),
  deleteSharedFile: vi.fn(),
  renameSharedFile: vi.fn(),
  importFilesToWorkspace: vi.fn(),
  getAllFilesContent: () => [],
}))
vi.mock('gsap', () => ({ gsap: {} }))
vi.mock('sonner', () => ({ toast: {} }))
vi.mock('@/components/editor/language-icon', () => ({
  LanguageIcon: () => null,
}))
vi.mock('@/stores/editor-store', () => ({
  useEditorStore: () => ({
    files: [
      {
        id: 'file',
        name: 'src/main.js',
        language: 'javascript',
        content: 'code',
      },
    ],
    activeFileId: 'file',
    openFileIds: ['file'],
    explorerCollapsed: false,
  }),
}))
import { FileTabs } from '@/components/editor/file-tabs'
import { FileExplorer } from '@/components/editor/file-explorer'

it('keeps viewer file navigation while hiding new-file controls', () => {
  const html = renderToStaticMarkup(
    <>
      <FileTabs canEdit={false} />
      <FileExplorer canEdit={false} />
    </>
  )
  expect(html).toContain('main.js')
  expect(html).not.toContain('title="New file"')
  expect(html).not.toContain('Add file')
  expect(html).not.toContain('filename.js')
})
it('retains file creation for authorized editors', () => {
  const html = renderToStaticMarkup(
    <>
      <FileTabs canEdit />
      <FileExplorer canEdit />
    </>
  )
  expect(html).toContain('title="New file"')
  expect(html).toContain('Add file')
})
