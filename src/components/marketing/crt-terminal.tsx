'use client'

import dynamic from 'next/dynamic'
import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pause, Play, Terminal } from 'lucide-react'
import '@/shaders/crt/crt.css'

const CrtBackground = dynamic(
  () =>
    import('@/shaders/crt/CrtBackground').then(
      (module) => module.CrtBackground
    ),
  { ssr: false }
)

class CrtBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Standby({ paused = false }: { paused?: boolean }) {
  return (
    <div className="crt-standby">
      <Terminal size={28} />
      <span>codeR://{paused ? 'standby' : 'ready'}</span>
    </div>
  )
}

export function CrtTerminal({ suspended = false }: { suspended?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    let disposed = false
    let cancelIdle: (() => void) | undefined
    const update = () => {
      cancelIdle?.()
      const callback = () => {
        if (!disposed) {
          setReduced(motion.matches)
          setActive(visible && !document.hidden && !motion.matches)
        }
      }
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(callback, { timeout: 700 })
        cancelIdle = () => window.cancelIdleCallback(id)
      } else {
        const id = setTimeout(callback, 150)
        cancelIdle = () => clearTimeout(id)
      }
      // Release the GPU immediately when the display is no longer visible.
      if (!visible || document.hidden || motion.matches) setActive(false)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
      update()
    })
    observer.observe(host)
    document.addEventListener('visibilitychange', update)
    motion.addEventListener('change', update)
    return () => {
      disposed = true
      cancelIdle?.()
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      motion.removeEventListener('change', update)
    }
  }, [])
  return (
    <div className="crt-console">
      <div className="crt-titlebar">
        <span>
          <Terminal size={14} /> terminal://codeR
        </span>
        <span className="crt-display-label">PHOSPHOR / 01</span>
      </div>
      <div ref={hostRef} className="shader-frame" aria-hidden="true">
        <CrtBoundary fallback={<Standby />}>
          {active && !paused && !suspended ? (
            <CrtBackground
              variant="terminal"
              speed={1.0}
              typeSpeed={1.0}
              motion={1.0}
              hue={0}
              saturation={1.0}
              brightness={1.0}
              opacity={1.0}
            />
          ) : (
            <Standby paused={paused || reduced} />
          )}
        </CrtBoundary>
      </div>
      <div className="crt-console-footer">
        <span>
          <i /> ZION MAINFRAME
        </span>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          disabled={reduced}
          aria-label={
            reduced
              ? 'Animation disabled by reduced motion preference'
              : paused
                ? 'Play terminal animation'
                : 'Pause terminal animation'
          }
        >
          {paused || reduced ? <Play size={12} /> : <Pause size={12} />}
          {reduced ? 'Reduced motion' : paused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  )
}
