import { describe, it, expect } from 'vitest'
import { normalizeNpxCommand } from '@/lib/webcontainer-run'

describe('normalizeNpxCommand', () => {
  it('prepends -y to a bare npx command', () => {
    expect(normalizeNpxCommand('npx create-vite app')).toBe(
      'npx -y create-vite app'
    )
  })

  it('leaves npx -y untouched', () => {
    expect(normalizeNpxCommand('npx -y create-vite app')).toBe(
      'npx -y create-vite app'
    )
  })

  it('handles npx after && chains', () => {
    expect(normalizeNpxCommand('npm install && npx vite build')).toBe(
      'npm install && npx -y vite build'
    )
  })

  it('handles npx after ; and ||', () => {
    expect(normalizeNpxCommand('true; npx serve || npx http-server')).toBe(
      'true; npx -y serve || npx -y http-server'
    )
  })

  it('does not touch non-npx commands', () => {
    expect(normalizeNpxCommand('npm run dev')).toBe('npm run dev')
    expect(normalizeNpxCommand('node index.js')).toBe('node index.js')
  })

  it('does not mangle words containing npx', () => {
    expect(normalizeNpxCommand('echo manpx hello')).toBe('echo manpx hello')
  })
})
