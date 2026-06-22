import { createServerSupabaseClient } from '@/lib/supabase/server'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const BUCKET_NAME = 'menu-images'

export interface UploadResult {
  url: string | null
  error: string | null
}

export interface ValidationResult {
  valid: boolean
  error: string | null
}

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` }
  }

  return { valid: true, error: null }
}

export function validateImageUrl(url: string): boolean {
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
}

export async function uploadMenuImage(file: File, restaurantId: string): Promise<UploadResult> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { url: null, error: validation.error }
  }

  const supabase = await createServerSupabaseClient()
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${restaurantId}/${crypto.randomUUID()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) {
    return { url: null, error: error.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return { url: publicUrl, error: null }
}

export async function deleteMenuImage(url: string): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const path = url.split('/').pop()
    if (!path) return 'Invalid URL'

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    return error?.message || null
  } catch {
    return 'Failed to delete image'
  }
}
