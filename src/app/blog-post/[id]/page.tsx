import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlogPost } from "@/components/blog-post/BlogPost";
import { RealtimeChat } from "@/components/realtime-chat";
import { getAuthUser } from "@/app/helper/get-user";

export default async function BlogPostPage({params}: {params: Promise<{ id: string }>}) {
  const supabase = await createClient();
  const user = await getAuthUser();
  const { id } = await params;
  // Récupère la ressource avec la catégorie et l'auteur
  const { data: userDetails } = await supabase
    .from("users")
    .select("id, firstname, lastname")
    .eq("id", user?.id || "")
    .single();
  const { data: post } = await supabase
    .from("resources")
    .select("id, title, content, created_at, categories(name), users(firstname, lastname)")
    .eq("id", Number(id))
    .single();

  if (!post) return notFound();

  // Récupère les commentaires pour ce post
  const { data: comments } = await supabase
    .from("comments")
    .select("id, content, created_at, author_id, parent_comment_id, users(firstname, lastname)")
    .eq("resource_id", Number(id))
    .order("created_at", { ascending: true });

  // On mappe les commentaires pour inclure parent_comment_id et user
  const flatMessages = (comments || []).map((c) => ({
    id: Number(c.id),
    content: c.content,
    createdAt: c.created_at || '',
    parent_comment_id: c.parent_comment_id,
    user: { name: c.users?.firstname || "Anonyme", id: c.author_id },
  }));

  // Passe la liste plate à RealtimeChat (PAS d'appel à buildThread ici)

  // Ajoute ou met à jour la date de vue pour garder l'historique du dernier passage
  if (user?.id && post?.id) {
    await supabase.from("views").upsert({
      user_id: user.id,
      resource_id: post.id,
      viewed_at: new Date().toISOString(),
    }, { onConflict: "user_id,resource_id" });
  }

  // Vérifie si le post est aimé par l'utilisateur
  const { data: likeData } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user?.id || "")
    .eq("resource_id", post.id)
    .maybeSingle();
  const liked = likeData?.id ? true : false;

  return (
    <>
      <BlogPost
        title={post.title}
        summary={post.content?.slice(0, 120) || ""}
        content={post.content}
        author={{
          name: post.users?.firstname || "Anonyme",
          // avatarUrl: post.users?.avatar_url, // décommente si tu as ce champ
          role: "Auteur",
        }}
        date={post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}
        categories={post.categories?.name ? [post.categories.name] : []}
        liked={liked}
        userId={user?.id || null}
        resourceId={post.id}
      />
      <div className="max-w-2xl mx-auto w-full mt-12">
        <h2 className="text-2xl font-bold mb-4 text-center">Commentaires</h2>
        <RealtimeChat
          roomName={`blog-post-${post.id}`}
          username={userDetails?.firstname || "Anonyme"}
          userId={userDetails?.id || ""}
          resourceId={post.id}
          messages={flatMessages}
        />
      </div>
    </>
  );
}
