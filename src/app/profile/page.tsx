"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LucideEye, LucideBookmark, LucideHeart } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileSidebar from "@/components/profile-sidebar";

const FILTERS = [
	{ key: "history", label: "Historique", icon: LucideEye },
	{ key: "readlater", label: "À regarder plus tard", icon: LucideBookmark },
	{ key: "liked", label: "Likés", icon: LucideHeart },
];

function formatDate(dateString: string) {
	if (!dateString) return "";
	const date = new Date(dateString);
	return date.toLocaleDateString("fr-FR", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function ProfilePage() {
	const [filter, setFilter] = useState("history");
	const [posts, setPosts] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [user, setUser] = useState<any>(null);
	const router = useRouter();

	useEffect(() => {
		const fetchUser = async () => {
			const supabase = createClient();
			const { data } = await supabase.auth.getUser();
			if (data?.user) setUser(data.user);
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
					.select("resource_id, resources:resources(*)")
					.eq("user_id", user.id)
					.order("viewed_at", { ascending: false });
			} else if (filter === "readlater") {
				query = supabase
					.from("read_later")
					.select("resource_id, resources:resources(*)")
					.eq("user_id", user.id)
					.order("saved_at", { ascending: false });
			} else if (filter === "liked") {
				query = supabase
					.from("likes")
					.select("resource_id, resources:resources(*)")
					.eq("user_id", user.id)
					.order("created_at", { ascending: false });
			}
			if (query) {
				const { data } = await query;
				const posts = (data || [])
					.map((v: any) => v.resources)
					.filter(Boolean)
					.map((r: any) => ({
						id: r.id?.toString(),
						category: r.category_id?.toString() ?? "",
						title: r.title,
						summary: r.content ?? "",
						author: r.owner_id ?? "",
						date: r.created_at ?? "",
						url: `/blog-post/${r.id}`,
					}));
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