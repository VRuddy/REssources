import { createClient } from '@/lib/supabase/server'

export async function getAuthUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
return data.user
}

export async function getUserWithRole() {
  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.getUser()
  if (error || !authData?.user) return null

  // Récupérer les informations du rôle depuis la table users
  const { data: userData } = await supabase
    .from('users')
    .select(`
      *,
      roles(id, name)
    `)
    .eq('id', authData.user.id)
    .single()

  return {
    ...authData.user,
    userProfile: userData,
    role: userData?.roles?.name || null
  }
}