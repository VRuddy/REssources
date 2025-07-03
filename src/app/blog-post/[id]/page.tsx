import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlogPost } from "@/components/blog-post/BlogPost";
import { RealtimeChat } from "@/components/realtime-chat";
import { getAuthUser } from "@/app/helper/get-user";

export default async function BlogPostPage({params}: {params: Promise<{ id: string }>}) {
  const supabase = await createClient();
  const { id } = await params;
  
  // Récupère l'utilisateur connecté (auth)
  const user = await getAuthUser();
  
  // Requêtes parallèles pour optimiser les performances
  const [
    userDetailsResult,
    postResult,
    userRoleResult,
    commentsResult,
    likeResult
  ] = await Promise.all([
    // Détails utilisateur
    user?.id ? supabase
      .from("users")
      .select("id, firstname, lastname")
      .eq("id", user.id)
      .single() : Promise.resolve({ data: null }),
    
    // Post avec toutes les relations en une seule requête
    supabase
      .from("resources")
      .select(`
        id, 
        title, 
        content, 
        created_at, 
        is_verified, 
        is_public, 
        owner_id, 
        categories(name), 
        users(firstname, lastname)
      `)
      .eq("id", Number(id))
      .single(),
    
    // Rôle utilisateur
    user?.id ? supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single() : Promise.resolve({ data: null }),
    
    // Commentaires avec utilisateurs
    supabase
      .from("comments")
      .select("id, content, created_at, author_id, parent_comment_id, users(firstname, lastname)")
      .eq("resource_id", Number(id))
      .order("created_at", { ascending: true }),
    
    // Vérification des likes
    user?.id ? supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("resource_id", Number(id))
      .maybeSingle() : Promise.resolve({ data: null }),
    
    // Ajout de la vue (en arrière-plan, pas besoin du résultat)
    user?.id ? supabase
      .from("views")
      .upsert({
        user_id: user.id,
        resource_id: Number(id),
        viewed_at: new Date().toISOString(),
      }, { onConflict: "user_id,resource_id" }) : Promise.resolve({ data: null })
  ]);

  const post = postResult.data;
  if (!post) return notFound();

  const userDetails = userDetailsResult.data;
  const isModerator = userRoleResult.data?.role_id === 3;
  const comments = commentsResult.data || [];
  const liked = likeResult.data?.id ? true : false;

  // Optimisation : récupération des avatars en une seule fois
  const allUserIds = new Set<string>();
  if (user?.id) allUserIds.add(user.id);
  if (post.owner_id) allUserIds.add(post.owner_id);
  comments.forEach(c => {
    if (c.author_id) allUserIds.add(c.author_id);
  });

  // Récupération des avatars en une seule requête
  const avatarMap = new Map<string, string>();
  if (allUserIds.size > 0) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const supabaseAdmin = createAdminClient();
      
      // Récupération en parallèle pour tous les utilisateurs
      const avatarPromises = Array.from(allUserIds).map(async (userId) => {
        try {
          const { data: files } = await supabaseAdmin.storage
            .from('avatars')
            .list(userId);
          
          if (files && files.length > 0) {
            const fileName = files[0].name;
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('avatars')
              .getPublicUrl(`${userId}/${fileName}`);
            return { userId, avatarUrl: publicUrl };
          }
        } catch (error) {
          console.error(`Erreur avatar pour ${userId}:`, error);
        }
        return { userId, avatarUrl: undefined };
      });

      const avatarResults = await Promise.all(avatarPromises);
      avatarResults.forEach(({ userId, avatarUrl }) => {
        if (avatarUrl) avatarMap.set(userId, avatarUrl);
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des avatars:', error);
    }
  }

  // Mapping des commentaires avec avatars
  const flatMessages = comments.map((c) => ({
    id: Number(c.id),
    content: c.content,
    createdAt: c.created_at || '',
    parent_comment_id: c.parent_comment_id,
    user: { 
      name: c.users?.firstname || "Anonyme", 
      id: c.author_id,
      avatarUrl: c.author_id ? avatarMap.get(c.author_id) : undefined
    },
  }));

  return (
    <>
      <BlogPost
        title={post.title}
        summary={post.content?.slice(0, 120) || ""}
        content={post.content}
        author={{
          name: post.users?.firstname || "Anonyme",
          avatarUrl: post.owner_id ? avatarMap.get(post.owner_id) : undefined,
          role: "Auteur",
        }}
        date={post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}
        categories={post.categories?.name ? [post.categories.name] : []}
        liked={liked}
        userId={user?.id || null}
        resourceId={post.id}
        isVerified={post.is_verified}
        isModerator={isModerator}
        isPublic={post.is_public}
        ownerId={post.owner_id}
      />
      <div className="max-w-2xl mx-auto w-full mt-12">
        <h2 className="text-2xl font-bold mb-4 text-center">Commentaires</h2>
        <RealtimeChat
          roomName={`blog-post-${post.id}`}
          username={userDetails?.firstname || "Anonyme"}
          userId={userDetails?.id || ""}
          resourceId={post.id}
          avatarUrl={user?.id ? avatarMap.get(user.id) : undefined}
          messages={flatMessages}
          isModerator={isModerator}
        />
      </div>
    </>
  );
}
