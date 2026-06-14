import 'server-only'
import * as Y from 'yjs'
import { decodeInto } from '@/lib/yjs-snapshot-codec'
import type { RoomLanguageStat } from '@/lib/language-meta'

export function languageStatsFromSnapshot(
  bytes: Uint8Array | null
): RoomLanguageStat[] {
  if (!bytes || bytes.length === 0) return []
  const doc = new Y.Doc()
  try {
    decodeInto(doc, bytes as unknown as Uint8Array)
    const totals = new Map<string, number>()
    doc.getMap('file-list').forEach((val) => {
      try {
        const meta = JSON.parse(val as string) as {
          id: string
          language?: string
        }
        const length = doc.getText(`file:${meta.id}`).length
        if (length === 0) return
        const language = meta.language ?? 'plaintext'
        totals.set(language, (totals.get(language) ?? 0) + length)
      } catch {}
    })
    const total = Array.from(totals.values()).reduce((sum, n) => sum + n, 0)
    if (total === 0) return []
    return Array.from(totals, ([language, bytes]) => ({
      language,
      percent: (bytes / total) * 100,
    })).sort((a, b) => b.percent - a.percent)
  } catch {
    return []
  } finally {
    doc.destroy()
  }
}
