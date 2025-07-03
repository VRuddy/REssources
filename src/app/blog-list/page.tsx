"use client";
import { useEffect, useState, Suspense } from "react";
import { BlogList, BlogPost } from "@/components/blog-list/BlogList";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddOrEditResourceForm } from "@/components/blog-list/AddOrEditResourceForm";
import { useSearchParams } from "next/navigation";

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

// Composant principal qui utilise useSearchParams
function BlogListPageContent() {
  const searchParams = useSearchParams();
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
  const [editingResource, setEditingResource] = useState<{
    id: number;
    title: string;
    content: string;
    isPublic: boolean;
    categoryId: number | null;
  } | null>(null);

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

  // Vérifier si on est en mode édition
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && userId) {
      const fetchResourceToEdit = async () => {
        const supabase = createClient();
        const { data: resource } = await supabase
          .from("resources")
          .select("id, title, content, is_public, category_id, owner_id")
          .eq("id", Number(editId))
          .eq("owner_id", userId) // Vérifier que l'utilisateur est bien le propriétaire
          .single();
        
        if (resource) {
          setEditingResource({
            id: resource.id,
            title: resource.title,
            content: resource.content || "",
            isPublic: resource.is_public,
            categoryId: resource.category_id,
          });
          setOpen(true);
        }
      };
      
      fetchResourceToEdit();
    }
  }, [searchParams, userId]);

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

  // Ajout ou modification d'une ressource
  const handleAddResource = async (values: { title: string; content: string; isPublic: boolean; categoryId: number | null; }) => {
    if (!userId) return;
    setLoading(true);
    const supabase = createClient();
    
    if (editingResource) {
      // Mode édition - mise à jour
      const { error } = await supabase
        .from("resources")
        .update({
          title: values.title,
          content: values.content,
          is_public: values.isPublic,
          category_id: values.categoryId,
          is_verified: false, // Remettre à false comme demandé
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingResource.id)
        .eq("owner_id", userId); // Sécurité supplémentaire
      
      if (!error) {
        setOpen(false);
        setEditingResource(null);
        await fetchData(); // Recharger les données
      }
    } else {
      // Mode ajout - création
      const { error } = await supabase
        .from("resources")
        .insert({
          title: values.title,
          content: values.content,
          is_public: values.isPublic,
          category_id: values.categoryId,
          owner_id: userId,
          is_verified: false,
        });
      
      if (!error) {
        setOpen(false);
        await fetchData(); // Recharger les données
      }
    }
    setLoading(false);
  };

  return (
    <>
      <BlogList
        posts={filteredPosts}
        categories={categories}
        onCategoryClick={setSelectedCategory}
        selectedCategory={selectedCategory}
        readLaterIds={readLaterIds}
        onToggleReadLater={toggleReadLater}
        viewedIds={viewedIds}
        isModerator={userRoleId === 3}
        onAddResource={() => setOpen(true)}
        showAddButton={true}
      />
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? "Modifier la ressource" : "Ajouter une ressource"}
            </DialogTitle>
          </DialogHeader>
          <AddOrEditResourceForm
            onSubmit={handleAddResource}
            loading={loading}
            categories={categoriesList}
            initialValues={editingResource || undefined}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Composant de chargement pour le Suspense
function BlogListPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}

// Composant principal avec Suspense
export default function BlogListPage() {
  return (
    <Suspense fallback={<BlogListPageLoading />}>
      <BlogListPageContent />
    </Suspense>
  );
}
