import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import Placeholder from "@tiptap/extension-placeholder";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  Image as ImageIcon, 
  Table as TableIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Underline as UnderlineIcon,
  Loader2,
  Upload
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface AddOrEditResourceFormProps {
  initialValues?: {
    title?: string;
    content?: string;
    isPublic?: boolean;
    categoryId?: number | null;
  };
  categories: { id: number; name: string }[];
  loading?: boolean;
  onSubmit: (values: {
    title: string;
    content: string;
    isPublic: boolean;
    categoryId: number | null;
  }) => void;
  onCancel?: () => void;
}

// Fonction pour uploader une image vers Supabase
const uploadImage = async (file: File): Promise<string> => {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  // Vérifier la taille du fichier (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Le fichier est trop volumineux (max 10MB)");
  }

  // Vérifier le type de fichier
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Type de fichier non autorisé");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('blog-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error("Erreur lors de l'upload de l'image");
  }

  const { data: { publicUrl } } = supabase.storage
    .from('blog-images')
    .getPublicUrl(fileName);

  return publicUrl;
};

// Fonction pour convertir une image collée en File
const clipboardToFile = async (clipboardData: DataTransfer): Promise<File | null> => {
  const items = Array.from(clipboardData.items);
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        // Générer un nom de fichier avec extension appropriée
        const extension = item.type.split('/')[1];
        const fileName = `pasted-image-${Date.now()}.${extension}`;
        return new File([file], fileName, { type: item.type });
      }
    }
  }
  
  return null;
};

// Composant pour la barre d'outils de l'éditeur
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [imageUploading, setImageUploading] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;

    try {
      setImageUploading(true);
      const imageUrl = await uploadImage(file);
      editor.chain().focus().setImage({ src: imageUrl }).run();
    } catch (error) {
      console.error('Erreur upload image:', error);
      alert(error instanceof Error ? error.message : "Erreur lors de l'upload de l'image");
    } finally {
      setImageUploading(false);
    }
  }, [editor]);

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!editor || !event.clipboardData) return;
    
    const file = await clipboardToFile(event.clipboardData);
    if (file) {
      event.preventDefault();
      await handleImageUpload(file);
    }
  }, [editor, handleImageUpload]);

  const handleDrop = useCallback(async (event: DragEvent) => {
    if (!editor || !event.dataTransfer) return;
    
    event.preventDefault();
    setShowDropZone(false);
    setDragCounter(0);
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        await handleImageUpload(file);
      }
    }
  }, [editor, handleImageUpload]);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    setDragCounter(prev => prev + 1);
    setShowDropZone(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setShowDropZone(false);
    }
  }, [dragCounter]);

  // Ajouter les event listeners pour le copier-coller et glisser-déposer
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    
    // Copier-coller
    editorElement.addEventListener('paste', handlePaste);
    
    // Glisser-déposer
    editorElement.addEventListener('dragover', handleDragOver);
    editorElement.addEventListener('drop', handleDrop);
    editorElement.addEventListener('dragleave', handleDragLeave);
    
    return () => {
      editorElement.removeEventListener('paste', handlePaste);
      editorElement.removeEventListener('dragover', handleDragOver);
      editorElement.removeEventListener('drop', handleDrop);
      editorElement.removeEventListener('dragleave', handleDragLeave);
    };
  }, [editor, handlePaste, handleDrop, handleDragOver, handleDragLeave]);

  if (!editor) return null;

  return (
    <>
      <div className="border-b p-2 flex flex-wrap gap-1 items-center bg-muted/30">
        {/* Boutons de formatage de base */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className="h-8 w-8 p-0"
          >
            <Bold className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive('italic') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className="h-8 w-8 p-0"
          >
            <Italic className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive('strike') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className="h-8 w-8 p-0"
          >
            <Strikethrough className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive('underline') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className="h-8 w-8 p-0"
          >
            <UnderlineIcon className="w-3 h-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Titres */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className="h-8 w-8 p-0"
          >
            <Heading1 className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="h-8 w-8 p-0"
          >
            <Heading2 className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className="h-8 w-8 p-0"
          >
            <Heading3 className="w-3 h-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Listes */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="h-8 w-8 p-0"
          >
            <List className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="w-3 h-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Citation et code */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className="h-8 w-8 p-0"
          >
            <Quote className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className="h-8 w-8 p-0"
          >
            <Code className="w-3 h-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignement du texte */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className="h-8 w-8 p-0"
          >
            <AlignRight className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className="h-8 w-8 p-0"
          >
            <AlignJustify className="w-3 h-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Tableau et Image */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="h-8 w-8 p-0"
          >
            <TableIcon className="w-3 h-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('image-upload')?.click()}
            disabled={imageUploading}
            title="Ajouter une image"
            className="h-8 w-8 p-0"
          >
            {imageUploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ImageIcon className="w-3 h-3" />
            )}
          </Button>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Annuler/Rétablir */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="h-8 w-8 p-0"
          >
            <Undo className="w-3 h-3" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="h-8 w-8 p-0"
          >
            <Redo className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Zone de drop pour les images */}
      {showDropZone && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <Card className="bg-white/95 shadow-lg">
            <CardContent className="p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-blue-600 font-medium">Déposez vos images ici</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Indicateur d'aide pour le copier-coller */}
  
    </>
  );
}

export function AddOrEditResourceForm({
  initialValues,
  categories,
  loading,
  onSubmit,
  onCancel,
}: AddOrEditResourceFormProps) {
  const [title, setTitle] = useState(initialValues?.title || "");
  const [isPublic, setIsPublic] = useState(initialValues?.isPublic ?? true);
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.categoryId ?? null);
  
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
          class: 'border-collapse border border-gray-300 w-full',
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
      Placeholder.configure({
        placeholder: 'Commencez à écrire votre contenu...',
      }),
    ],
    content: initialValues?.content || "",
          editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
        },
      },
  });

  useEffect(() => {
    setTitle(initialValues?.title || "");
    setIsPublic(initialValues?.isPublic ?? true);
    setCategoryId(initialValues?.categoryId ?? null);
    if (editor && initialValues?.content !== undefined) {
      editor.commands.setContent(initialValues.content);
    }
    // eslint-disable-next-line
  }, [initialValues]);

  return (
    <Card className="w-full max-w-3xl mx-auto border-none shadow-none bg-transparent">
      <CardContent className="px-0 pb-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!editor) return;
            onSubmit({
              title,
              content: editor.getHTML(),
              isPublic,
              categoryId,
            });
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="titre" className="text-xs font-medium text-muted-foreground">Titre</Label>
            <Input 
              id="titre" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
              placeholder="Titre de la ressource"
              className="h-8 text-sm px-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted-foreground">Contenu</Label>
            <div className="border rounded-md overflow-hidden relative bg-background">
              <EditorToolbar editor={editor} />
              <div className="h-[180px] overflow-y-auto">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-3 items-end">
            <div className="flex-1 flex flex-col gap-1">
              <Label htmlFor="categorie" className="text-xs font-medium text-muted-foreground">Catégorie</Label>
              <Select
                value={categoryId !== null ? String(categoryId) : ""}
                onValueChange={val => setCategoryId(val ? Number(val) : null)}
              >
                <SelectTrigger id="categorie" className="h-8 text-sm px-2">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Visibilité</Label>
              <div className="flex items-center gap-2">
                <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
                <span className="text-xs text-muted-foreground">{isPublic ? 'Publique' : 'Privée'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 px-3">
                Annuler
              </Button>
            )}
            <Button type="submit" disabled={loading} size="sm" className="h-8 px-4">
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                initialValues?.title ? 'Mettre à jour' : 'Créer'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
