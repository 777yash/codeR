export interface ExecutionOutcome {
  exitCode: number | null
  execStatus: string | null
  signal?: string | null
}

export function executionStatus(result: ExecutionOutcome) {
  if (
    result.execStatus === 'timeout' ||
    result.signal === 'SIGKILL' ||
    result.exitCode === 124
  )
    return 'timeout'
  if (['error', 'compilation_error'].includes(result.execStatus ?? ''))
    return 'error'
  if (result.exitCode !== null)
    return result.exitCode === 0 ? 'success' : 'error'
  return result.execStatus === 'completed' ? 'completed' : 'error'
}

export function normalizeRemoteExecution(
  result: {
    status: string
    stdout?: string | null
    stderr?: string | null
    exception?: string | null
    executionTime?: number | null
    exitCode?: number | null
  },
  fallbackDuration: number
) {
  const exitCode = result.exitCode ?? null
  const execStatus =
    result.status === 'timeout' ||
    /timed?\s*out|timeout/i.test(result.exception ?? '')
      ? 'timeout'
      : result.exception ||
          ['error', 'compilation_error'].includes(result.status)
        ? 'error'
        : exitCode !== null
          ? exitCode === 0
            ? 'success'
            : 'error'
          : 'completed'
  // OneCompiler's "success" describes the API call, and often omits the program's exit code.
  return {
    stdout: result.stdout ?? '',
    stderr: [result.stderr, result.exception].filter(Boolean).join('\n'),
    exitCode,
    execStatus,
    durationMs: Math.round(result.executionTime ?? fallbackDuration),
  }
}
