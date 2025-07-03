"use client"
import Image from "next/image";
import { useEffect, useState } from "react";
import { LucideHeart, LucideCheckCircle, LucideXCircle, LucideShare2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface BlogPostProps {
  title: string;
  summary: string;
  content: React.ReactNode;
  author: {
    name: string;
    role?: string;
    avatarUrl?: string;
  };
  date: string;
  readTime?: string;
  categories?: string[];
  breadcrumbs?: { label: string; href: string }[];
  chapters?: { label: string; href: string }[];
  socialLinks?: { icon: React.ReactNode; href: string }[];
  liked: boolean;
  userId: string | null;
  resourceId: number;
  isVerified?: boolean;
  isModerator?: boolean;
  isPublic?: boolean;
}

export function BlogPost({
  title,
  summary,
  content,
  author,
  date,
  readTime = "10 min read",
  breadcrumbs = [
    { label: "Resources", href: "#" },
    { label: "Blogs", href: "#" },
  ],
  chapters = [],
  socialLinks = [],
  liked,
  userId,
  resourceId,
  isVerified = false,
  isModerator = false,
  isPublic = true,
}: BlogPostProps & { isPublic: boolean }) {
  const [isLiked, setIsLiked] = useState(liked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [verified, setVerified] = useState(isVerified);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsLiked(liked);
  }, [liked]);

  const handleLike = async () => {
    if (!userId || likeLoading) return;
    setLikeLoading(true);
    const supabase = createClient();
    if (isLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("resource_id", resourceId);
      setIsLiked(false);
    } else {
      await supabase
        .from("likes")
        .insert({ user_id: userId, resource_id: resourceId });
      setIsLiked(true);
    }
    setLikeLoading(false);
  };

  const handleToggleVerify = async () => {
    setVerifyLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("resources")
      .update({ is_verified: !verified })
      .eq("id", resourceId);
    if (!error) setVerified((v) => !v);
    setVerifyLoading(false);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="pb-32 flex flex-col items-center w-full">
      <div className="bg-muted bg-[url('/images/block/patterns/dot-pattern-2.svg')] bg-[length:3.125rem_3.125rem] bg-repeat py-20 w-full flex flex-col items-center">
        <div className="container flex flex-col items-start justify-start gap-16 py-20 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full flex-col items-center justify-center gap-12">
            <div className="flex w-full max-w-[36rem] flex-col items-center justify-center gap-8">
              {/* Breadcrumb */}
              <nav aria-label="breadcrumb">
                <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5">
                  {breadcrumbs.map((b, i) => (
                    <li key={b.label} className="inline-flex items-center gap-1.5">
                      <a className="hover:text-foreground transition-colors" href={b.href}>{b.label}</a>
                      {i < breadcrumbs.length - 1 && (
                        <span role="presentation" aria-hidden="true" className="[&>svg]:size-3.5">/</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="flex w-full flex-col gap-5">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Badge variant={isPublic ? "default" : "secondary"} className={isPublic ? "bg-green-500" : "bg-yellow-500"}>
                    {isPublic ? "Public" : "Privé"}
                  </Badge>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-primary/10 border text-sm"
                    onClick={handleShare}
                  >
                    <LucideShare2 size={18} /> Partager
                  </button>
                  {copied && (
                    <span className="ml-2 text-green-600 text-xs font-semibold">Lien copié !</span>
                  )}
                </div>
                <div className="text-muted-2-foreground flex items-center justify-center gap-2.5 text-sm font-medium">
                  <div>{readTime}</div>
                  <div>|</div>
                  <div>{date}</div>
                </div>
                <h1 className="text-center text-[2.5rem] font-semibold leading-[1.2] md:text-5xl lg:text-6xl">{title}</h1>
                <p className="text-foreground text-center text-xl font-semibold leading-[1.4]">{summary}</p>
                <div className="flex items-center justify-center gap-2.5">
                  {socialLinks.map((s, i) => (
                    <a key={i} href={s.href} className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 size-9">
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container pt-20 flex flex-col items-center">
        <div className="relative mx-auto w-full max-w-5xl items-start justify-between gap-20 lg:flex">
          {/* Chapters */}
          {chapters.length > 0 && (
            <div className="bg-background top-20 flex-1 pb-10 lg:sticky lg:pb-0">
              <div className="text-xl font-medium leading-snug">Chapitres</div>
              <div className="flex flex-col gap-2 pl-2 pt-2">
                {chapters.map((c) => (
                  <a key={c.href} href={c.href} className="text-muted-foreground block text-sm font-medium leading-normal transition duration-300">
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Main content */}
          <div className="flex w-full max-w-[40rem] flex-col gap-10 mx-auto items-center">
            <div className="flex items-center gap-2.5">
              <span className="relative flex shrink-0 overflow-hidden rounded-full size-12 border">
                {author.avatarUrl ? (
                  <Image
                    width={48}
                    height={48}
                   className="aspect-square size-full" alt={author.name} src={author.avatarUrl} />
                ) : (
                  <span className="size-full flex items-center justify-center bg-muted text-muted-foreground">{author.name[0]}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <div className="text-sm font-normal leading-normal flex items-center gap-1">
                  {author.name}
                </div>
                {author.role && (
                  <div className="text-muted-foreground text-sm font-normal leading-normal">{author.role}</div>
                )}
                {userId && (
                  <button
                    type="button"
                    aria-label={isLiked ? "Retirer des favoris" : "Ajouter aux favoris"}
                    className="ml-1 p-1 rounded-full hover:bg-primary/10 focus:outline-none"
                    onClick={handleLike}
                    disabled={likeLoading}
                  >
                    {isLiked ? (
                      <LucideHeart className="text-red-500" fill="currentColor" size={18} />
                    ) : (
                      <LucideHeart className="text-muted-foreground" size={18} />
                    )}
                  </button>
                )}
                {isModerator && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="ml-1 p-0 bg-transparent border-0 cursor-pointer focus:outline-none"
                      onClick={handleToggleVerify}
                      disabled={verifyLoading}
                      title={verified ? "Rendre non validé" : "Valider"}
                    >
                      {verified ? (
                        <LucideCheckCircle className="text-green-500" size={20} />
                      ) : (
                        <LucideXCircle className="text-orange-400" size={20} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="prose dark:prose-invert mx-auto text-center" dangerouslySetInnerHTML={{ __html: typeof content === "string" ? content : "" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
