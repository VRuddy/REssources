'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

function ErrorPageContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Désolé, quelque chose s&apos;est mal passé.</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error ? (
                  <p className="text-sm text-muted-foreground">Erreur : {error}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Une erreur non spécifiée s&apos;est produite.</p>
                )}
                <Link 
                  href="/auth/login"
                  className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  Retour à la connexion
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorPageContent />
    </Suspense>
  )
}
