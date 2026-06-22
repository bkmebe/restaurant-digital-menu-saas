'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ImageUploadProps {
  bucket?: string
  path?: string
  onUpload: (url: string) => void
  currentImage?: string
}

export function ImageUpload({ bucket = 'menu-images', path = '', onUpload, currentImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${path}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file)
    if (error) {
      console.error('Upload error:', error)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
    setPreview(publicUrl)
    onUpload(publicUrl)
    setUploading(false)
  }

  const removeImage = () => {
    setPreview(null)
    onUpload('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {preview ? (
          <div className="relative w-24 h-24 rounded-md overflow-hidden border">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button onClick={removeImage} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
            <Upload className="h-6 w-6" />
          </div>
        )}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>
      </div>
    </div>
  )
}
