import { describe, it, expect } from 'vitest'
import { hasPermission, isAdmin, isManager, isStaff, ROLE_HIERARCHY } from '@/lib/utils/permissions'
import type { Role } from '@/types/common'

describe('Permissions', () => {
  describe('hasPermission', () => {
    it('should allow admin to do everything', () => {
      expect(hasPermission('admin', 'admin')).toBe(true)
      expect(hasPermission('admin', 'manager')).toBe(true)
      expect(hasPermission('admin', 'cashier')).toBe(true)
      expect(hasPermission('admin', 'waiter')).toBe(true)
    })

    it('should allow manager to access manager and below', () => {
      expect(hasPermission('manager', 'manager')).toBe(true)
      expect(hasPermission('manager', 'cashier')).toBe(true)
      expect(hasPermission('manager', 'waiter')).toBe(true)
    })

    it('should block manager from admin routes', () => {
      expect(hasPermission('manager', 'admin')).toBe(false)
    })

    it('should allow cashier to access cashier and waiter', () => {
      expect(hasPermission('cashier', 'cashier')).toBe(true)
      expect(hasPermission('cashier', 'waiter')).toBe(true)
    })

    it('should block cashier from manager and admin', () => {
      expect(hasPermission('cashier', 'manager')).toBe(false)
      expect(hasPermission('cashier', 'admin')).toBe(false)
    })

    it('should allow waiter to access waiter only', () => {
      expect(hasPermission('waiter', 'waiter')).toBe(true)
    })

    it('should block waiter from all higher roles', () => {
      expect(hasPermission('waiter', 'cashier')).toBe(false)
      expect(hasPermission('waiter', 'manager')).toBe(false)
      expect(hasPermission('waiter', 'admin')).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin', () => {
      expect(isAdmin('admin')).toBe(true)
    })

    it('should return false for non-admin roles', () => {
      expect(isAdmin('manager')).toBe(false)
      expect(isAdmin('cashier')).toBe(false)
      expect(isAdmin('waiter')).toBe(false)
    })
  })

  describe('isManager', () => {
    it('should return true for manager', () => {
      expect(isManager('manager')).toBe(true)
    })

    it('should return true for admin', () => {
      expect(isManager('admin')).toBe(true)
    })

    it('should return false for cashier', () => {
      expect(isManager('cashier')).toBe(false)
    })

    it('should return false for waiter', () => {
      expect(isManager('waiter')).toBe(false)
    })
  })

  describe('isStaff', () => {
    it('should return true for any defined role', () => {
      const roles: Role[] = ['admin', 'manager', 'cashier', 'waiter']
      roles.forEach(role => {
        expect(isStaff(role)).toBe(true)
      })
    })
  })

  describe('ROLE_HIERARCHY values', () => {
    it('should maintain correct ordering', () => {
      expect(ROLE_HIERARCHY.waiter).toBeLessThan(ROLE_HIERARCHY.cashier)
      expect(ROLE_HIERARCHY.cashier).toBeLessThan(ROLE_HIERARCHY.manager)
      expect(ROLE_HIERARCHY.manager).toBeLessThan(ROLE_HIERARCHY.admin)
    })
  })
})
