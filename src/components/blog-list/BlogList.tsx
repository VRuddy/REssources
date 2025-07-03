import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";
import { useRouter } from "next/navigation";
import { LucideBookmark, LucideBookmarkCheck, LucideEye, LucideCheckCircle, LucideXCircle, LucidePlus } from "lucide-react";

export interface BlogPost {
  id: string;
  category: string;
  title: string;
  summary: string;
  author: string;
  authorAvatarUrl?: string;
  date: string;
  url: string;
  is_public: boolean;
  is_verified?: boolean; // Added property
}

interface BlogListProps {
  posts: BlogPost[];
  categories?: string[];
  title?: string;
  description?: string;
  badge?: string;
  onCategoryClick?: (cat: string | null) => void;
  selectedCategory?: string | null;
  readLaterIds?: string[];
  onToggleReadLater?: (postId: string) => void;
  viewedIds?: string[];
  isModerator?: boolean;
  onAddResource?: () => void;
  showAddButton?: boolean;
}

export function BlogList({
  posts,
  categories = [],
  title = "Ressources et actualités citoyennes",
  description = "Retrouvez les dernières ressources, conseils et actualités pour mieux vivre ensemble, partager, et progresser dans vos relations au quotidien.",
  badge = "Ressources",
  onCategoryClick,
  selectedCategory,
  readLaterIds = [],
  onToggleReadLater,
  viewedIds = [],
  isModerator = false,
  onAddResource,
  showAddButton = false,
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
        <div className="mx-20to mt-20 grid max-w-7xl w-full grid-cols-1 gap-20 lg:grid-cols-4">
          {/* Sidebar categories */}
          <div className="hidden flex-col gap-2 lg:flex">
            {showAddButton && onAddResource && (
              <Button
                onClick={onAddResource}
                className="justify-start text-left mb-4"
                variant="default"
              >
                <LucidePlus className="w-4 h-4 mr-2" />
                Ajouter une ressource
              </Button>
            )}
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
          {/* Mobile sticky horizontal categories */}
          <div className="lg:hidden sticky top-0 z-20 bg-background py-2 w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 px-2">
              {showAddButton && onAddResource && (
                <Button
                  onClick={onAddResource}
                  className="flex-shrink-0"
                  variant="default"
                  size="sm"
                >
                  <LucidePlus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              )}
              <Button
                variant={!selectedCategory ? "secondary" : "ghost"}
                className={!selectedCategory ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""}
                onClick={() => onCategoryClick && onCategoryClick(null)}
              >
                Toutes les catégories
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "secondary" : "ghost"}
                  className={selectedCategory === cat ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""}
                  onClick={() => onCategoryClick && onCategoryClick(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          {/* Blog posts */}
          <div className="lg:col-span-3 w-full flex flex-col gap-8 items-center">
            {posts.map((post, idx) => (
              <div key={post.id} className="w-full max-w-2xl relative">
                <button
                  type="button"
                  className="flex flex-col gap-3 text-left w-full bg-transparent border-0 p-0 hover:underline cursor-pointer"
                  onClick={() => router.push(post.url)}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-muted-foreground">{post.category}</p>
                    <Badge variant={post.is_public ? "default" : "secondary"} className={post.is_public ? "bg-green-500" : "bg-yellow-500"}>
                      {post.is_public ? "Public" : "Privé"}
                    </Badge>
                    {isModerator && (
                      post.is_verified ? (
                        <LucideCheckCircle className="text-green-500" size={18} />
                      ) : (
                        <LucideXCircle className="text-orange-400" size={18} />
                      )
                    )}
                  </div>
                  <h3 className="text-2xl font-semibold text-balance lg:text-3xl">{post.title}</h3>
                  <p className="text-muted-foreground">{post.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={post.authorAvatarUrl} alt={post.author} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {post.author.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{post.author}</span>
                    <span className="text-muted-foreground">le {post.date}</span>
                    {viewedIds.includes(post.id) && (
                      <LucideEye className="text-primary ml-2" size={18} />
                    )}
                  </div>
                </button>
                {/* Bookmark icon */}
                <button
                  type="button"
                  aria-label="Ajouter à lire plus tard"
                  className="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1 hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleReadLater) {
                      onToggleReadLater(post.id);
                    }
                  }}
                >
                  {readLaterIds.includes(post.id) ? (
                    <LucideBookmarkCheck className="text-primary" size={24} />
                  ) : (
                    <LucideBookmark className="text-muted-foreground" size={24} />
                  )}
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
