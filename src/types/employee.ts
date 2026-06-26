export interface EmployeeFormData {
  full_name: string
  phone: string
  email: string
  password?: string
  role: 'waiter' | 'cashier' | 'manager' | 'kitchen_staff' | 'inventory_manager' | 'owner' | 'admin'
  national_id: string
  fayda_number?: string
  salary: number
  hire_date: string
}

export interface PayrollFormData {
  employee_id: string
  month: number
  year: number
  salary: number
  bonuses: number
  deductions: number
}

export interface PayrollSummary {
  total_salary: number
  total_bonuses: number
  total_deductions: number
  total_net_pay: number
  employee_count: number
  paid_count: number
  pending_count: number
}
