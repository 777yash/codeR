import { Role } from '@/generated/prisma/client'

type Action = 'view' | 'edit' | 'run' | 'manage' | 'delete'

const permissions: Record<Role, Action[]> = {
  OWNER: ['view', 'edit', 'run', 'manage', 'delete'],
  EDITOR: ['view', 'edit', 'run'],
  VIEWER: ['view'],
}

export function canPerform(action: Action, role: Role): boolean {
  return permissions[role].includes(action)
}
