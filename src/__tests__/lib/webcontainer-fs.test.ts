import { describe, it, expect } from 'vitest'
import { sanitizeFilePath, toFileTree } from '@/lib/webcontainer-fs'
import type { DirectoryNode, FileNode } from '@webcontainer/api'

describe('sanitizeFilePath', () => {
  it('passes plain filenames through', () => {
    expect(sanitizeFilePath('index.js')).toBe('index.js')
  })

  it('passes nested paths through', () => {
    expect(sanitizeFilePath('src/utils/math.ts')).toBe('src/utils/math.ts')
  })

  it('strips leading slashes', () => {
    expect(sanitizeFilePath('/index.js')).toBe('index.js')
    expect(sanitizeFilePath('//src/a.js')).toBe('src/a.js')
  })

  it('rejects parent-directory traversal', () => {
    expect(sanitizeFilePath('../escape.js')).toBeNull()
    expect(sanitizeFilePath('src/../../escape.js')).toBeNull()
  })

  it('rejects current-directory segments', () => {
    expect(sanitizeFilePath('./index.js')).toBeNull()
  })

  it('rejects empty segments and empty names', () => {
    expect(sanitizeFilePath('src//a.js')).toBeNull()
    expect(sanitizeFilePath('')).toBeNull()
    expect(sanitizeFilePath('/')).toBeNull()
  })
})

describe('toFileTree', () => {
  it('builds flat file entries', () => {
    const tree = toFileTree([{ name: 'index.js', content: 'console.log(1)' }])
    expect((tree['index.js'] as FileNode).file.contents).toBe('console.log(1)')
  })

  it('builds nested directory entries', () => {
    const tree = toFileTree([{ name: 'src/index.js', content: 'a' }])
    const src = tree['src'] as DirectoryNode
    expect((src.directory['index.js'] as FileNode).file.contents).toBe('a')
  })

  it('builds deeply nested entries', () => {
    const tree = toFileTree([{ name: 'a/b/c/d.txt', content: 'deep' }])
    const a = tree['a'] as DirectoryNode
    const b = a.directory['b'] as DirectoryNode
    const c = b.directory['c'] as DirectoryNode
    expect((c.directory['d.txt'] as FileNode).file.contents).toBe('deep')
  })

  it('merges files sharing a directory', () => {
    const tree = toFileTree([
      { name: 'src/a.js', content: 'a' },
      { name: 'src/b.js', content: 'b' },
    ])
    const src = tree['src'] as DirectoryNode
    expect(Object.keys(src.directory)).toEqual(['a.js', 'b.js'])
  })

  it('skips invalid paths', () => {
    const tree = toFileTree([
      { name: '../escape.js', content: 'x' },
      { name: 'ok.js', content: 'y' },
    ])
    expect(Object.keys(tree)).toEqual(['ok.js'])
  })

  it('preserves empty content', () => {
    const tree = toFileTree([{ name: 'empty.js', content: '' }])
    expect((tree['empty.js'] as FileNode).file.contents).toBe('')
  })

  it('keeps a file when a same-named directory segment follows', () => {
    const tree = toFileTree([
      { name: 'src', content: 'i am a file' },
      { name: 'src/a.js', content: 'a' },
    ])
    const src = tree['src'] as DirectoryNode
    expect((src.directory['a.js'] as FileNode).file.contents).toBe('a')
  })
})
