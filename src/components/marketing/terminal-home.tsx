'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, CornerDownLeft, Terminal } from 'lucide-react'
import { CrtTerminal } from './crt-terminal'
import { ThemeToggle } from './theme-toggle'
const WorkspacePreview = dynamic(() =>
  import('./workspace-preview').then((module) => module.WorkspacePreview)
)

const COMMANDS = [
  ['start', 'Create an account & open your workspace'],
  ['signin', 'Return to your rooms'],
  ['demo', 'Try the interactive editor preview'],
  ['features', 'Explore what’s under the hood'],
  ['docs', 'Read the documentation'],
  ['about', 'A quick introduction to codeR'],
  ['theme', 'Switch between dark & light'],
  ['clear', 'Clear this terminal'],
] as const
type Entry = { command: string; output: string }
const ROUTES: Record<string, string> = {
  start: '/signup',
  signup: '/signup',
  signin: '/signin',
  login: '/signin',
  rooms: '/dashboard',
  features: '/features',
  docs: '/docs',
  changelog: '/changelog',
}
const ASCII_BANNER = [
  '                _       ____',
  '   ___ ___   __| | ___ |  _ \\',
  '  / __/ _ \\ / _` |/ _ \\| |_) |',
  ' | (_| (_) | (_| |  __/|  _ <',
  '  \\___\\___/ \\__,_|\\___||_| \\_\\',
].join('\n')

export function TerminalHome() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [demoOpen, setDemoOpen] = useState(false)
  const history = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const demoCloseRef = useRef<HTMLButtonElement>(null)
  const closeDemo = useCallback(() => {
    setDemoOpen(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])
  useEffect(() => {
    if (!demoOpen) return
    demoCloseRef.current?.focus()
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDemo()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [demoOpen, closeDemo])
  useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript && entries.length)
      transcript.scrollTop = transcript.scrollHeight
  }, [entries])

  function run(raw: string) {
    const command = raw.trim().toLowerCase()
    if (!command) return
    setInput('')
    history.current = [...history.current, raw.trim()].slice(-50)
    historyIndex.current = -1
    if (command === 'clear') {
      setEntries([])
      return
    }
    let output: string
    if (Object.hasOwn(ROUTES, command)) {
      output = `Opening ${ROUTES[command]} …`
      router.push(ROUTES[command])
    } else if (command === 'demo') {
      output = 'Preview opened. Your real workspace is one room away.'
      setDemoOpen(true)
    } else if (command === 'theme') {
      const light = document.documentElement.classList.toggle('light')
      try {
        localStorage.setItem('coder-theme', light ? 'light' : 'dark')
      } catch {
        /* Theme still works if storage is unavailable. */
      }
      output = `${light ? 'Light' : 'Dark'} theme enabled.`
    } else if (command === 'help' || command === 'ls')
      output = COMMANDS.map(
        ([name, description]) => `${name.padEnd(10)} ${description}`
      ).join('\n')
    else if (command === 'about' || command === 'whoami')
      output =
        'codeR — a real-time collaborative code editor.\n\nLive cursors. Conflict-free editing. In-browser execution.\nAI completions & chat. Checkpoints. Local folder linking.\n\nA personal project. Free to use. Built to bring ideas together.'
    else
      output = `Command not found: ${raw.trim()}\nType "help" to see available commands.`
    setEntries((previous) =>
      [...previous, { command: raw.trim(), output }].slice(-40)
    )
  }

  return (
    <div className="terminal-home">
      <div className="home-terminal-window">
        <header className="home-terminal-titlebar">
          <Link href="/" className="terminal-wordmark" aria-label="codeR home">
            <Terminal size={16} />
            guest@coder<span>:~</span>
          </Link>
          <div>
            <Link href="/docs" className="terminal-top-link">
              docs <ArrowUpRight size={11} />
            </Link>
            <a
              href="https://github.com/777yash/codeR"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-top-link"
            >
              source <ArrowUpRight size={11} />
            </a>
            <ThemeToggle />
          </div>
        </header>
        <div className="home-terminal-body">
          <div className="terminal-screen-background">
            <CrtTerminal suspended={demoOpen} />
          </div>
          <section
            className="terminal-session"
            aria-label="Interactive welcome terminal"
          >
            {demoOpen && (
              <div className="terminal-inline-demo">
                <div>
                  <button type="button" ref={demoCloseRef} onClick={closeDemo}>
                    ← Back to terminal
                  </button>
                  <span>Demo workspace</span>
                </div>
                <WorkspacePreview />
                <Link href="/signup" className="action-primary">
                  Open your own workspace <ArrowUpRight size={15} />
                </Link>
              </div>
            )}
            <div
              className="terminal-transcript"
              ref={transcriptRef}
              hidden={demoOpen}
            >
              <pre className="terminal-ascii" aria-hidden="true">
                {ASCII_BANNER}
              </pre>
              <h1 className="sr-only">codeR collaborative code editor</h1>
              <div className="terminal-quick-actions">
                {COMMANDS.slice(0, 5).map(([command, description]) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => run(command)}
                  >
                    <span>$</span> {command} <CornerDownLeft size={12} />
                    <span className="terminal-command-description">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
              <div
                className="terminal-entries"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
              >
                {entries.map((entry, index) => (
                  <div className="terminal-entry" key={index}>
                    <p>
                      <span>guest@coder</span>{' '}
                      <span className="terminal-dollar">~ $</span>{' '}
                      {entry.command}
                    </p>
                    <pre>{entry.output}</pre>
                  </div>
                ))}
              </div>
            </div>
            <form
              className="terminal-prompt"
              hidden={demoOpen}
              onSubmit={(event) => {
                event.preventDefault()
                run(input)
              }}
            >
              <label htmlFor="home-command">
                <span>guest@coder</span>
                <span>~ $</span>
              </label>
              <input
                ref={inputRef}
                id="home-command"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label="Terminal command"
                placeholder="type help to begin"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={120}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault()
                    const length = history.current.length
                    if (!length) return
                    const current =
                      historyIndex.current < 0 ? length : historyIndex.current
                    const next = Math.min(
                      length,
                      Math.max(0, current + (event.key === 'ArrowUp' ? -1 : 1))
                    )
                    historyIndex.current = next
                    setInput(history.current[next] ?? '')
                  } else if (event.key === 'Tab') {
                    const names = ['help', ...COMMANDS.map(([name]) => name)]
                    const matches = names.filter(
                      (name) =>
                        input.length > 0 && name.startsWith(input.toLowerCase())
                    )
                    if (matches.length === 1 && matches[0] !== input) {
                      event.preventDefault()
                      setInput(matches[0])
                    }
                  } else if (event.key === 'Escape') setInput('')
                }}
              />
              <button type="submit" aria-label="Execute command">
                <CornerDownLeft size={16} />
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
