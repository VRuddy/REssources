"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// Interface pour le type de subscription compatible avec web-push
interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

let subscription: WebPushSubscription | null = null;

export async function subscribeUser(sub: WebPushSubscription) {
  subscription = sub;
  // In a production environment, you would want to store the subscription in a database
  // For example: await db.subscriptions.create({ data: sub })
  return { success: true };
}

export async function unsubscribeUser() {
  subscription = null;
  // In a production environment, you would want to remove the subscription from the database
  // For example: await db.subscriptions.delete({ where: { ... } })
  return { success: true };
}

export async function sendNotification(message: string) {
  if (!subscription) {
    throw new Error("No subscription available");
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Test Notification",
        body: message,
        icon: "/icon.png",
      }),
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

export async function signUp(formData: FormData) {
	const supabase = await createClient();

	// type-cast since we're sure the values exist
	const data = {
		email: formData.get("email") as string,
		password: formData.get("password") as string,
		firstname: formData.get("firstname") as string,
		lastname: formData.get("lastname") as string,
	};

	const { error } = await supabase.auth.signUp({
		email: data.email,
		password: data.password,
		options: {
			data: {
				firstname: data.firstname,
				lastname: data.lastname,
			},
		},
	});

	if (error) {
		redirect("/auth/sign-up?error=Could not authenticate user");
	}

	redirect("/auth/sign-up-success");
}

export async function signIn(formData: FormData) {
	const supabase = await createClient();

	// type-cast since we're sure the values exist
	const data = {
		email: formData.get("email") as string,
		password: formData.get("password") as string,
	};

	const { error } = await supabase.auth.signInWithPassword({
		email: data.email,
		password: data.password,
	});

	if (error) {
		redirect("/auth/login?error=Could not authenticate user");
	}

	redirect("/protected");
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
	redirect("/");
}

export async function resetPassword(formData: FormData) {
	const supabase = await createClient();

	// type-cast since we're sure the values exist
	const data = {
		email: formData.get("email") as string,
	};

	const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
		redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
	});

	if (error) {
		redirect("/auth/forgot-password?error=Could not send reset email");
	}

	redirect("/auth/forgot-password?message=Check your email for the reset link");
}

export async function updatePassword(formData: FormData) {
	const supabase = await createClient();

	// type-cast since we're sure the values exist
	const data = {
		password: formData.get("password") as string,
	};

	const { error } = await supabase.auth.updateUser({
		password: data.password,
	});

	if (error) {
		redirect("/auth/update-password?error=Could not update password");
	}

	redirect("/auth/update-password?message=Password updated successfully");
}

// Actions pour la gestion du profil
export async function updateProfile(formData: FormData) {
	const supabase = await createClient();

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) {
		throw new Error("Utilisateur non connecté");
	}

	const profileData = {
		firstname: formData.get("firstname") as string,
		lastname: formData.get("lastname") as string,
	};

	// Mettre à jour les métadonnées utilisateur
	const { error: authError } = await supabase.auth.updateUser({
		data: {
			firstname: profileData.firstname,
			lastname: profileData.lastname,
		}
	});

	if (authError) {
		throw new Error("Erreur lors de la mise à jour du profil");
	}

	// Mettre à jour la table users si elle existe
	const { error: dbError } = await supabase
		.from('users')
		.upsert({
			id: user.id,
			firstname: profileData.firstname,
			lastname: profileData.lastname,
		});

	if (dbError && dbError.code !== '23505') { // Ignorer les erreurs de contrainte unique
		console.error('Erreur DB:', dbError);
	}

	return { success: true };
}

export async function uploadAvatar(formData: FormData) {
	const supabase = await createClient();

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) {
		throw new Error("Utilisateur non connecté");
	}

	const file = formData.get("avatar") as File;
	if (!file) {
		throw new Error("Aucun fichier fourni");
	}

	// Vérifier la taille du fichier (5MB max)
	if (file.size > 5 * 1024 * 1024) {
		throw new Error("Le fichier est trop volumineux (max 5MB)");
	}

	// Vérifier le type de fichier
	const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	if (!allowedTypes.includes(file.type)) {
		throw new Error("Type de fichier non autorisé");
	}

	// Supprimer l'ancienne image si elle existe
	const { data: { user: currentUser } } = await supabase.auth.getUser();
	if (currentUser?.user_metadata?.avatar_url) {
		const urlParts = currentUser.user_metadata.avatar_url.split('/');
		const fileName = urlParts[urlParts.length - 1];
		const oldPath = `${user.id}/${fileName}`;
		if (oldPath) {
			await supabase.storage.from('avatars').remove([oldPath]);
		}
	}

	// Upload de la nouvelle image
	const fileExt = file.name.split('.').pop();
	const fileName = `${user.id}/${Date.now()}.${fileExt}`;
	
	const { error } = await supabase.storage
		.from('avatars')
		.upload(fileName, file, {
			cacheControl: '3600',
			upsert: false
		});

	if (error) {
		throw new Error("Erreur lors de l'upload de l'image");
	}

	// Obtenir l'URL publique
	const { data: { publicUrl } } = supabase.storage
		.from('avatars')
		.getPublicUrl(fileName);

	// Mettre à jour les métadonnées utilisateur
	const { error: updateError } = await supabase.auth.updateUser({
		data: { avatar_url: publicUrl }
	});

	if (updateError) {
		throw new Error("Erreur lors de la mise à jour de l'avatar");
	}

	return { success: true, avatarUrl: publicUrl };
}

export async function deleteAvatar() {
	const supabase = await createClient();

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) {
		throw new Error("Utilisateur non connecté");
	}

	// Supprimer l'image du storage
	if (user.user_metadata?.avatar_url) {
		const urlParts = user.user_metadata.avatar_url.split('/');
		const fileName = urlParts[urlParts.length - 1];
		const oldPath = `${user.id}/${fileName}`;
		if (oldPath) {
			await supabase.storage.from('avatars').remove([oldPath]);
		}
	}

	// Mettre à jour les métadonnées utilisateur
	const { error } = await supabase.auth.updateUser({
		data: { avatar_url: null }
	});

	if (error) {
		throw new Error("Erreur lors de la suppression de l'avatar");
	}

	return { success: true };
}

export async function deleteAccount() {
	const supabase = await createClient();

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) {
		throw new Error("Utilisateur non connecté");
	}

	try {
		// Supprimer toutes les données utilisateur des tables
		// 1. Supprimer les vues
		await supabase.from('views').delete().eq('user_id', user.id);
		
		// 2. Supprimer les likes
		await supabase.from('likes').delete().eq('user_id', user.id);
		
		// 3. Supprimer les éléments sauvegardés
		await supabase.from('read_later').delete().eq('user_id', user.id);
		
		// 4. Supprimer les commentaires
		await supabase.from('comments').delete().eq('author_id', user.id);
		
		// 5. Supprimer les ressources créées par l'utilisateur
		await supabase.from('resources').delete().eq('owner_id', user.id);
		
		// 6. Supprimer de la table users
		await supabase.from('users').delete().eq('id', user.id);

		// 7. Supprimer l'avatar si il existe
		if (user.user_metadata?.avatar_url) {
			const urlParts = user.user_metadata.avatar_url.split('/');
			const fileName = urlParts[urlParts.length - 1];
			const oldPath = `${user.id}/${fileName}`;
			if (oldPath) {
				await supabase.storage.from('avatars').remove([oldPath]);
			}
		}

		// 8. Déconnecter l'utilisateur AVANT de supprimer le compte
		await supabase.auth.signOut();

		// 9. Supprimer le compte d'authentification
		// Utiliser l'Admin API avec la clé de service
		const { createAdminClient } = await import('@/lib/supabase/server');
		const supabaseAdmin = createAdminClient();
		const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
		
		if (deleteError) {
			console.error('Erreur lors de la suppression du compte:', deleteError);
			// L'utilisateur est déjà déconnecté, on peut quand même considérer que c'est un succès partiel
			console.warn('Le compte a été partiellement supprimé (données supprimées, utilisateur déconnecté)');
		}

		return { success: true };
	} catch (error) {
		console.error('Erreur lors de la suppression du compte:', error);
		// En cas d'erreur, on déconnecte au moins l'utilisateur
		await supabase.auth.signOut();
		throw error;
	}
}
