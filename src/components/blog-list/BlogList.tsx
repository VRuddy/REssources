import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { useRouter } from "next/navigation";

export interface BlogPost {
  id: string;
  category: string;
  title: string;
  summary: string;
  author: string;
  date: string;
  url: string;
}

interface BlogListProps {
  posts: BlogPost[];
  categories?: string[];
  title?: string;
  description?: string;
  badge?: string;
  onCategoryClick?: (cat: string | null) => void;
  selectedCategory?: string | null;
}

export function BlogList({
  posts,
  categories = [],
  title = "Ressources et actualités citoyennes",
  description = "Retrouvez les dernières ressources, conseils et actualités pour mieux vivre ensemble, partager, et progresser dans vos relations au quotidien.",
  badge = "Ressources",
  onCategoryClick,
  selectedCategory,
}: BlogListProps) {
  const router = useRouter();

  return (
    <section className="py-32 flex flex-col items-center w-full">
      <div className="container flex flex-col items-center">
        <div className="flex flex-col items-center gap-6 text-center w-full">
          <Badge>{badge}</Badge>
          <h1 className="text-4xl font-bold lg:text-7xl">{title}</h1>
          <p className="text-balance lg:text-xl">{description}</p>
        </div>
        <div className="mx-auto mt-20 grid max-w-7xl w-full grid-cols-1 gap-20 lg:grid-cols-4">
          {/* Sidebar categories */}
          <div className="hidden flex-col gap-2 lg:flex">
            <Button
              variant={!selectedCategory ? "secondary" : "ghost"}
              className={!selectedCategory ? "justify-start text-left bg-secondary text-secondary-foreground hover:bg-secondary/80" : "justify-start text-left"}
              onClick={() => onCategoryClick && onCategoryClick(null)}
            >
              Toutes les catégories
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                className={selectedCategory === cat ? "justify-start text-left bg-secondary text-secondary-foreground hover:bg-secondary/80" : "justify-start text-left"}
                onClick={() => onCategoryClick && onCategoryClick(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
          {/* Blog posts */}
          <div className="lg:col-span-3 w-full flex flex-col gap-8 items-center">
            {posts.map((post, idx) => (
              <div key={post.id} className="w-full max-w-2xl">
                <button
                  type="button"
                  className="flex flex-col gap-3 text-left w-full bg-transparent border-0 p-0 hover:underline cursor-pointer"
                  onClick={() => router.push(post.url)}
                >
                  <p className="text-sm font-semibold text-muted-foreground">{post.category}</p>
                  <h3 className="text-2xl font-semibold text-balance lg:text-3xl">{post.title}</h3>
                  <p className="text-muted-foreground">{post.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="font-medium">{post.author}</span>
                    <span className="text-muted-foreground">le {post.date}</span>
                  </div>
                </button>
                {idx < posts.length - 1 && (
                  <Separator className="my-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
