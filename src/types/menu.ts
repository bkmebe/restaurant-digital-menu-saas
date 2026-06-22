import { MenuItem, Category } from './database'

export interface MenuWithCategories {
  categories: Category[]
  items: MenuItem[]
}

export interface MenuItemFormData {
  name: string
  name_am: string
  name_om: string
  description?: string
  description_am?: string
  description_om?: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
  is_featured: boolean
  sort_order: number
}

export interface CategoryFormData {
  name: string
  name_am: string
  name_om: string
  icon: string
  sort_order: number
  is_active: boolean
}
