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

export function requireRole(
  role: Role,
  action: Action,
  userRole: Role
): boolean {
  if (!canPerform(action, userRole)) return false
  if (role === 'OWNER' && userRole !== 'OWNER') return false
  return true
}

export function isOwner(role: Role): boolean {
  return role === 'OWNER'
}

export function isAtLeastEditor(role: Role): boolean {
  return role === 'EDITOR' || role === 'OWNER'
}

export { Role }
