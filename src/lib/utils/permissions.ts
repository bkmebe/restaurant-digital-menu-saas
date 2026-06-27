import { Role } from '@/types/common'

export const ROLE_HIERARCHY: Record<Role, number> = {
  kitchen_staff: 1,
  waiter: 2,
  cashier: 3,
  admin: 4,
  manager: 5,
  inventory_manager: 6,
  owner: 7,
  system_admin: 8,
}

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function isSystemAdmin(role: Role): boolean {
  return role === 'system_admin'
}

export function isOwner(role: Role): boolean {
  return role === 'owner'
}

export function isOwnerOrAbove(role: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['owner']
}

export function isInventoryManager(role: Role): boolean {
  return role === 'inventory_manager'
}

export function isAdmin(role: Role): boolean {
  return role === 'admin'
}

export function isManager(role: Role): boolean {
  return role === 'manager'
}

export function isStaff(role: Role): boolean {
  return role !== undefined
}

export function enforceReadOnly(role: Role): boolean {
  return role === 'owner'
}

export function canViewSystemData(role: Role): boolean {
  return role === 'system_admin'
}

export function canViewBusinessData(role: Role): boolean {
  return ['owner', 'admin', 'inventory_manager', 'manager'].includes(role)
}
