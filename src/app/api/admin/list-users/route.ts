import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/client";

export async function GET() {
  const supabaseAdmin = createAdminClient();
  
  // Récupère tous les utilisateurs avec leurs données d'authentification
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Récupère les users publics avec leurs rôles
  const supabase = createClient();
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select(`
      *,
      roles(id, name)
    `);
  
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Fusionne les deux listes et ajoute les statistiques
  const merged = await Promise.all(
    authData.users.map(async (authUser) => {
      const publicUser = usersData.find((u) => u.id === authUser.id);
      
      // Récupérer les statistiques pour chaque utilisateur
      let userStats = { resources: 0, views: 0, likes: 0 };
      
      if (publicUser) {
        try {
          const [
            { count: resourcesCount },
            { count: viewsCount },
            { count: likesCount },
          ] = await Promise.all([
            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("owner_id", publicUser.id),
            supabase
              .from("views")
              .select("*", { count: "exact", head: true })
              .eq("user_id", publicUser.id),
            supabase
              .from("likes")
              .select("*", { count: "exact", head: true })
              .eq("user_id", publicUser.id),
          ]);

          userStats = {
            resources: resourcesCount || 0,
            views: viewsCount || 0,
            likes: likesCount || 0,
          };
        } catch (error) {
          console.error("Erreur lors du calcul des stats pour l'utilisateur", publicUser.id, error);
        }
      }

      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        banned_until: (authUser as { banned_until?: string }).banned_until || null,
        ban_duration: (authUser as { ban_duration?: string }).ban_duration || null,
        firstname: publicUser?.firstname || "",
        lastname: publicUser?.lastname || "",
        role_id: publicUser?.role_id || null,
        roles: publicUser?.roles || null,
        _count: userStats,
      };
    })
  );

  return NextResponse.json({ users: merged });
}
