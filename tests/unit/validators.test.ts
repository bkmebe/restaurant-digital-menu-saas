import { describe, it, expect } from 'vitest'

describe('Validators', () => {
  describe('loginSchema', () => {
    it('should accept email + password', async () => {
      const { loginSchema } = await import('@/lib/utils/validators')
      const result = loginSchema.safeParse({ email: 'user@test.com', password: 'password123' })
      expect(result.success).toBe(true)
    })

    it('should accept phone + password', async () => {
      const { loginSchema } = await import('@/lib/utils/validators')
      const result = loginSchema.safeParse({ phone: '+251911234567', password: 'password123' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', async () => {
      const { loginSchema } = await import('@/lib/utils/validators')
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid Ethiopian phone number', async () => {
      const { loginSchema } = await import('@/lib/utils/validators')
      const result = loginSchema.safeParse({ phone: '+255712345678', password: 'password123' })
      expect(result.success).toBe(false)
    })

    it('should reject short password', async () => {
      const { loginSchema } = await import('@/lib/utils/validators')
      const result = loginSchema.safeParse({ email: 'user@test.com', password: '12345' })
      expect(result.success).toBe(false)
    })
  })

  describe('menuItemSchema', () => {
    it('should accept valid menu item', async () => {
      const { menuItemSchema } = await import('@/lib/utils/validators')
      const result = menuItemSchema.safeParse({
        name: 'Doro Wat',
        name_am: 'ዶሮ ወጥ',
        name_om: 'Doro Waat',
        description: 'Spicy chicken stew',
        price: 250,
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        is_available: true,
        is_featured: false,
        sort_order: 1,
      })
      expect(result.success).toBe(true)
    })

    it('should reject negative price', async () => {
      const { menuItemSchema } = await import('@/lib/utils/validators')
      const result = menuItemSchema.safeParse({
        name: 'Test',
        name_am: 'ተስት',
        name_om: 'Test',
        price: -10,
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        is_available: true,
        is_featured: false,
        sort_order: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid category UUID', async () => {
      const { menuItemSchema } = await import('@/lib/utils/validators')
      const result = menuItemSchema.safeParse({
        name: 'Test',
        name_am: 'ተስት',
        name_om: 'Test',
        price: 100,
        category_id: 'not-a-uuid',
        is_available: true,
        is_featured: false,
        sort_order: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject image URLs from non-allowlisted domains', async () => {
      const { menuItemSchema } = await import('@/lib/utils/validators')
      const result = menuItemSchema.safeParse({
        name: 'Test',
        name_am: 'ተስት',
        name_om: 'Test',
        price: 100,
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        image_url: 'https://evil-site.com/malware.jpg',
        is_available: true,
        is_featured: false,
        sort_order: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid Supabase image URL', async () => {
      const { menuItemSchema } = await import('@/lib/utils/validators')
      const result = menuItemSchema.safeParse({
        name: 'Test',
        name_am: 'ተስት',
        name_om: 'Test',
        price: 100,
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        image_url: 'https://abc.supabase.co/storage/v1/object/public/menu-images/test.jpg',
        is_available: true,
        is_featured: false,
        sort_order: 0,
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty image URL (optional field)', async () => {
      const { menuItemSchema } = await import('@/lib/utils/validators')
      const result = menuItemSchema.safeParse({
        name: 'Test',
        name_am: 'ተስት',
        name_om: 'Test',
        price: 100,
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        is_available: true,
        is_featured: false,
        sort_order: 0,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('employeeSchema', () => {
    it('should accept valid employee', async () => {
      const { employeeSchema } = await import('@/lib/utils/validators')
      const result = employeeSchema.safeParse({
        full_name: 'Abebe Kebede',
        phone: '+251911234567',
        email: 'abebe@restaurant.com',
        role: 'waiter',
        national_id: 'AB123456',
        salary: 5000,
        hire_date: '2024-01-15',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid Ethiopian phone', async () => {
      const { employeeSchema } = await import('@/lib/utils/validators')
      const result = employeeSchema.safeParse({
        full_name: 'Test',
        phone: '+12025551234',
        email: 'test@test.com',
        role: 'waiter',
        national_id: 'XX123',
        salary: 5000,
        hire_date: '2024-01-15',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid role', async () => {
      const { employeeSchema } = await import('@/lib/utils/validators')
      const result = employeeSchema.safeParse({
        full_name: 'Test',
        phone: '+251911234567',
        email: 'test@test.com',
        role: 'ceo',
        national_id: 'XX123',
        salary: 5000,
        hire_date: '2024-01-15',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('payrollSchema', () => {
    it('should accept valid payroll entry', async () => {
      const { payrollSchema } = await import('@/lib/utils/validators')
      const result = payrollSchema.safeParse({
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        month: 3,
        year: 2024,
        salary: 8000,
        bonuses: 500,
        deductions: 200,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid month (0)', async () => {
      const { payrollSchema } = await import('@/lib/utils/validators')
      const result = payrollSchema.safeParse({
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        month: 0,
        year: 2024,
        salary: 8000,
        bonuses: 0,
        deductions: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid month (13)', async () => {
      const { payrollSchema } = await import('@/lib/utils/validators')
      const result = payrollSchema.safeParse({
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        month: 13,
        year: 2024,
        salary: 8000,
        bonuses: 0,
        deductions: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative salary', async () => {
      const { payrollSchema } = await import('@/lib/utils/validators')
      const result = payrollSchema.safeParse({
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        month: 3,
        year: 2024,
        salary: -100,
        bonuses: 0,
        deductions: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('tableSchema', () => {
    it('should accept valid table', async () => {
      const { tableSchema } = await import('@/lib/utils/validators')
      const result = tableSchema.safeParse({ table_number: 5, capacity: 4 })
      expect(result.success).toBe(true)
    })

    it('should reject zero table number', async () => {
      const { tableSchema } = await import('@/lib/utils/validators')
      const result = tableSchema.safeParse({ table_number: 0, capacity: 4 })
      expect(result.success).toBe(false)
    })

    it('should reject zero capacity', async () => {
      const { tableSchema } = await import('@/lib/utils/validators')
      const result = tableSchema.safeParse({ table_number: 1, capacity: 0 })
      expect(result.success).toBe(false)
    })
  })
})
