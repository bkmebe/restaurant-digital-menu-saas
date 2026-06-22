export interface ServiceRequestFormData {
  table_id: string
  type: 'waiter' | 'bill' | 'other'
  notes?: string
}
