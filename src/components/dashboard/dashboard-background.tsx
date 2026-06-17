'use client'

import { useSyncExternalStore } from 'react'
import FaultyTerminal from './faulty-terminal'

const GRID: [number, number] = [2, 1]

// Reactively track the app's light/dark theme (toggled via the `light` class on
// <html> — see ThemeToggle). useSyncExternalStore keeps it SSR-safe.
function subscribe(cb: () => void): () => void {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => obs.disconnect()
}

function useIsLight(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('light'),
    () => false
  )
}

/**
 * Animated WebGL backdrop for the dashboard, sitting behind the content.
 * Dark theme: brand rose glyphs that glow against the near-black base
 * (screen blend). Light theme: a complementary teal, kept very faint so the
 * light UI stays clean. Non-interactive (pointer-events none, mouseReact off).
 */
export default function DashboardBackground() {
  const isLight = useIsLight()

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        opacity: isLight ? 0.06 : 0.5,
        mixBlendMode: isLight ? 'normal' : 'screen',
      }}
    >
      <FaultyTerminal
        className="h-full w-full"
        tint={isLight ? '#0D9488' : '#F43F5E'}
        scale={1.6}
        gridMul={GRID}
        digitSize={1.2}
        timeScale={0.3}
        scanlineIntensity={0.4}
        glitchAmount={1}
        flickerAmount={0.6}
        noiseAmp={1}
        curvature={0.1}
        mouseReact={false}
        pageLoadAnimation
        brightness={isLight ? 1 : 0.8}
      />
    </div>
  )
}
