import type { Role } from '@/types/common'

export interface TestUser {
  id: string
  email: string
  role: Role
  restaurantId: string
  password: string
}

export interface TestProfile {
  id: string
  role: Role
  restaurant_id: string
}

export const ADMIN_USER: TestUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@restaurant-a.com',
  role: 'admin',
  restaurantId: 'restaurant-a-uuid',
  password: 'admin-password-123',
}

export const MANAGER_USER: TestUser = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'manager@restaurant-a.com',
  role: 'manager',
  restaurantId: 'restaurant-a-uuid',
  password: 'manager-password-123',
}

export const CASHIER_USER: TestUser = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'cashier@restaurant-a.com',
  role: 'cashier',
  restaurantId: 'restaurant-a-uuid',
  password: 'cashier-password-123',
}

export const WAITER_USER: TestUser = {
  id: '00000000-0000-0000-0000-000000000004',
  email: 'waiter@restaurant-a.com',
  role: 'waiter',
  restaurantId: 'restaurant-a-uuid',
  password: 'waiter-password-123',
}

export const CROSS_TENANT_USER: TestUser = {
  id: '00000000-0000-0000-0000-000000000005',
  email: 'admin@restaurant-b.com',
  role: 'admin',
  restaurantId: 'restaurant-b-uuid',
  password: 'cross-tenant-password',
}

export const ALL_USERS: TestUser[] = [
  ADMIN_USER,
  MANAGER_USER,
  CASHIER_USER,
  WAITER_USER,
  CROSS_TENANT_USER,
]

export function getProfile(user: TestUser): TestProfile {
  return {
    id: user.id,
    role: user.role,
    restaurant_id: user.restaurantId,
  }
}

export function getUsersByRole(role: Role): TestUser[] {
  return ALL_USERS.filter(u => u.role === role)
}
