"use client"
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { LucideHeart, LucideCheckCircle, LucideXCircle, LucideShare2, LucideLoader2, LucideEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";

// Composant de chargement pour le contenu
function ContentLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <LucideLoader2 className="animate-spin h-8 w-8 text-primary" />
      <span className="ml-2 text-muted-foreground">Chargement du contenu...</span>
    </div>
  );
}

// Composant de rendu TipTap pour le contenu
function TipTapRenderer({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm border',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300 w-full overflow-x-auto',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 font-bold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-2 py-1',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
    ],
    content: content,
    editable: false, // Lecture seule
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-0',
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return <ContentLoader />;
  }

  return (
    <div className="w-full blog-post-content">
      <EditorContent editor={editor} />
    </div>
  );
}

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
  ownerId?: string | null;
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
  liked: initialLiked,
  userId,
  resourceId,
  isVerified: initialVerified = false,
  isModerator = false,
  isPublic = true,
  ownerId = null,
}: BlogPostProps & { isPublic: boolean }) {
  // Initialisation directe des états avec les props initiales
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [verified, setVerified] = useState(initialVerified);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  // Marquer le contenu comme chargé après un court délai pour éviter le flash
  useEffect(() => {
    const timer = setTimeout(() => setContentLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Optimisation : memoisation des handlers pour éviter les re-créations
  const handleLike = useCallback(async () => {
    if (!userId || likeLoading) return;
    setLikeLoading(true);
    
    try {
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
    } catch (error) {
      console.error("Erreur lors du like:", error);
    } finally {
      setLikeLoading(false);
    }
  }, [userId, likeLoading, isLiked, resourceId]);

  const handleToggleVerify = useCallback(async () => {
    if (verifyLoading) return;
    setVerifyLoading(true);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("resources")
        .update({ is_verified: !verified })
        .eq("id", resourceId);
      
      if (!error) {
        setVerified((v) => !v);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification:", error);
    } finally {
      setVerifyLoading(false);
    }
  }, [verifyLoading, verified, resourceId]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Erreur lors du partage:", error);
    }
  }, []);

  // Optimisation : memoisation des éléments coûteux
  const breadcrumbElements = useMemo(() => (
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
  ), [breadcrumbs]);

  const socialLinksElements = useMemo(() => (
    <div className="flex items-center justify-center gap-2.5">
      {socialLinks.map((s, i) => (
        <a key={i} href={s.href} className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 size-9">
          {s.icon}
        </a>
      ))}
    </div>
  ), [socialLinks]);

  const chaptersElements = useMemo(() => (
    chapters.length > 0 && (
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
    )
  ), [chapters]);

  // Optimisation : contenu sécurisé avec TipTap
  const sanitizedContent = useMemo(() => {
    if (typeof content === "string") {
      return content;
    }
    return "";
  }, [content]);

  // Composant de contenu avec lazy loading
  const ContentComponent = useMemo(() => (
    <Suspense fallback={<ContentLoader />}>
      <TipTapRenderer content={sanitizedContent} />
    </Suspense>
  ), [sanitizedContent]);

  return (
    <section className="pb-32 flex flex-col items-center w-full">
      <div className="bg-muted bg-[url('/images/block/patterns/dot-pattern-2.svg')] bg-[length:3.125rem_3.125rem] bg-repeat py-20 w-full flex flex-col items-center">
        <div className="container flex flex-col items-start justify-start gap-16 py-20 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full flex-col items-center justify-center gap-12">
            <div className="flex w-full max-w-[36rem] flex-col items-center justify-center gap-8">
              {breadcrumbElements}
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
                  {userId && ownerId && userId === ownerId && (
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm"
                      onClick={() => window.location.href = `/blog-list?edit=${resourceId}`}
                    >
                      <LucideEdit size={18} /> Modifier
                    </button>
                  )}
                </div>
                <div className="text-muted-2-foreground flex items-center justify-center gap-2.5 text-sm font-medium">
                  <div>{readTime}</div>
                  <div>|</div>
                  <div>{date}</div>
                </div>
                <h1 className="text-center text-[2.5rem] font-semibold leading-[1.2] md:text-5xl lg:text-6xl">{title}</h1>
                <p className="text-foreground text-center text-xl font-semibold leading-[1.4]">{summary}</p>
                {socialLinksElements}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container pt-20 flex flex-col items-center">
        <div className="relative mx-auto w-full max-w-5xl items-start justify-between gap-20 lg:flex">
          {chaptersElements}
          {/* Main content */}
          <div className="flex w-full max-w-[40rem] flex-col gap-10 mx-auto items-center">
            <div className="flex items-center gap-2.5">
              <Avatar className="w-12 h-12">
                <AvatarImage src={author.avatarUrl} alt={author.name} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
                    {likeLoading ? (
                      <LucideLoader2 className="animate-spin text-muted-foreground" size={18} />
                    ) : isLiked ? (
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
                      {verifyLoading ? (
                        <LucideLoader2 className="animate-spin text-muted-foreground" size={20} />
                      ) : verified ? (
                        <LucideCheckCircle className="text-green-500" size={20} />
                      ) : (
                        <LucideXCircle className="text-orange-400" size={20} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {contentLoaded ? ContentComponent : <ContentLoader />}
          </div>
        </div>
      </div>
    </section>
  );
}
