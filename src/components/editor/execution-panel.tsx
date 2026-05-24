'use client'

import { useState, useEffect } from 'react'
import { Play, ChevronDown } from 'lucide-react'
import { useEditorStore } from '@/stores/editor-store'
import {
  getEditorContent,
  broadcastExecutionResult,
  subscribeToExecutionResults,
} from '@/components/editor/editor-client'

type Status = 'idle' | 'running' | 'success' | 'error' | 'timeout' | 'offline'

interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number | null
  signal?: string | null
  execStatus: string | null // TO=timeout, RE=runtime error, SG=signal, OL=output limit
  durationMs: number
}

interface ExecutionPanelProps {
  roomId: string
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
  idle: '#555555',
  running: '#0A84FF',
  success: '#32D74B',
  error: '#FF453A',
  timeout: '#FF9F0A',
  offline: '#555555',
}

export function ExecutionPanel({ roomId }: ExecutionPanelProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [stdin, setStdin] = useState('')
  const { language } = useEditorStore()

  // Receive execution results broadcast by other collaborators
  useEffect(() => {
    const unsub = subscribeToExecutionResults((raw) => {
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
    return unsub
  }, [])

  async function handleRun() {
    const code = getEditorContent()
    setOpen(true)
    setStatus('running')
    setResult(null)

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, language, code, stdin }),
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
        const status =
          res.status === 408
            ? 'timeout'
            : res.status === 502
              ? 'offline'
              : 'error'
        setStatus(status)
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
      {/* Run button — renders at call site in top bar */}
      <button
        onClick={handleRun}
        disabled={running}
        className="flex h-7 items-center gap-1.5 rounded-md bg-[#32D74B] px-3 text-xs font-semibold text-black transition-colors hover:bg-[#32D74B]/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-3 w-3" />
        {running ? 'Running…' : 'Run'}
      </button>

      {/* Bottom drawer — fixed, full width, above status bar */}
      {open && (
        <div
          className="fixed right-0 bottom-0 left-0 z-40 flex flex-col border-t border-white/[0.08] bg-[#111111]"
          style={{ height: 280 }}
        >
          {/* Drawer header */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#888888]">
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
                <span className="text-[10px] text-[#444444]">
                  exit {result.exitCode ?? '—'} · {result.durationMs}ms
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleRun}
                disabled={running}
                className="flex h-6 items-center gap-1 rounded bg-[#32D74B] px-2 text-[10px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-2.5 w-2.5" />
                Run
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5"
                title="Close output panel"
              >
                <ChevronDown className="h-3.5 w-3.5 text-[#555555]" />
              </button>
            </div>
          </div>

          {/* stdin input */}
          <div className="shrink-0 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 px-4 py-1">
              <span className="text-[10px] font-semibold tracking-wide text-[#444444] uppercase">
                stdin
              </span>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              disabled={running}
              placeholder="Program input (one value per line)…"
              className="w-full resize-none bg-transparent px-4 pb-2 font-mono text-xs text-[#aaaaaa] placeholder-[#333333] outline-none disabled:opacity-40"
              rows={2}
            />
          </div>

          {/* Output content */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
            {running && (
              <span className="animate-pulse text-[#555555]">Running…</span>
            )}
            {!running && status === 'offline' && (
              <span className="text-[#555555]">
                Execution service offline. Check ONECOMPILER_RAPIDAPI_KEY is
                set.
              </span>
            )}
            {!running && status !== 'offline' && !result && (
              <span className="text-[#444444]">Press Run to execute code.</span>
            )}
            {!running && result && (
              <>
                {result.stdout && (
                  <pre className="whitespace-pre-wrap text-[#eeeeee]">
                    {result.stdout}
                  </pre>
                )}
                {result.stderr && (
                  <pre className="whitespace-pre-wrap text-[#FF453A]">
                    {result.stderr}
                  </pre>
                )}
                {!result.stdout && !result.stderr && (
                  <span className="text-[#444444]">No output.</span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
