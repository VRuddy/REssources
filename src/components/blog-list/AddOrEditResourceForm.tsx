import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
    extensions: [StarterKit],
    content: initialValues?.content || "",
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
      className="space-y-4"
    >
      <div>
        <Label htmlFor="titre">Titre</Label>
        <Input id="titre" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label>Contenu</Label>
        <div className="border rounded min-h-[120px] p-2">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div>
        <Label htmlFor="categorie">Catégorie</Label>
        <Select
          value={categoryId !== null ? String(categoryId) : ""}
          onValueChange={val => setCategoryId(val ? Number(val) : null)}
        >
          <SelectTrigger id="categorie">
            <SelectValue placeholder="Choisir une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="isPublic">Public</Label>
        <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
      </div>
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        )}
        <Button type="submit" disabled={loading}>{loading ? "Enregistrement..." : "Valider"}</Button>
      </div>
    </form>
  );
}
