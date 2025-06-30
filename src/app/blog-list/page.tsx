"use client";
import { useEffect, useState } from "react";
import { BlogList, BlogPost } from "@/components/blog-list/BlogList";
import { createClient } from "@/lib/supabase/client";

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      // Récupère les catégories
      const { data: catData } = await supabase.from("categories").select("name");
      setCategories(catData?.map((c) => c.name) || []);
      // Récupère les ressources avec leur catégorie et le display_name du créateur
      const { data: resources } = await supabase
        .from("resources")
        .select("id, title, content, created_at, owner_id, category_id, categories(name), users(display_name)")
        .order("created_at", { ascending: false });
      // Mapping pour BlogList
      const mapped = (resources || []).map((r) => ({
        id: r.id.toString(),
        category: r.categories?.name || "Ressource",
        title: r.title,
        summary: r.content?.slice(0, 120) || "",
        author: r.users?.display_name || "Anonyme",
        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
        url: `/blog-post/${r.id}`,
      }));
      setPosts(mapped);
    };
    fetchData();
  }, []);

  // Filtrage côté client
  const filteredPosts = selectedCategory
    ? posts.filter((p) => p.category === selectedCategory)
    : posts;

  return (
    <BlogList
      posts={filteredPosts}
      categories={categories}
      onCategoryClick={setSelectedCategory}
      selectedCategory={selectedCategory}
    />
  );
}
