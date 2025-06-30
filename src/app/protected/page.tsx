import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { getAuthUser } from '../helper/get-user'

export default async function ProtectedPage() {
  const user = await getAuthUser();
  console.log(user)
  if (!user) {
    // If the user is not authenticated, redirect to the login page
    redirect('/auth/login')
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
