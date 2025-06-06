'use client'

import { Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import { type EmailOtpType } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function ConfirmPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const confirmUser = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') as EmailOtpType | null
      const next = searchParams.get('next') || '/protected'

      if (!token_hash || !type) {
        setStatus('error')
        setErrorMessage('Token ou type manquant')
        return
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash,
        })

        if (error) {
          setStatus('error')
          setErrorMessage(error.message)
        } else {
          setStatus('success')
          // Redirection après un court délai
          setTimeout(() => {
            router.push(next.startsWith('/') ? next : '/protected')
          }, 2000)
        }
      } catch (err) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Une erreur est survenue lors de la confirmation')
      }
    }

    confirmUser()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Confirmation en cours...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Confirmation réussie !</h1>
          <p className="text-gray-600">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-red-600 text-6xl mb-4">✗</div>
        <h1 className="text-2xl font-bold text-red-600 mb-2">Erreur de confirmation</h1>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <button
          onClick={() => router.push('/auth/login')}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmPageContent />
    </Suspense>
  )
} 