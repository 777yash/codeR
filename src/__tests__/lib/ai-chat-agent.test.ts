import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/components/editor/editor-client', () => ({
  sendChatMessage: vi.fn(),
  updateChatMessage: vi.fn(),
  getAllFilesContent: vi.fn(() => []),
  signalAiAbort: vi.fn(),
  clearAiControl: vi.fn(),
  subscribeAiControl: vi.fn(() => () => {}),
}))
vi.mock('@/lib/ai-scaffold-apply', () => ({
  applyScaffold: vi.fn(() => 1),
  runScaffold: vi.fn(async () => true),
  formatCommand: vi.fn((c?: { mainItem: string; commands: string[] }) =>
    c?.mainItem ? [c.mainItem, ...c.commands].join(' ') : null
  ),
}))
vi.mock('@/components/editor/terminal-panel', () => ({
  runInTerminal: vi.fn(),
}))
vi.mock('@/lib/webcontainer-run', () => ({
  normalizeNpxCommand: vi.fn((s: string) => s),
}))

import {
  messageTriggersAi,
  extractAiPrompt,
  handleAiChatTrigger,
} from '@/lib/ai-chat-agent'
import {
  sendChatMessage,
  updateChatMessage,
} from '@/components/editor/editor-client'
import { runInTerminal } from '@/components/editor/terminal-panel'

describe('messageTriggersAi', () => {
  it('matches @ai at the start or after whitespace', () => {
    expect(messageTriggersAi('@ai build an app')).toBe(true)
    expect(messageTriggersAi('hey @ai fix this')).toBe(true)
  })
  it('does not match @ai embedded in another word', () => {
    expect(messageTriggersAi('email@ai.com')).toBe(false)
    expect(messageTriggersAi('@aiden are you there')).toBe(false)
  })
  it('does not match a message without @ai', () => {
    expect(messageTriggersAi('just chatting')).toBe(false)
  })
})

describe('extractAiPrompt', () => {
  it('strips the @ai token and collapses whitespace', () => {
    expect(extractAiPrompt('@ai build an app')).toBe('build an app')
    expect(extractAiPrompt('hey @ai  fix   this')).toBe('hey fix this')
  })
})

describe('handleAiChatTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pushes a pending AI message then runs an @ai run command without calling the model', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as never

    await handleAiChatTrigger({
      roomId: 'r1',
      triggeredBy: 'alice',
      prompt: 'run npm test',
    })

    expect(sendChatMessage).toHaveBeenCalledTimes(1)
    expect(runInTerminal).toHaveBeenCalledWith('npm test')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(updateChatMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        ai: expect.objectContaining({ status: 'done', kind: 'chat' }),
      })
    )
  })

  it('calls the route once and finalizes a chat answer', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ mode: 'chat', text: 'here is your answer' }),
    })) as never

    await handleAiChatTrigger({
      roomId: 'r1',
      triggeredBy: 'bob',
      prompt: 'explain this code',
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(updateChatMessage).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        content: 'here is your answer',
        ai: expect.objectContaining({ status: 'done', kind: 'chat' }),
      })
    )
  })
})
