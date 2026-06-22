import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Storage / File Upload Validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('validateImageFile', () => {
    it('should accept JPEG images', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should accept PNG images', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'photo.png', { type: 'image/png' })
      const result = validateImageFile(file)
      expect(result.valid).toBe(true)
    })

    it('should accept WebP images', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'photo.webp', { type: 'image/webp' })
      const result = validateImageFile(file)
      expect(result.valid).toBe(true)
    })

    it('should accept GIF images', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'animation.gif', { type: 'image/gif' })
      const result = validateImageFile(file)
      expect(result.valid).toBe(true)
    })

    it('should reject SVG files', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' })
      const result = validateImageFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid file type')
    })

    it('should reject PDF files', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      const result = validateImageFile(file)
      expect(result.valid).toBe(false)
    })

    it('should reject oversized files (>5MB)', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const oversized = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(oversized)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('should accept files at exactly 5MB', async () => {
      const { validateImageFile } = await import('@/lib/supabase/storage')
      const exact = new File([new ArrayBuffer(5 * 1024 * 1024)], 'exact.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(exact)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateImageUrl', () => {
    it('should accept valid Supabase Storage URLs', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('https://abc.supabase.co/storage/v1/object/public/menu-images/test.jpg')).toBe(true)
    })

    it('should accept Unsplash URLs', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('https://images.unsplash.com/photo-123456789')).toBe(true)
    })

    it('should accept QR server URLs', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200')).toBe(true)
    })

    it('should reject HTTP URLs', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('http://evil.com/virus.jpg')).toBe(false)
    })

    it('should reject arbitrary external URLs', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('https://malicious-site.com/image.jpg')).toBe(false)
    })

    it('should reject data URIs', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(false)
    })

    it('should accept empty URL (optional field)', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('')).toBe(true)
    })

    it('should reject invalid URLs', async () => {
      const { validateImageUrl } = await import('@/lib/supabase/storage')
      expect(validateImageUrl('not-a-url')).toBe(false)
    })
  })

  describe('uploadMenuImage', () => {
    it('should upload valid file and return public URL', async () => {
      const { uploadMenuImage } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      const result = await uploadMenuImage(file, 'restaurant-1')
      expect(result.url).toBeTruthy()
      expect(result.url).toContain('supabase.co')
      expect(result.error).toBeNull()
    })

    it('should reject invalid file before calling Supabase', async () => {
      const { uploadMenuImage } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' })

      const result = await uploadMenuImage(file, 'restaurant-1')
      expect(result.url).toBeNull()
      expect(result.error).toContain('Invalid file type')
    })

    it('should handle Supabase upload errors', async () => {
      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      const client = await createServerSupabaseClient()
      const uploadFn = client.storage.from('menu-images').upload
      uploadFn.mockResolvedValueOnce({ data: null, error: { message: 'Bucket not found' } })

      const { uploadMenuImage } = await import('@/lib/supabase/storage')
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await uploadMenuImage(file, 'restaurant-1')
      expect(result.url).toBeNull()
      expect(result.error).toBe('Bucket not found')
    })
  })

  describe('deleteMenuImage', () => {
    it('should delete image from storage', async () => {
      const { deleteMenuImage } = await import('@/lib/supabase/storage')
      const result = await deleteMenuImage('https://abc.supabase.co/storage/v1/object/public/menu-images/test/image.jpg')
      expect(result).toBeNull()
    })
  })
})
