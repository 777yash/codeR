import Link from 'next/link'

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

const sizes = {
  sm: { text: '16px', block: { width: '6px', height: '12px' } },
  md: { text: '18px', block: { width: '7px', height: '14px' } },
  lg: { text: '20px', block: { width: '8px', height: '16px' } },
}

export function AppLogo({ size = 'md', href = '/dashboard' }: AppLogoProps) {
  const s = sizes[size]
  const inner = (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          fontSize: s.text,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--coder-text-primary)',
        }}
      >
        codeR
      </span>
      <span
        className="animate-pulse"
        style={{
          display: 'inline-block',
          width: s.block.width,
          height: s.block.height,
          borderRadius: '2px',
          backgroundColor: 'var(--coder-accent)',
          marginLeft: '2px',
          flexShrink: 0,
        }}
      />
    </span>
  )

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  )
}
