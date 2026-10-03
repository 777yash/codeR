import type { Role } from '@/generated/prisma/client'

type Action = 'view' | 'edit' | 'run' | 'share' | 'manage' | 'delete'

const permissions: Record<Role, Action[]> = {
  OWNER: ['view', 'edit', 'run', 'share', 'manage', 'delete'],
  EDITOR: ['view', 'edit', 'run', 'share'],
  VIEWER: ['view'],
}

export function canPerform(
  action: Action,
  role: Role | null | undefined
): boolean {
  return role ? (permissions[role]?.includes(action) ?? false) : false
}
