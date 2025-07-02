"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProfileSidebar from "@/components/profile-sidebar";

export default function ProfilePage() {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
	useEffect(() => {
		const fetchUser = async () => {
			const supabase = createClient();
			const { data } = await supabase.auth.getUser();
			if (data?.user) setUser(data.user);
			else setUser(null);
		};
		fetchUser();
	}, []);



	return (
		<div className="flex min-h-screen max-w-5xl mx-auto pt-8 gap-8">
			{/* Sidebar sous la navbar, centrée à gauche */}
			<div className="w-full max-w-xs flex-shrink-0">
				<ProfileSidebar />
			</div>
			{/* Contenu principal à droite */}
			<main className="flex-1 bg-white rounded-xl shadow p-8">
				{/* Ici mettre le formulaire de modification du profil utilisateur */}
				<div className="text-gray-400 text-center">Modification du profil utilisateur à venir…</div>
			</main>
		</div>
	);
}