import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { markPresent, getOnlineUserIds } from '@/lib/presence'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  markPresent(id, session.user.id)
  const onlineIds = getOnlineUserIds(id)

  return NextResponse.json({ onlineIds })
}
