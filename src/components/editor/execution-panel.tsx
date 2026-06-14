'use client'

import { useState, useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'
import { Play, ChevronDown, Terminal } from 'lucide-react'
import { useEditorStore } from '@/stores/editor-store'
import {
  getAllFilesContent,
  broadcastExecutionResult,
  subscribeToExecutionResults,
} from '@/components/editor/editor-client'
import { getWebContainerStatus } from '@/lib/webcontainer'
import { buildRunCommand, normalizeNpxCommand } from '@/lib/webcontainer-run'
import { runInTerminal } from '@/components/editor/terminal-panel'

const WEBCONTAINER_RUN_LANGUAGES = new Set(['javascript', 'typescript'])

type Status = 'idle' | 'running' | 'success' | 'error' | 'timeout' | 'offline'

interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number | null
  signal?: string | null
  execStatus: string | null
  durationMs: number
}

interface ExecutionPanelProps {
  roomId: string
  canRun?: boolean
}

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Ready',
  running: 'Running',
  success: 'Success',
  error: 'Error',
  timeout: 'Timeout',
  offline: 'Offline',
}

const STATUS_COLOR: Record<Status, string> = {
  idle: 'var(--coder-text-tertiary)',
  running: '#0A84FF',
  success: '#32D74B',
  error: '#FF453A',
  timeout: '#FF9F0A',
  offline: 'var(--coder-text-tertiary)',
}

export function ExecutionPanel({ roomId, canRun = true }: ExecutionPanelProps) {
  const {
    executionPanelOpen: open,
    setExecutionPanelOpen: setOpen,
    language,
  } = useEditorStore()
  const posthog = usePostHog()
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [stdin, setStdin] = useState('')

  useEffect(() => {
    return subscribeToExecutionResults((raw) => {
      const data = raw as ExecutionResult & { _fromPeer?: boolean }
      if (!data._fromPeer) return
      const timedOut =
        data.execStatus === 'timeout' ||
        data.signal === 'SIGKILL' ||
        data.exitCode === 124
      setStatus(
        timedOut ? 'timeout' : data.exitCode === 0 ? 'success' : 'error'
      )
      setResult(data)
      setOpen(true)
    })
  }, [setOpen])

  async function handleRun() {
    // JS/TS rooms with a booted container run locally in the terminal —
    // per-browser, not broadcast, no execution_logs row (unlike OneCompiler)
    if (
      WEBCONTAINER_RUN_LANGUAGES.has(language.toLowerCase()) &&
      getWebContainerStatus() === 'ready'
    ) {
      const { files: storeFiles, activeFileId } = useEditorStore.getState()
      const activeName =
        storeFiles.find((f) => f.id === activeFileId)?.name ?? null
      const command = await buildRunCommand(activeName)
      if (command) {
        posthog?.capture('code_executed', {
          language,
          runtime: 'webcontainer',
        })
        runInTerminal(normalizeNpxCommand(command))
        return
      }
      // No runnable command (e.g. bare .ts file) — fall through to OneCompiler
    }

    const files = getAllFilesContent()
    posthog?.capture('code_executed', { language, runtime: 'onecompiler' })
    setOpen(true)
    setStatus('running')
    setResult(null)

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, language, files, stdin }),
      })

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') ?? '60'
        setStatus('error')
        setResult({
          stdout: '',
          stderr: `Rate limit exceeded. Retry after ${retryAfter}s.`,
          exitCode: null,
          signal: null,
          execStatus: null,
          durationMs: 0,
        })
        return
      }

      if (!res.ok) {
        const { error } = (await res.json()) as { error: string }
        const s =
          res.status === 408
            ? 'timeout'
            : res.status === 502
              ? 'offline'
              : 'error'
        setStatus(s)
        setResult({
          stdout: '',
          stderr: error ?? 'Execution failed',
          exitCode: null,
          signal: null,
          execStatus: null,
          durationMs: 0,
        })
        return
      }

      const data = (await res.json()) as ExecutionResult
      const timedOut =
        data.execStatus === 'timeout' ||
        data.signal === 'SIGKILL' ||
        data.exitCode === 124
      setStatus(
        timedOut ? 'timeout' : data.exitCode === 0 ? 'success' : 'error'
      )
      setResult(data)
      broadcastExecutionResult({ ...data, _fromPeer: true })
    } catch {
      setStatus('error')
      setResult({
        stdout: '',
        stderr: 'Network error — could not reach execution service.',
        exitCode: null,
        signal: null,
        execStatus: null,
        durationMs: 0,
      })
    }
  }

  const running = status === 'running'

  return (
    <>
      {/* Terminal toggle — visible to all users */}
      <button
        onClick={() => setOpen(!open)}
        title={open ? 'Hide output' : 'Show output'}
        className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
          open
            ? 'bg-[var(--coder-bg-card-active)] text-[var(--coder-text-primary)]'
            : 'text-[var(--coder-text-tertiary)] hover:bg-[var(--coder-bg-card-hover)] hover:text-[var(--coder-text-secondary)]'
        }`}
      >
        <Terminal className="h-3.5 w-3.5" />
      </button>

      {/* Run button — OWNER/EDITOR only */}
      {canRun && (
        <button
          onClick={handleRun}
          disabled={running}
          className="flex h-7 items-center gap-1.5 rounded-md bg-[#32D74B] px-3 text-xs font-semibold text-black transition-colors hover:bg-[#32D74B]/90 disabled:cursor-not-allowed disabled:opacity-50 max-md:h-9 max-md:px-4"
        >
          <Play className="h-3 w-3" />
          {running ? 'Running…' : 'Run'}
        </button>
      )}

      {/* Bottom drawer */}
      {open && (
        <div className="fixed right-0 bottom-6 left-0 z-40 flex h-[280px] flex-col border-t border-[var(--coder-border)] bg-[var(--coder-bg-surface)] max-md:bottom-[calc(3rem+env(safe-area-inset-bottom))] max-md:h-[42vh]">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--coder-border)] px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--coder-text-secondary)]">
                Output
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  color: STATUS_COLOR[status],
                  backgroundColor: STATUS_COLOR[status] + '22',
                }}
              >
                {STATUS_LABEL[status]}
              </span>
              {result && !running && (
                <span className="text-[10px] text-[var(--coder-text-tertiary)]">
                  exit {result.exitCode ?? '—'} · {result.durationMs}ms
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {canRun && (
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="flex h-6 items-center gap-1 rounded bg-[#32D74B] px-2 text-[10px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-2.5 w-2.5" />
                  Run
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
                title="Minimize output"
              >
                <ChevronDown className="h-3.5 w-3.5 text-[var(--coder-text-tertiary)]" />
              </button>
            </div>
          </div>

          <div className="shrink-0 border-b border-[var(--coder-border)]">
            <div className="flex items-center gap-2 px-4 py-1">
              <span className="text-[10px] font-semibold tracking-wide text-[var(--coder-text-tertiary)] uppercase">
                stdin
              </span>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              disabled={running || !canRun}
              placeholder="Program input (one value per line)…"
              className="w-full resize-none bg-transparent px-4 pb-2 font-mono text-xs text-[var(--coder-text-secondary)] placeholder-[var(--coder-text-tertiary)] outline-none disabled:opacity-40"
              rows={2}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
            {running && (
              <span className="animate-pulse text-[var(--coder-text-tertiary)]">
                Running…
              </span>
            )}
            {!running && status === 'offline' && (
              <span className="text-[var(--coder-text-tertiary)]">
                Execution service offline. Check ONECOMPILER_RAPIDAPI_KEY is
                set.
              </span>
            )}
            {!running && status !== 'offline' && !result && (
              <span className="text-[var(--coder-text-tertiary)]">
                {canRun
                  ? 'Press Run to execute code.'
                  : 'Waiting for collaborator to run code…'}
              </span>
            )}
            {!running && result && (
              <>
                {result.stdout && (
                  <pre className="whitespace-pre-wrap text-[var(--coder-text-primary)]">
                    {result.stdout}
                  </pre>
                )}
                {result.stderr && (
                  <pre className="whitespace-pre-wrap text-[#FF453A]">
                    {result.stderr}
                  </pre>
                )}
                {!result.stdout && !result.stderr && (
                  <span className="text-[var(--coder-text-tertiary)]">
                    No output.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
