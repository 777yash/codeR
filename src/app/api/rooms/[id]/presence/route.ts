import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { heartbeatPresence } from '@/lib/presence'
import { getCollabAccess } from '@/lib/collab-auth'
import { verifyCsrfOrigin } from '@/lib/csrf'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const access = await getCollabAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const onlineIds = await heartbeatPresence(id, session.user.id, req.signal)
    return NextResponse.json(
      { onlineIds },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'Presence is unavailable' },
      { status: 503 }
    )
  }
}
