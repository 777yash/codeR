import { NextResponse } from 'next/server'
import { SnapshotValidationError } from '@/lib/yjs-snapshot-codec'

export function snapshotErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof SnapshotValidationError)) throw error
  return NextResponse.json({ error: error.message }, { status: error.status })
}
