import { NextResponse } from 'next/server'
import {
  getCollabAccess,
  validInternalSecret,
  verifyCollabTicket,
} from '@/lib/collab-auth'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validInternalSecret(req.headers.get('x-internal-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => null)
  const claims =
    typeof body?.token === 'string' ? verifyCollabTicket(body.token, id) : null
  if (!claims)
    return NextResponse.json({ error: 'Invalid ticket' }, { status: 401 })
  const access = await getCollabAccess(id, claims.userId)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(
    { ...access, clientId: claims.clientId, expiresAt: claims.expiresAt },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
