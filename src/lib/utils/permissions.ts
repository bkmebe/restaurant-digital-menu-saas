import { Role } from '@/types/common'

export const ROLE_HIERARCHY: Record<Role, number> = {
  waiter: 1,
  cashier: 2,
  manager: 3,
  admin: 4,
}

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function isAdmin(role: Role): boolean {
  return role === 'admin'
}

export function isManager(role: Role): boolean {
  return role === 'manager' || role === 'admin'
}

export function isStaff(role: Role): boolean {
  return role !== undefined
}
