"use client";
import { useEffect, useState } from "react";
import { Hero45 } from "@/components/hero45";
import { Blog7, Blog7Props } from "@/components/blog7";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const [posts, setPosts] = useState<Blog7Props>();

  useEffect(() => {
    const fetchResources = async () => {
      const supabase = createClient();
      const { data: resources } = await supabase
        .from("resources")
        .select("id, title, content, created_at, category_id, categories(name)")
        .order("created_at", { ascending: false })
        .limit(3);

      const mapped: Blog7Props = {
        tagline: "Ressources récentes",
        heading: "Découvrez les dernières ressources partagées",
        description: "Explorez, partagez et enrichissez vos connaissances sur les relations et la vie en société.",
        buttonText: "Voir toutes les ressources",
        buttonUrl: "#",
        posts: (resources || []).map((r) => ({
          id: r.id.toString(),
          title: r.title,
          summary: r.content?.slice(0, 120) || "",
          label: r.categories?.name || "Ressource",
          author: r.categories?.name || "Ressource",
          published: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
          url: `/blog-post/${r.id}`,
          image: "/vercel.svg",
        })),
      };
      setPosts(mapped);
    };
    fetchResources();
  }, []);

  return (
    <main className="flex flex-col items-center w-full max-w-7xl mx-auto">
      <Hero45
        badge="Ressources citoyennes"
        heading="Trouvez et partagez des ressources pour mieux vivre ensemble"
        imageSrc="/logo-resource.png"
        imageAlt="Ressources citoyennes"
        features={[
          {
            icon: <span>🌱</span>,
            title: "Des ressources pour tous",
            description: "Accédez à des contenus variés pour tous les publics.",
          },
          {
            icon: <span>🤝</span>,
            title: "Partage et entraide",
            description: "Partagez vos propres ressources et échangez avec la communauté.",
          },
          {
            icon: <span>📈</span>,
            title: "Suivi de progression",
            description: "Gardez une trace de vos favoris et de vos découvertes.",
          },
        ]}
      />
      <Blog7
        tagline="Ressources récentes"
        heading="Découvrez les dernières ressources partagées"
        description="Explorez, partagez et enrichissez vos connaissances sur les relations et la vie en société."
        buttonText="Voir toutes les ressources"
        buttonUrl="/blog-list"
        posts={posts?.posts || []}
      />
    </main>
  );
}
