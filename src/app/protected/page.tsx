'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function ProtectedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    getUser()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/auth/login')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-svh w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Redirection en cours
  }

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{user.email}</span>
      </p>
      <LogoutButton />
    </div>
  )
}
