import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlogPost } from "@/components/blog-post/BlogPost";
import { RealtimeChat } from "@/components/realtime-chat";
import { getAuthUser } from "@/app/helper/get-user";

export default async function BlogPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const user = await getAuthUser();
  // Récupère la ressource avec la catégorie et l'auteur
  const { data: post } = await supabase
    .from("resources")
    .select("id, title, content, created_at, categories(name), users(display_name)")
    .eq("id", Number(params.id))
    .single();

  if (!post) return notFound();

  // Récupère les commentaires pour ce post
  const { data: comments } = await supabase
    .from("comments")
    .select("id, content, created_at, author_id, parent_comment_id, users(display_name)")
    .eq("resource_id", Number(params.id))
    .order("created_at", { ascending: true });

  // On mappe les commentaires pour inclure parent_comment_id et user
  const flatMessages = (comments || []).map((c) => ({
    id: Number(c.id),
    content: c.content,
    createdAt: c.created_at || '',
    parent_comment_id: c.parent_comment_id,
    user: { name: c.users?.display_name || "Anonyme", id: c.author_id },
  }));

  // Passe la liste plate à RealtimeChat (PAS d'appel à buildThread ici)

  return (
    <>
      <BlogPost
        title={post.title}
        summary={post.content?.slice(0, 120) || ""}
        content={post.content}
        author={{
          name: post.users?.display_name || "Anonyme",
          // avatarUrl: post.users?.avatar_url, // décommente si tu as ce champ
          role: "Auteur",
        }}
        date={post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}
        categories={post.categories?.name ? [post.categories.name] : []}
      />
      <div className="max-w-2xl mx-auto w-full mt-12">
        <h2 className="text-2xl font-bold mb-4 text-center">Commentaires</h2>
        <RealtimeChat
          roomName={`blog-post-${post.id}`}
          username={user?.user_metadata?.display_name || post.users?.display_name || "Anonyme"}
          userId={user?.id || ""}
          resourceId={post.id}
          messages={flatMessages}
        />
      </div>
    </>
  );
}
