'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { Role } from '@/types/common'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 5000)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      clearTimeout(timeout)
      setUser(user)
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => {
            if (!cancelled) setProfile(data as Profile)
          })
      }
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => setProfile(data as Profile))
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const loginWithPhone = async (phone: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: `${phone}@placeholder.com`, password })
    if (error) throw error
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return { user, profile, loading, login, loginWithPhone, logout }
}

export function useRole() {
  const { profile, loading } = useAuth()
  return { role: profile?.role as Role | undefined, loading }
}

export function useRequireAuth(requiredRole?: Role) {
  const { user, profile, loading } = useAuth()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setAuthorized(false)
      } else if (requiredRole && profile) {
        const hierarchy: Record<string, number> = { admin: 4, manager: 3, cashier: 2, waiter: 1 }
        const userRole = profile.role as string
        setAuthorized((hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0))
      } else {
        setAuthorized(!!user)
      }
    }
  }, [user, profile, loading, requiredRole])

  return { user, profile, loading, authorized }
}
