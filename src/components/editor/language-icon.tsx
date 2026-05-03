import type { SimpleIcon } from 'simple-icons'
import {
  siJavascript,
  siTypescript,
  siPython,
  siGo,
  siRust,
  siOpenjdk,
  siCplusplus,
  siC,
  siDotnet,
  siRuby,
  siPhp,
  siSwift,
  siKotlin,
  siScala,
  siR,
  siLua,
  siPerl,
  siHaskell,
  siElixir,
  siClojure,
  siDart,
  siJulia,
  siGnubash,
} from 'simple-icons'

const ICONS: Record<string, SimpleIcon> = {
  javascript: siJavascript,
  typescript: siTypescript,
  python: siPython,
  go: siGo,
  rust: siRust,
  java: siOpenjdk,
  cpp: siCplusplus,
  c: siC,
  csharp: siDotnet,
  ruby: siRuby,
  php: siPhp,
  swift: siSwift,
  kotlin: siKotlin,
  scala: siScala,
  r: siR,
  lua: siLua,
  perl: siPerl,
  haskell: siHaskell,
  elixir: siElixir,
  clojure: siClojure,
  dart: siDart,
  julia: siJulia,
  bash: siGnubash,
}

// simple-icons uses #000000 for some logos — override with recognisable brand colours
const HEX_OVERRIDE: Record<string, string> = {
  rust: 'CE422B', // Rust traditional orange-brown
  java: 'ED8B00', // Java traditional orange
  lua: '6E9ECA', // lighter blue for dark backgrounds
}

// Text badge fallback for languages without simple-icons entries
const BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  sql: { bg: '#4479A1', fg: '#fff', label: 'SQL' },
  matlab: { bg: '#0076A8', fg: '#fff', label: 'ML' },
  vbnet: { bg: '#5C2D91', fg: '#fff', label: 'VB' },
  cobol: { bg: '#005CA5', fg: '#fff', label: 'Cb' },
  fortran: { bg: '#734F96', fg: '#fff', label: 'Ft' },
  assembly: { bg: '#6E4C13', fg: '#fff', label: 'Asm' },
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

interface LanguageIconProps {
  language: string
  size?: number
}

export function LanguageIcon({ language, size = 16 }: LanguageIconProps) {
  const lang = language.toLowerCase()
  const icon = ICONS[lang]

  if (!icon) {
    const cfg = BADGE[lang] ?? {
      bg: '#333',
      fg: '#aaa',
      label: language.slice(0, 2).toUpperCase(),
    }
    const isLong = cfg.label.length > 2
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: cfg.bg,
          color: cfg.fg,
          height: size,
          minWidth: size,
          width: isLong ? 'auto' : size,
          padding: isLong ? `0 ${Math.round(size * 0.19)}px` : '0',
          borderRadius: 2,
          fontSize: isLong ? Math.round(size * 0.4) : Math.round(size * 0.5),
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
          flexShrink: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {cfg.label}
      </span>
    )
  }

  const hex = HEX_OVERRIDE[lang] ?? icon.hex
  const pathColor = luminance(hex) < 0.12 ? 'white' : `#${hex}`
  const bgHex = HEX_OVERRIDE[lang] ?? icon.hex

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `#${bgHex}22`,
        height: size,
        width: size,
        borderRadius: 2,
        flexShrink: 0,
      }}
    >
      <svg
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill={pathColor}
        aria-hidden="true"
      >
        <path d={icon.path} />
      </svg>
    </span>
  )
}
