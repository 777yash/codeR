'use client'

import { useEffect, useState } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { getLanguageStats } from '@/components/editor/editor-client'
import { LANG_COLORS, languageLabel as label } from '@/lib/language-meta'

interface LanguageStat {
  language: string
  bytes: number
  percent: number
}

export function LanguageStatsBar() {
  const files = useEditorStore((s) => s.files)
  const [stats, setStats] = useState<LanguageStat[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const compute = () => {
      const raw = getLanguageStats()
      const total = raw.reduce((sum, s) => sum + s.bytes, 0)
      setStats(
        total === 0
          ? []
          : raw.map((s) => ({ ...s, percent: (s.bytes / total) * 100 }))
      )
    }
    compute()
    const interval = setInterval(compute, 10_000)
    return () => clearInterval(interval)
  }, [files])

  if (stats.length === 0) return null

  const summary = stats
    .map((s) => `${label(s.language)} ${s.percent.toFixed(1)}%`)
    .join(' · ')
  const inline = stats.slice(0, 3)
  const overflow = stats.length - inline.length

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded((v) => !v)}
        title={summary}
        className="border-app-mid bg-app-card hover:bg-app-card-hover flex h-7 items-center gap-2.5 rounded-md border px-2.5 transition-colors"
      >
        <div className="flex h-1.5 w-28 shrink-0 overflow-hidden rounded-full">
          {stats.map((s) => (
            <div
              key={s.language}
              style={{
                width: `${s.percent}%`,
                backgroundColor: LANG_COLORS[s.language] ?? '#6e7681',
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2.5 overflow-hidden">
          {inline.map((s) => (
            <span
              key={s.language}
              className="text-app-muted flex items-center gap-1 text-[11px] whitespace-nowrap"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: LANG_COLORS[s.language] ?? '#6e7681',
                }}
              />
              <span className="text-app font-medium">{label(s.language)}</span>
              {s.percent.toFixed(1)}%
            </span>
          ))}
          {overflow > 0 && (
            <span className="text-app-dim text-[11px] whitespace-nowrap">
              +{overflow} more
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-app-mid bg-app-surface absolute top-8 left-0 z-50 w-52 rounded-md border py-1.5 shadow-[var(--coder-shadow-md)]">
          {stats.map((s) => (
            <div
              key={s.language}
              className="flex items-center gap-2 px-3 py-1 text-xs"
            >
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: LANG_COLORS[s.language] ?? '#6e7681',
                }}
              />
              <span className="text-app flex-1 truncate">
                {label(s.language)}
              </span>
              <span className="text-app-dim">{s.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
