import { describe, it, expect } from 'vitest'
import { hasPermission, isAdmin, isManager, isStaff, isOwner, isSystemAdmin, isInventoryManager, ROLE_HIERARCHY, enforceReadOnly, canViewSystemData, canViewBusinessData } from '@/lib/utils/permissions'
import type { Role } from '@/types/common'

describe('Permissions', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should maintain correct ordering', () => {
      expect(ROLE_HIERARCHY.kitchen_staff).toBeLessThan(ROLE_HIERARCHY.waiter)
      expect(ROLE_HIERARCHY.waiter).toBeLessThan(ROLE_HIERARCHY.cashier)
      expect(ROLE_HIERARCHY.cashier).toBeLessThan(ROLE_HIERARCHY.admin)
      expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.manager)
      expect(ROLE_HIERARCHY.manager).toBeLessThan(ROLE_HIERARCHY.inventory_manager)
      expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.owner)
      expect(ROLE_HIERARCHY.owner).toBeLessThan(ROLE_HIERARCHY.system_admin)
    })
  })

  describe('hasPermission', () => {
    it('should allow admin to access admin and below', () => {
      expect(hasPermission('admin', 'admin')).toBe(true)
      expect(hasPermission('admin', 'cashier')).toBe(true)
      expect(hasPermission('admin', 'waiter')).toBe(true)
    })

    it('should block admin from manager routes', () => {
      expect(hasPermission('admin', 'manager')).toBe(false)
    })

    it('should allow manager to access manager and below', () => {
      expect(hasPermission('manager', 'manager')).toBe(true)
      expect(hasPermission('manager', 'admin')).toBe(true)
      expect(hasPermission('manager', 'cashier')).toBe(true)
      expect(hasPermission('manager', 'waiter')).toBe(true)
    })

    it('should block manager from inventory_manager routes', () => {
      expect(hasPermission('manager', 'inventory_manager')).toBe(false)
    })

    it('should allow inventory_manager to access inventory_manager and below', () => {
      expect(hasPermission('inventory_manager', 'inventory_manager')).toBe(true)
      expect(hasPermission('inventory_manager', 'manager')).toBe(true)
      expect(hasPermission('inventory_manager', 'cashier')).toBe(true)
      expect(hasPermission('inventory_manager', 'waiter')).toBe(true)
    })

    it('should allow inventory_manager to access admin routes', () => {
      expect(hasPermission('inventory_manager', 'admin')).toBe(true)
    })

    it('should allow cashier to access cashier and waiter', () => {
      expect(hasPermission('cashier', 'cashier')).toBe(true)
      expect(hasPermission('cashier', 'waiter')).toBe(true)
    })

    it('should block cashier from manager and above', () => {
      expect(hasPermission('cashier', 'manager')).toBe(false)
      expect(hasPermission('cashier', 'inventory_manager')).toBe(false)
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

    it('should allow owner to access all including admin', () => {
      expect(hasPermission('owner', 'admin')).toBe(true)
      expect(hasPermission('owner', 'inventory_manager')).toBe(true)
      expect(hasPermission('owner', 'manager')).toBe(true)
    })

    it('should allow system_admin to access everything', () => {
      expect(hasPermission('system_admin', 'system_admin')).toBe(true)
      expect(hasPermission('system_admin', 'owner')).toBe(true)
      expect(hasPermission('system_admin', 'admin')).toBe(true)
      expect(hasPermission('system_admin', 'inventory_manager')).toBe(true)
      expect(hasPermission('system_admin', 'manager')).toBe(true)
    })

    it('should block kitchen_staff from accessing waiter and above', () => {
      expect(hasPermission('kitchen_staff', 'kitchen_staff')).toBe(true)
      expect(hasPermission('kitchen_staff', 'waiter')).toBe(false)
      expect(hasPermission('kitchen_staff', 'cashier')).toBe(false)
    })
  })

  describe('isSystemAdmin', () => {
    it('should return true for system_admin', () => {
      expect(isSystemAdmin('system_admin')).toBe(true)
    })

    it('should return false for non-system_admin roles', () => {
      expect(isSystemAdmin('admin')).toBe(false)
      expect(isSystemAdmin('owner')).toBe(false)
      expect(isSystemAdmin('manager')).toBe(false)
      expect(isSystemAdmin('cashier')).toBe(false)
      expect(isSystemAdmin('waiter')).toBe(false)
    })
  })

  describe('isOwner', () => {
    it('should return true for owner', () => {
      expect(isOwner('owner')).toBe(true)
    })

    it('should return false for non-owner roles', () => {
      expect(isOwner('admin')).toBe(false)
      expect(isOwner('system_admin')).toBe(false)
    })
  })

  describe('isInventoryManager', () => {
    it('should return true for inventory_manager', () => {
      expect(isInventoryManager('inventory_manager')).toBe(true)
    })

    it('should return false for non-inventory_manager roles', () => {
      expect(isInventoryManager('manager')).toBe(false)
      expect(isInventoryManager('admin')).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin', () => {
      expect(isAdmin('admin')).toBe(true)
    })

    it('should return false for non-admin roles', () => {
      expect(isAdmin('owner')).toBe(false)
      expect(isAdmin('system_admin')).toBe(false)
      expect(isAdmin('inventory_manager')).toBe(false)
      expect(isAdmin('manager')).toBe(false)
      expect(isAdmin('cashier')).toBe(false)
      expect(isAdmin('waiter')).toBe(false)
    })
  })

  describe('isManager', () => {
    it('should return true for manager', () => {
      expect(isManager('manager')).toBe(true)
    })

    it('should return false for admin', () => {
      expect(isManager('admin')).toBe(false)
    })

    it('should return false for inventory_manager', () => {
      expect(isManager('inventory_manager')).toBe(false)
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
      const roles: Role[] = ['admin', 'manager', 'cashier', 'waiter', 'kitchen_staff', 'inventory_manager', 'owner', 'system_admin']
      roles.forEach(role => {
        expect(isStaff(role)).toBe(true)
      })
    })
  })

  describe('enforceReadOnly', () => {
    it('should return true for owner', () => {
      expect(enforceReadOnly('owner')).toBe(true)
    })

    it('should return false for non-owner roles', () => {
      expect(enforceReadOnly('system_admin')).toBe(false)
      expect(enforceReadOnly('admin')).toBe(false)
      expect(enforceReadOnly('inventory_manager')).toBe(false)
      expect(enforceReadOnly('manager')).toBe(false)
      expect(enforceReadOnly('cashier')).toBe(false)
      expect(enforceReadOnly('waiter')).toBe(false)
      expect(enforceReadOnly('kitchen_staff')).toBe(false)
    })
  })

  describe('canViewSystemData', () => {
    it('should return true for system_admin', () => {
      expect(canViewSystemData('system_admin')).toBe(true)
    })

    it('should return false for all other roles', () => {
      const nonSystemRoles: Role[] = ['owner', 'admin', 'inventory_manager', 'manager', 'cashier', 'waiter', 'kitchen_staff']
      nonSystemRoles.forEach(role => {
        expect(canViewSystemData(role)).toBe(false)
      })
    })
  })

  describe('canViewBusinessData', () => {
    it('should return true for owner, admin, inventory_manager, manager', () => {
      expect(canViewBusinessData('owner')).toBe(true)
      expect(canViewBusinessData('admin')).toBe(true)
      expect(canViewBusinessData('inventory_manager')).toBe(true)
      expect(canViewBusinessData('manager')).toBe(true)
    })

    it('should return false for cashier, waiter, kitchen_staff, system_admin', () => {
      expect(canViewBusinessData('cashier')).toBe(false)
      expect(canViewBusinessData('waiter')).toBe(false)
      expect(canViewBusinessData('kitchen_staff')).toBe(false)
      expect(canViewBusinessData('system_admin')).toBe(false)
    })
  })
})
