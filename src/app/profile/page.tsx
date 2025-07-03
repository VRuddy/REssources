"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProfileSidebar from "@/components/profile-sidebar";

interface ProfilePost {
	id: string;
	category: string;
	title: string;
	summary: string;
	author: string;
	date: string;
	url: string;
}

interface SupabaseUser {
	id: string;
	email?: string;
	[key: string]: unknown;
}

export default function ProfilePage() {
	const [filter, setFilter] = useState<string>("history");
	const [posts, setPosts] = useState<ProfilePost[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [user, setUser] = useState<SupabaseUser | null>(null);

	useEffect(() => {
		const fetchUser = async () => {
			const supabase = createClient();
			const { data } = await supabase.auth.getUser();
			if (data?.user) setUser(data.user as unknown as SupabaseUser);
			else setUser(null);
		};
		fetchUser();
	}, []);

	useEffect(() => {
		if (!user) return;
		setLoading(true);
		const fetchPosts = async () => {
			const supabase = createClient();
			let query;
			if (filter === "history") {
				query = supabase
					.from("views")
					.select("resource_id, resources:resources(id, category_id, title, content, owner_id, created_at, users(firstname, lastname))")
					.eq("user_id", user.id)
					.order("viewed_at", { ascending: false });
			} else if (filter === "readlater") {
				query = supabase
					.from("read_later")
					.select("resource_id, resources:resources(id, category_id, title, content, owner_id, created_at, users(firstname, lastname))")
					.eq("user_id", user.id)
					.order("saved_at", { ascending: false });
			} else if (filter === "liked") {
				query = supabase
					.from("likes")
					.select("resource_id, resources:resources(id, category_id, title, content, owner_id, created_at, users(firstname, lastname))")
					.eq("user_id", user.id)
					.order("created_at", { ascending: false });
			}
			if (query) {
				const { data } = await query;
				type SupabaseResource = {
					id: string | number;
					category_id?: string | number;
					title: string;
					content?: string;
					owner_id?: string;
					created_at?: string;
					users?: { firstname?: string; lastname?: string };
				};
				type SupabaseRow = { resources: SupabaseResource };
				const posts = (data as SupabaseRow[] | null || [])
					.map((v) => v.resources)
					.filter(Boolean)
					.map((r) => ({
						id: r.id?.toString(),
						category: r.category_id?.toString() ?? "",
						title: r.title,
						summary: r.content ?? "",
						author: r.users ? `${r.users.firstname ?? ""} ${r.users.lastname ?? ""}`.trim() : "Anonyme",
						date: r.created_at ?? "",
						url: `/blog-post/${r.id}`,
					})) as ProfilePost[];
				setPosts(posts);
			}
			setLoading(false);
		};
		fetchPosts();
	}, [filter, user]);

	return (
		<div className="flex min-h-screen max-w-5xl mx-auto pt-8 gap-8">
			{/* Sidebar sous la navbar, centrée à gauche */}
			<div className="w-full max-w-xs flex-shrink-0">
				<ProfileSidebar
					filter={filter}
					setFilter={setFilter}
					posts={posts}
					loading={loading}
					user={user}
				/>
			</div>
			{/* Contenu principal à droite */}
			<main className="flex-1 bg-white rounded-xl shadow p-8">
				{/* Ici mettre le formulaire de modification du profil utilisateur */}
				<div className="text-gray-400 text-center">
					Modification du profil utilisateur à venir…
				</div>
			</main>
		</div>
	);
}