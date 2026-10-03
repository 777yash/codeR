import { describe, expect, it } from 'vitest'
import {
  executionStatus,
  normalizeRemoteExecution,
} from '@/lib/execution-result'

describe('remote execution outcomes', () => {
  it('does not invent success or an exit code from API success, including a silent process.exit(7)', () => {
    const result = normalizeRemoteExecution(
      { status: 'success', exception: null, stdout: null, stderr: null },
      10
    )
    expect(result).toMatchObject({ exitCode: null, execStatus: 'completed' })
    expect(executionStatus(result)).toBe('completed')
  })
  it('preserves compiler diagnostics without labelling the run successful', () => {
    const stderr = 'Error: Could not find or load main class index'
    const result = normalizeRemoteExecution({ status: 'success', stderr }, 10)
    expect(result.stderr).toBe(stderr)
    expect(result.exitCode).toBeNull()
    expect(executionStatus(result)).not.toBe('success')
  })
  it('allows successful programs to write stderr when a real exit code is provided', () => {
    const result = normalizeRemoteExecution(
      {
        status: 'success',
        exitCode: 0,
        stderr: 'A warning',
        executionTime: 9.4,
      },
      10
    )
    expect(executionStatus(result)).toBe('success')
    expect(result.durationMs).toBe(9)
  })
  it('preserves explicit nonzero exits', () => {
    expect(
      executionStatus(
        normalizeRemoteExecution({ status: 'success', exitCode: 7 }, 10)
      )
    ).toBe('error')
    expect(
      executionStatus({ exitCode: 0, execStatus: 'compilation_error' })
    ).toBe('error')
  })
  it('classifies explicit provider exceptions and preserves their diagnostics', () => {
    const result = normalizeRemoteExecution(
      {
        status: 'success',
        stderr: 'compiler detail',
        exception: 'Compilation failed',
      },
      10
    )
    expect(executionStatus(result)).toBe('error')
    expect(result.stderr).toContain('compiler detail')
    expect(result.stderr).toContain('Compilation failed')
  })
  it('detects provider and local timeouts', () => {
    expect(
      executionStatus(
        normalizeRemoteExecution(
          { status: 'success', exception: 'Operation timed out' },
          10
        )
      )
    ).toBe('timeout')
    expect(executionStatus({ execStatus: null, exitCode: 124 })).toBe('timeout')
    expect(
      executionStatus({ execStatus: null, exitCode: null, signal: 'SIGKILL' })
    ).toBe('timeout')
  })
})
