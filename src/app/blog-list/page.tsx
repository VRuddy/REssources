"use client";
import { useEffect, useState } from "react";
import { BlogList, BlogPost } from "@/components/blog-list/BlogList";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddOrEditResourceForm } from "@/components/blog-list/AddOrEditResourceForm";

// Fonction pour récupérer les avatars des auteurs côté client
const getAuthorsAvatars = async (ownerIds: string[]) => {
  const supabase = createClient();
  const avatarMap = new Map<string, string>();
  
  for (const ownerId of ownerIds) {
    try {
      // Vérifier si l'utilisateur a un avatar dans le bucket
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(ownerId);
      
      if (files && files.length > 0) {
        // Prendre le premier fichier (le plus récent)
        const fileName = files[0].name;
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`${ownerId}/${fileName}`);
        avatarMap.set(ownerId, publicUrl);
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'avatar pour l'auteur ${ownerId}:`, error);
    }
  }
  
  return avatarMap;
};

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<{id: number, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [readLaterIds, setReadLaterIds] = useState<string[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Déplace fetchData hors du useEffect pour pouvoir l'utiliser ailleurs
  const fetchData = async () => {
    const supabase = createClient();
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    setUserId(user?.id || null);
    let roleId: number | null = null;
    if (user?.id) {
      // Get user role
      const { data: userInfo } = await supabase
        .from("users")
        .select("role_id")
        .eq("id", user.id)
        .single();
      roleId = userInfo?.role_id ?? null;
      setUserRoleId(roleId);
    }
    // Récupère les catégories
    const { data: catData } = await supabase.from("categories").select("id, name");
    setCategories(catData?.map((c) => c.name) || []);
    setCategoriesList(catData || []);
    // Récupère les ressources avec leur catégorie, le display_name du créateur, is_public et is_verified
    const query = supabase
      .from("resources")
      .select("id, title, content, created_at, owner_id, category_id, is_public, is_verified, categories(name), users(firstname, lastname)")
      .order("created_at", { ascending: false });

    const { data: resources } = await query;
    
    // Récupère les avatars des auteurs
    const ownerIds = [...new Set((resources || []).map(r => r.owner_id).filter((id): id is string => id !== null))];
    const avatarMap = await getAuthorsAvatars(ownerIds);
    
    // Mapping pour BlogList
    const mapped = (resources || []).map((r) => ({
      id: r.id.toString(),
      category: r.categories?.name || "Ressource",
      title: r.title,
      summary: r.content?.slice(0, 120) || "",
      author: r.users?.firstname || "Anonyme",
      authorAvatarUrl: r.owner_id ? avatarMap.get(r.owner_id) : undefined,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      url: `/blog-post/${r.id}`,
      is_public: r.is_public,
      is_verified: r.is_verified,
    }));
    setPosts(mapped);
    // Get read_later ids for current user
    if (user?.id) {
      const { data: readLater } = await supabase
        .from("read_later")
        .select("resource_id")
        .eq("user_id", user.id);
      setReadLaterIds(readLater?.map((r) => r.resource_id.toString()) || []);
      // Get viewed ids for current user
      const { data: views } = await supabase
        .from("views")
        .select("resource_id")
        .eq("user_id", user.id);
      setViewedIds(views?.map((v) => v.resource_id.toString()) || []);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add or remove a post from read_later
  const toggleReadLater = async (postId: string) => {
    if (!userId) return;
    const supabase = createClient();
    if (readLaterIds.includes(postId)) {
      // Remove
      await supabase
        .from("read_later")
        .delete()
        .eq("user_id", userId)
        .eq("resource_id", Number(postId));
      setReadLaterIds((ids) => ids.filter((id) => id !== postId));
    } else {
      // Add
      await supabase
        .from("read_later")
        .insert({ user_id: userId, resource_id: Number(postId) });
      setReadLaterIds((ids) => [...ids, postId]);
    }
  };

  // Filtrage côté client
  const filteredPosts = selectedCategory
    ? posts.filter((p) => p.category === selectedCategory)
    : posts;

  // Ajout d'une ressource
  const handleAddResource = async (values: { title: string; content: string; isPublic: boolean; categoryId: number | null; }) => {
    if (!userId) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("resources").insert({
      title: values.title,
      content: values.content,
      is_public: values.isPublic,
      owner_id: userId,
      is_verified: false,
      category_id: values.categoryId,
    });
    setLoading(false);
    if (!error) {
      setOpen(false);
      // Rafraîchir la page ou rappeler fetchData
      fetchData();
    }
  };

  return (
    <>
        <Button onClick={() => setOpen(true)}>
          + Ajouter une ressource
        </Button>
      <BlogList
        posts={filteredPosts}
        categories={categories}
        onCategoryClick={setSelectedCategory}
        selectedCategory={selectedCategory}
        readLaterIds={readLaterIds}
        onToggleReadLater={toggleReadLater}
        viewedIds={viewedIds}
        isModerator={userRoleId === 3}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ajouter une ressource</DialogTitle>
          </DialogHeader>
          <AddOrEditResourceForm
            categories={categoriesList}
            loading={loading}
            onSubmit={handleAddResource}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
