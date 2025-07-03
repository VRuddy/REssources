import { LucideEye, LucideBookmark, LucideHeart, User, Calendar, Mail } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface ProfileSidebarProps {
	filter: string;
	setFilter: (filter: string) => void;
	posts: { id: string; url: string; category: string; date: string; title: string; summary: string; author: string }[];
	loading: boolean;
	user: any;
}

export default function ProfileSidebar({ filter, setFilter, posts, loading, user }: ProfileSidebarProps) {
	if (!user) return null;

	const userFirstName = user.user_metadata?.firstname || "";
	const userLastName = user.user_metadata?.lastname || "";
	const userEmail = user.email || "";
	const userAvatar = user.user_metadata?.avatar_url || null;
	const userCreatedAt = user.created_at || "";

	return (
		<div className="w-full space-y-6">
			{/* Carte utilisateur */}
			<Card>
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<Avatar className="w-20 h-20">
							<AvatarImage src={userAvatar || undefined} alt="Photo de profil" />
							<AvatarFallback className="text-xl">
								{userFirstName?.[0]}{userLastName?.[0]}
							</AvatarFallback>
						</Avatar>
					</div>
					<CardTitle className="text-lg">
						{userFirstName && userLastName 
							? `${userFirstName} ${userLastName}`
							: "Utilisateur"
						}
					</CardTitle>
					<CardDescription className="flex items-center justify-center gap-1">
						<Mail className="w-3 h-3" />
						{userEmail}
					</CardDescription>
					{userCreatedAt && (
						<div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-2">
							<Calendar className="w-3 h-3" />
							Membre depuis {new Date(userCreatedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
						</div>
					)}
				</CardHeader>
			</Card>

			{/* Statistiques rapides */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Statistiques</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<LucideEye className="w-4 h-4 text-blue-500" />
							<span className="text-sm">Consultées</span>
						</div>
						<Badge variant="secondary">{posts.filter(p => p.category === "history").length}</Badge>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<LucideBookmark className="w-4 h-4 text-green-500" />
							<span className="text-sm">Sauvegardées</span>
						</div>
						<Badge variant="secondary">{posts.filter(p => p.category === "readlater").length}</Badge>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<LucideHeart className="w-4 h-4 text-red-500" />
							<span className="text-sm">Likées</span>
						</div>
						<Badge variant="secondary">{posts.filter(p => p.category === "liked").length}</Badge>
					</div>
				</CardContent>
			</Card>

			{/* Navigation rapide */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Navigation rapide</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<Link 
						href="/profile" 
						className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-sm"
					>
						<User className="w-4 h-4" />
						Mon profil
					</Link>
					<Link 
						href="/blog-list" 
						className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-sm"
					>
						<LucideEye className="w-4 h-4" />
						Explorer les ressources
					</Link>
				</CardContent>
			</Card>

			{/* Dernières activités */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Dernières activités</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex-1 w-full overflow-y-auto">
						{loading ? (
							<div className="p-4 text-center text-gray-500 text-sm">Chargement…</div>
						) : posts.length === 0 ? (
							<div className="p-4 text-center text-gray-400 text-sm">Aucune activité récente.</div>
						) : (
							<div className="flex flex-col gap-3 w-full">
								{posts.slice(0, 5).map((post) => (
									<Link
										key={post.id}
										href={post.url}
										className="border rounded-lg p-3 bg-white shadow-sm hover:shadow transition cursor-pointer hover:bg-gray-50 block"
										tabIndex={0}
										role="button"
									>
										<div className="flex items-center gap-2 mb-1">
											<span className="text-xs text-muted-foreground font-semibold">{post.category}</span>
											<span className="text-xs text-gray-400 ml-auto">{formatDate(post.date)}</span>
										</div>
										<h3 className="text-sm font-bold mb-1 line-clamp-1">{post.title}</h3>
										<p className="text-gray-600 text-xs line-clamp-2">{post.summary}</p>
									</Link>
								))}
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}