import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  phone: z.string().regex(/^\+251\d{9}$/, 'Invalid Ethiopian phone number').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_am: z.string().min(1, 'Amharic name is required'),
  name_om: z.string().min(1, 'Oromo name is required'),
  description: z.string().default(''),
  description_am: z.string().default(''),
  description_om: z.string().default(''),
  price: z.number().positive('Price must be positive'),
  category_id: z.string().uuid('Invalid category'),
  image_url: z.string().refine((url) => {
    if (!url) return true
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' && (
        parsed.hostname.endsWith('.supabase.co') ||
        parsed.hostname === 'images.unsplash.com' ||
        parsed.hostname === 'api.qrserver.com'
      )
    } catch {
      return false
    }
  }, 'Image URL must be a valid HTTPS URL from a trusted source').default(''),
  is_available: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.number().int().min(0),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_am: z.string().min(1, 'Amharic name is required'),
  name_om: z.string().min(1, 'Oromo name is required'),
  icon: z.string(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
})

export const employeeSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\+251\d{9}$/, 'Invalid Ethiopian phone number'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['waiter', 'cashier', 'manager', 'kitchen_staff', 'inventory_manager', 'owner', 'admin']),
  national_id: z.string(),
  fayda_number: z.string().optional(),
  salary: z.number().positive('Salary must be positive'),
  hire_date: z.string().min(1, 'Hire date is required'),
})

export const tableSchema = z.object({
  table_number: z.number().int().positive('Table number must be positive'),
  capacity: z.number().int().positive('Capacity must be positive'),
  assigned_waiter_id: z.string().uuid().optional(),
})

export const paymentConfigSchema = z.object({
  provider: z.enum(['telebirr', 'cbe_birr', 'bank', 'qr']),
  label: z.string().min(1, 'Label is required'),
  account_name: z.string().min(1, 'Account name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  qr_image_url: z.string().optional(),
  payment_link: z.string().optional(),
  bank_name: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
})

export const serviceRequestSchema = z.object({
  table_id: z.string().uuid(),
  type: z.enum(['waiter', 'bill', 'other']),
  notes: z.string().optional(),
})

export const payrollSchema = z.object({
  employee_id: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  salary: z.number().positive(),
  bonuses: z.number().min(0),
  deductions: z.number().min(0),
})
