import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { markPresent, getOnlineUserIds } from '@/lib/presence'
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
  markPresent(id, session.user.id)
  const onlineIds = getOnlineUserIds(id)

  return NextResponse.json({ onlineIds })
}
