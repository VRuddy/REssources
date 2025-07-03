"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, User, Mail, Trash2, Camera } from "lucide-react";
import { updateProfile, uploadAvatar, deleteAvatar, deleteAccount } from "@/app/actions";

interface ProfileFormProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      firstname?: string;
      lastname?: string;
      avatar_url?: string;
    };
  };
  onProfileUpdate?: () => void;
}

// Fonction utilitaire pour convertir une image en WebP
const convertImageToWebP = (file: File, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Impossible d'obtenir le contexte du canvas"));
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("La conversion en WebP a échoué"));
            const webpFile = new File([blob], file.name.replace(/\.[a-zA-Z0-9]+$/, ".webp"), { type: "image/webp" });
            resolve(webpFile);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function ProfileForm({ user, onProfileUpdate }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstname: "",
    lastname: "",
    email: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setProfileData({
        firstname: user.user_metadata?.firstname || "",
        lastname: user.user_metadata?.lastname || "",
        email: user.email || "",
      });
      setAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const handleAvatarUpload = async (file: File) => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append("avatar", file);
      
      const result = await uploadAvatar(formData);
      
      if (result.success) {
        setAvatarUrl(result.avatarUrl);
        toast({
          title: "Avatar mis à jour",
          description: "Votre photo de profil a été mise à jour avec succès.",
        });
        onProfileUpdate?.();
      }
    } catch (error) {
      console.error('Erreur upload avatar:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour l'avatar. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    try {
      setUploading(true);
      
      const result = await deleteAvatar();
      
      if (result.success) {
        setAvatarUrl(null);
        toast({
          title: "Avatar supprimé",
          description: "Votre photo de profil a été supprimée.",
        });
        onProfileUpdate?.();
      }
    } catch (error) {
      console.error('Erreur suppression avatar:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'avatar. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append("firstname", profileData.firstname);
      formData.append("lastname", profileData.lastname);
      
      const result = await updateProfile(formData);
      
      if (result.success) {
        toast({
          title: "Profil mis à jour",
          description: "Vos informations ont été mises à jour avec succès.",
        });
        onProfileUpdate?.();
      }
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le profil. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    try {
      setLoading(true);
      
      const result = await deleteAccount();
      
      if (result.success) {
        toast({
          title: "Compte supprimé",
          description: "Votre compte a été supprimé avec succès.",
        });
        
        // Attendre un peu pour que le toast s'affiche
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Forcer un rafraîchissement complet de la page pour s'assurer que l'état d'authentification est correctement mis à jour
        window.location.replace('/');
      }
    } catch (error) {
      console.error('Erreur suppression compte:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le compte. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        toast({
          title: "Fichier trop volumineux",
          description: "La taille du fichier ne doit pas dépasser 5MB.",
          variant: "destructive",
        });
        return;
      }
      try {
        const webpFile = await convertImageToWebP(file, 0.85); // Qualité 85%
        handleAvatarUpload(webpFile);
      } catch {
        toast({
          title: "Erreur de conversion",
          description: "Impossible de convertir l'image en WebP.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photo de profil
          </CardTitle>
          <CardDescription>
            Ajoutez ou modifiez votre photo de profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl || undefined} alt="Photo de profil" />
                <AvatarFallback className="text-lg">
                  {profileData.firstname?.[0]}{profileData.lastname?.[0]}
                </AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploading}
                  className="w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {avatarUrl ? 'Modifier' : 'Ajouter'}
                </Button>
                {avatarUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarDelete}
                    disabled={uploading}
                    className="w-full sm:w-auto"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground">
                Formats acceptés: JPG, PNG, GIF, WebP. Taille max: 5MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Modifiez vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstname">Prénom</Label>
              <Input
                id="firstname"
                value={profileData.firstname}
                onChange={(e) => setProfileData(prev => ({ ...prev, firstname: e.target.value }))}
                placeholder="Votre prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Nom</Label>
              <Input
                id="lastname"
                value={profileData.lastname}
                onChange={(e) => setProfileData(prev => ({ ...prev, lastname: e.target.value }))}
                placeholder="Votre nom"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              id="email"
              value={profileData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              L&apos;email ne peut pas être modifié pour des raisons de sécurité
            </p>
          </div>
          <Button onClick={handleProfileUpdate} disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Mettre à jour le profil
          </Button>
        </CardContent>
      </Card>

      {/* Section Suppression de compte */}
      <Card className="border-destructive mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Zone de danger
          </CardTitle>
          <CardDescription>
            Actions irréversibles sur votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La suppression de votre compte est définitive et irréversible. 
              Toutes vos données seront supprimées.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading} className="w-full whitespace-normal break-words">
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="block sm:inline">Supprimer mon compte</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action ne peut pas être annulée. Cela supprimera définitivement
                    votre compte et supprimera toutes vos données de nos serveurs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleAccountDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      "Supprimer définitivement"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 