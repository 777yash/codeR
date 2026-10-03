import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  COLLAB_TICKET_TTL_MS,
  getCollabAccess,
  issueCollabTicket,
} from '@/lib/collab-auth'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Unlike internal endpoints, a caller-supplied secret header cannot bypass CSRF.
  const origin = req.headers.get('origin')
  const appOrigin = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  ).origin
  if (origin && origin !== appOrigin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (
    !Number.isSafeInteger(body?.clientId) ||
    body.clientId < 0 ||
    body.clientId > 0xffffffff
  ) {
    return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
  }
  const { id } = await params
  const access = await getCollabAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const expiresAt = Math.min(
    Date.now() + COLLAB_TICKET_TTL_MS,
    Date.parse(session.expires)
  )
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = issueCollabTicket({
    roomId: id,
    userId: access.userId,
    clientId: body.clientId,
    expiresAt,
  })
  return NextResponse.json(
    { token, role: access.role, expiresAt },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
