import { beforeEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { room: { findUnique: vi.fn() }, account: { findFirst: vi.fn() } },
}))
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('redirect')
  },
  notFound: () => {
    throw new Error('notFound')
  },
}))
vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/app/rooms/[id]/editor-wrapper', () => ({
  EditorWrapper: ({
    canEdit,
    canRun,
  }: {
    canEdit: boolean
    canRun: boolean
  }) => <div data-edit={String(canEdit)} data-run={String(canRun)} />,
}))
vi.mock('@/components/editor/execution-panel', () => ({
  ExecutionPanel: ({ canRun }: { canRun: boolean }) => (
    <div data-execute={String(canRun)} />
  ),
}))
vi.mock('@/components/editor/settings-dialog', () => ({
  SettingsDialog: () => null,
}))
vi.mock('@/app/rooms/[id]/settings/settings-client', () => ({
  RoomSettingsClient: ({ room }: { room: unknown }) => (
    <div>{JSON.stringify(room)}</div>
  ),
}))
vi.mock('@/components/rooms/project-folder-button', () => ({
  ProjectFolderButton: () => <div>folder-write-controls</div>,
}))
vi.mock('@/components/editor/save-version-dialog', () => ({
  SaveVersionDialog: () => <div>save-version-controls</div>,
}))
vi.mock('@/components/rooms/gist-export-button', () => ({
  GistExportButton: () => null,
}))
vi.mock('@/components/rooms/share-button', () => ({ ShareButton: () => null }))
vi.mock('@/components/marketing/theme-toggle', () => ({
  ThemeToggle: () => null,
}))
vi.mock('@/components/editor/active-language-badge', () => ({
  ActiveLanguageBadge: () => null,
}))
vi.mock('@/components/editor/live-badge', () => ({ LiveBadge: () => null }))
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import RoomPage from '@/app/rooms/[id]/page'
import SettingsPage from '@/app/rooms/[id]/settings/page'

const params = Promise.resolve({ id: 'room' })
function room(role: 'OWNER' | 'EDITOR' | 'VIEWER' | null, isPublic = true) {
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    id: 'room',
    name: 'Project',
    language: 'javascript',
    ownerId: role === 'OWNER' ? 'user' : 'owner',
    isPublic,
    owner: { id: 'owner', name: 'Owner' },
    members:
      role && role !== 'OWNER'
        ? [{ userId: 'user', role, user: { id: 'user', name: 'Member' } }]
        : [],
    shareLinks: [{ token: 'secret-editor-invite' }],
  } as never)
}
beforeEach(() => {
  vi.mocked(auth).mockResolvedValue({
    user: { id: 'user', name: 'User' },
  } as never)
  vi.mocked(prisma.account.findFirst).mockResolvedValue(null)
})

it.each(['VIEWER', null] as const)(
  'disables edit, runtime, folder and save controls for %s visitors',
  async (role) => {
    room(role)
    const html = renderToStaticMarkup(await RoomPage({ params }))
    expect(html).toContain('data-edit="false"')
    expect(html).toContain('data-run="false"')
    expect(html).toContain('data-execute="false"')
    expect(html).not.toContain('folder-write-controls')
    expect(html).not.toContain('save-version-controls')
    expect(html).not.toContain('secret-editor-invite')
  }
)
it.each(['OWNER', 'EDITOR'] as const)(
  'preserves editing and runtime controls for %s',
  async (role) => {
    room(role)
    const html = renderToStaticMarkup(await RoomPage({ params }))
    expect(html).toContain('data-edit="true"')
    expect(html).toContain('data-execute="true"')
    expect(html).toContain('folder-write-controls')
  }
)
it('does not send invitation tokens to viewers through settings server-component props', async () => {
  room('VIEWER')
  const page = await SettingsPage({ params })
  expect(JSON.stringify(page)).not.toContain('secret-editor-invite')
  expect(renderToStaticMarkup(page)).not.toContain('secret-editor-invite')
})
it.each(['OWNER', 'EDITOR'] as const)(
  'preserves share credentials for authorized %s settings users',
  async (role) => {
    room(role)
    expect(renderToStaticMarkup(await SettingsPage({ params }))).toContain(
      'secret-editor-invite'
    )
  }
)
it('does not admit nonmembers to a private room or room settings', async () => {
  room(null, false)
  await expect(RoomPage({ params })).rejects.toThrow('notFound')
  await expect(SettingsPage({ params })).rejects.toThrow('notFound')
})
