'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import type { WebContainerProcess } from '@webcontainer/api'
import { useEditorStore } from '@/stores/editor-store'
import { getBootedWebContainer } from '@/lib/webcontainer'
import { useIsMobile } from '@/hooks/use-is-mobile'
import '@xterm/xterm/css/xterm.css'

type ShellState = 'idle' | 'starting' | 'running' | 'exited'

const SHELL_DOT: Record<ShellState, string> = {
  idle: 'var(--coder-text-tertiary)',
  starting: '#FF9F0A',
  running: '#32D74B',
  exited: '#FF453A',
}

// Module-level so ExecutionPanel can inject run commands — same pattern as
// editor-client's sendChatMessage. Only one TerminalPanel exists per page.
let _shellWriter: WritableStreamDefaultWriter<string> | null = null
let _pendingCommand: string | null = null
// jsh accepts input only after it prints its first prompt. Set true on the
// shell's first output chunk; until then, commands are queued not injected.
let _shellReady = false

function injectCommand(
  writer: WritableStreamDefaultWriter<string>,
  command: string
) {
  void writer.write('\x03').catch(() => undefined)
  // Give jsh a beat to interrupt any running process before the command lands.
  // Submit with '\r' (carriage return) — jsh runs the line on CR, the same byte
  // xterm sends on Enter. '\n' only echoes the text without executing it.
  setTimeout(() => {
    void writer.write(command + '\r').catch(() => undefined)
  }, 150)
}

export function runInTerminal(command: string): void {
  useEditorStore.getState().setTerminalOpen(true)
  // Only inject once the shell is ready; otherwise queue and let the
  // first-output handler flush it (covers the cold-shell first run).
  if (_shellWriter && _shellReady) injectCommand(_shellWriter, command)
  else _pendingCommand = command
}

export function TerminalPanel() {
  const terminalOpen = useEditorStore((s) => s.terminalOpen)
  const setTerminalOpen = useEditorStore((s) => s.setTerminalOpen)
  const isMobile = useIsMobile()
  const [shellState, setShellState] = useState<ShellState>('idle')
  const [height, setHeight] = useState(280)

  const hostRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const processRef = useRef<WebContainerProcess | null>(null)
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null)
  const dataDisposableRef = useRef<{ dispose(): void } | null>(null)
  // Guards double-spawn (React StrictMode re-runs the open effect)
  const startingRef = useRef(false)

  const spawnShell = useCallback(async () => {
    const term = termRef.current
    const booted = getBootedWebContainer()
    if (!term || !booted || startingRef.current || processRef.current) return
    startingRef.current = true
    try {
      const container = await booted
      setShellState('starting')
      const proc = await container.spawn('jsh', [], {
        terminal: { cols: term.cols, rows: term.rows },
      })
      processRef.current = proc
      const writer = proc.input.getWriter()
      writerRef.current = writer
      void proc.output
        .pipeTo(
          new WritableStream<string>({
            write: (data) => {
              termRef.current?.write(data)
              // First output = jsh's prompt is up and ready for input. Flush a
              // queued command now (fresh shell → nothing to interrupt, so no
              // Ctrl+C, just submit). Injecting before this races the boot and
              // the line gets swallowed.
              if (!_shellReady) {
                _shellReady = true
                if (_pendingCommand) {
                  const cmd = _pendingCommand
                  _pendingCommand = null
                  setTimeout(() => {
                    void writer.write(cmd + '\r').catch(() => undefined)
                  }, 80)
                }
              }
            },
          })
        )
        .catch(() => undefined)
      dataDisposableRef.current = term.onData((data) => {
        void writer.write(data).catch(() => undefined)
      })
      _shellWriter = writer
      setShellState('running')
      void proc.exit.then(() => {
        if (processRef.current !== proc) return
        dataDisposableRef.current?.dispose()
        dataDisposableRef.current = null
        writerRef.current = null
        _shellWriter = null
        _shellReady = false
        processRef.current = null
        setShellState('exited')
      })
    } catch {
      setShellState('exited')
    } finally {
      startingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!terminalOpen) return
    if (termRef.current) {
      // Re-opened from display:none — re-measure now that it's visible
      requestAnimationFrame(() => {
        fitRef.current?.fit()
        const term = termRef.current
        if (term)
          processRef.current?.resize({ cols: term.cols, rows: term.rows })
      })
      return
    }
    let cancelled = false
    const init = async () => {
      const host = hostRef.current
      if (!host) return
      const [{ Terminal: XTerm }, { FitAddon: Fit }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ])
      if (cancelled || termRef.current) return
      const styles = getComputedStyle(document.documentElement)
      const cssVar = (name: string, fallback: string) =>
        styles.getPropertyValue(name).trim() || fallback
      const term = new XTerm({
        convertEol: true,
        cursorBlink: true,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        theme: {
          background: cssVar('--coder-bg-surface', '#101014'),
          foreground: cssVar('--coder-text-primary', '#EEEEF2'),
          cursor: cssVar('--coder-accent', '#F43F5E'),
        },
      })
      const fit = new Fit()
      term.loadAddon(fit)
      term.open(host)
      fit.fit()
      termRef.current = term
      fitRef.current = fit
      void spawnShell()
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [terminalOpen, spawnShell])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(() => {
      const term = termRef.current
      if (!term || !fitRef.current) return
      fitRef.current.fit()
      processRef.current?.resize({ cols: term.cols, rows: term.rows })
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault()
        setTerminalOpen(!useEditorStore.getState().terminalOpen)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setTerminalOpen])

  useEffect(
    () => () => {
      dataDisposableRef.current?.dispose()
      processRef.current?.kill()
      termRef.current?.dispose()
      _shellWriter = null
      _pendingCommand = null
    },
    []
  )

  const handleDragStart = (event: React.PointerEvent) => {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = height
    const onMove = (ev: PointerEvent) => {
      const next = Math.min(
        Math.max(startHeight + (startY - ev.clientY), 160),
        Math.round(window.innerHeight * 0.6)
      )
      setHeight(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleRestart = () => {
    termRef.current?.clear()
    void spawnShell()
  }

  return (
    <div
      className={`fixed right-0 bottom-6 left-0 z-40 flex-col border-t border-[var(--coder-border)] bg-[var(--coder-bg-surface)] max-md:bottom-[calc(3rem+env(safe-area-inset-bottom))] max-md:h-[42vh] ${
        terminalOpen ? 'flex' : 'hidden'
      }`}
      style={isMobile ? undefined : { height }}
    >
      <div
        onPointerDown={handleDragStart}
        className="h-1 w-full shrink-0 cursor-row-resize transition-colors hover:bg-[var(--coder-accent)] max-md:hidden"
      />
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--coder-border)] px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--coder-text-secondary)]">
            Terminal
          </span>
          <span className="text-[10px] text-[var(--coder-text-tertiary)]">
            jsh
          </span>
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: SHELL_DOT[shellState] }}
          />
        </div>
        <div className="flex items-center gap-1">
          {shellState === 'exited' && (
            <button
              onClick={handleRestart}
              className="flex h-6 items-center gap-1 rounded bg-[var(--coder-bg-card-hover)] px-2 text-[10px] font-semibold text-[var(--coder-text-secondary)] transition-colors hover:bg-[var(--coder-bg-card-active)]"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Restart shell
            </button>
          )}
          <button
            onClick={() => setTerminalOpen(false)}
            title="Close terminal (Ctrl+`)"
            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
          >
            <ChevronDown className="h-3.5 w-3.5 text-[var(--coder-text-tertiary)]" />
          </button>
        </div>
      </div>
      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden pl-2" />
    </div>
  )
}
