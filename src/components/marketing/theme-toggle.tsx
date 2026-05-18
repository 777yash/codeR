'use client'

import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('coder-theme') === 'light'
  })

  function toggle() {
    const next = !isLight
    setIsLight(next)
    if (next) {
      document.documentElement.classList.add('light')
      localStorage.setItem('coder-theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('coder-theme', 'dark')
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-150"
      style={{
        borderColor: 'var(--coder-border-mid)',
        color: 'var(--coder-text-secondary)',
      }}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  )
}
