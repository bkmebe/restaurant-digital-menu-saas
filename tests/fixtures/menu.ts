export interface TestMenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  name_am: string
  name_om: string
  description: string
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  sort_order: number
}

export interface TestCategory {
  id: string
  restaurant_id: string
  name: string
  name_am: string
  name_om: string
  icon: string
  sort_order: number
  is_active: boolean
}

export const CATEGORIES: TestCategory[] = [
  { id: 'cat-001', restaurant_id: 'restaurant-a-uuid', name: 'Main Courses', name_am: 'ዋና ምግቦች', name_om: 'Nyaata Gurguddo', icon: '🍛', sort_order: 1, is_active: true },
  { id: 'cat-002', restaurant_id: 'restaurant-a-uuid', name: 'Drinks', name_am: 'መጠጦች', name_om: 'Dhugaatii', icon: '🥤', sort_order: 2, is_active: true },
  { id: 'cat-003', restaurant_id: 'restaurant-a-uuid', name: 'Desserts', name_am: 'ጣፋጮች', name_om: "Mi'a", icon: '🍰', sort_order: 3, is_active: false },
]

export const MENU_ITEMS: TestMenuItem[] = [
  { id: 'mi-001', restaurant_id: 'restaurant-a-uuid', category_id: 'cat-001', name: 'Doro Wat', name_am: 'ዶሮ ወጥ', name_om: 'Doro Waat', description: 'Spicy Ethiopian chicken stew', price: 350, image_url: 'https://abc.supabase.co/storage/v1/object/public/menu-images/doro-wat.jpg', is_available: true, is_featured: true, sort_order: 1 },
  { id: 'mi-002', restaurant_id: 'restaurant-a-uuid', category_id: 'cat-001', name: 'Kitfo', name_am: 'ክትፎ', name_om: 'Kitfo', description: 'Minced raw beef with spices', price: 450, image_url: null, is_available: true, is_featured: false, sort_order: 2 },
  { id: 'mi-003', restaurant_id: 'restaurant-a-uuid', category_id: 'cat-002', name: 'Ethiopian Coffee', name_am: 'ቡና', name_om: 'Buna', description: 'Traditional Ethiopian coffee', price: 50, image_url: null, is_available: true, is_featured: true, sort_order: 3 },
  { id: 'mi-004', restaurant_id: 'restaurant-a-uuid', category_id: 'cat-003', name: 'Tiramisu', name_am: 'ቲራሚሱ', name_om: 'Tiramisu', description: 'Italian coffee dessert', price: 180, image_url: 'https://images.unsplash.com/photo-tiramisu', is_available: false, is_featured: false, sort_order: 4 },
]

export function getRestaurantCategories(restaurantId: string): TestCategory[] {
  return CATEGORIES.filter(c => c.restaurant_id === restaurantId)
}

export function getRestaurantMenuItems(restaurantId: string): TestMenuItem[] {
  return MENU_ITEMS.filter(m => m.restaurant_id === restaurantId)
}

export function getAvailableItems(restaurantId: string): TestMenuItem[] {
  return MENU_ITEMS.filter(m => m.restaurant_id === restaurantId && m.is_available)
}
