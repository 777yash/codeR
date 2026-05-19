'use client'

import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  function toggle() {
    const isLight = document.documentElement.classList.toggle('light')
    localStorage.setItem('coder-theme', isLight ? 'light' : 'dark')
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
      <Sun className="hidden h-4 w-4 [.light_&]:block" />
      <Moon className="block h-4 w-4 [.light_&]:hidden" />
    </button>
  )
}
