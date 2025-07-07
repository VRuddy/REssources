"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProfileSidebar from "@/components/profile-sidebar";
import ProfileForm from "@/components/profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, History, Bookmark, Heart, Settings } from "lucide-react";

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
	const [filter, setFilter] = useState<string>("profile");
	const [posts, setPosts] = useState<ProfilePost[]>([]);
	const [recentActivities, setRecentActivities] = useState<ProfilePost[]>([]);
	const [stats, setStats] = useState({ viewed: 0, saved: 0, liked: 0 });
	const [loading, setLoading] = useState<boolean>(false);
	const [user, setUser] = useState<SupabaseUser | null>(null);
	const [checkingAuth, setCheckingAuth] = useState(true);

	// Nouvelle fonction pour récupérer l'utilisateur ET son profil
	const fetchUserWithProfile = async () => {
		const supabase = createClient();
		const { data } = await supabase.auth.getUser();
		if (data?.user) {
			// Récupérer les infos du profil dans la table public.users
			const { data: profile } = await supabase
				.from("users")
				.select("firstname, lastname")
				.eq("id", data.user.id)
				.single();

			setUser({
				...data.user,
				user_metadata: {
					...data.user.user_metadata,
					firstname: profile?.firstname ?? "",
					lastname: profile?.lastname ?? "",
				},
			});
		} else {
			setUser(null);
		}
	};

	useEffect(() => {
		setCheckingAuth(true);
		fetchUserWithProfile().finally(() => setCheckingAuth(false));
	}, []);

	// Récupérer les statistiques séparément
	useEffect(() => {
		if (!user) return;
		
		const fetchStats = async () => {
			const supabase = createClient();
			
			// Compter les vues
			const { count: viewedCount } = await supabase
				.from("views")
				.select("*", { count: "exact", head: true })
				.eq("user_id", user.id);
			
			// Compter les sauvegardées
			const { count: savedCount } = await supabase
				.from("read_later")
				.select("*", { count: "exact", head: true })
				.eq("user_id", user.id);
			
			// Compter les likées
			const { count: likedCount } = await supabase
				.from("likes")
				.select("*", { count: "exact", head: true })
				.eq("user_id", user.id);
			
			setStats({
				viewed: viewedCount || 0,
				saved: savedCount || 0,
				liked: likedCount || 0
			});
		};
		
		fetchStats();
	}, [user]);

	// Récupérer les activités récentes combinées
	useEffect(() => {
		if (!user) return;
		
		const fetchRecentActivities = async () => {
			const supabase = createClient();
			
			// Récupérer les 3 dernières vues
			const { data: views } = await supabase
				.from("views")
				.select("resource_id, viewed_at, resources:resources(*)")
				.eq("user_id", user.id)
				.order("viewed_at", { ascending: false })
				.limit(3);
			
			// Récupérer les 3 dernières sauvegardées
			const { data: saved } = await supabase
				.from("read_later")
				.select("resource_id, saved_at, resources:resources(*)")
				.eq("user_id", user.id)
				.order("saved_at", { ascending: false })
				.limit(3);
			
			// Récupérer les 3 dernières likées
			const { data: liked } = await supabase
				.from("likes")
				.select("resource_id, created_at, resources:resources(*)")
				.eq("user_id", user.id)
				.order("created_at", { ascending: false })
				.limit(3);
			
			// Combiner toutes les activités
			const allActivities = [
				...(views || []).map((v) => ({
					...v,
					activity_type: "Consultée",
					activity_date: v.viewed_at
				})),
				...(saved || []).map((s) => ({
					...s,
					activity_type: "Sauvegardée",
					activity_date: s.saved_at
				})),
				...(liked || []).map((l) => ({
					...l,
					activity_type: "Likée",
					activity_date: l.created_at
				}))
			];
			
			// Trier par date et prendre les 3 plus récentes
			const sortedActivities = allActivities
				.filter(a => a.resources && a.activity_date)
				.sort((a, b) => new Date(b.activity_date!).getTime() - new Date(a.activity_date!).getTime())
				.slice(0, 3)
				.map((a, index) => ({
					id: `${a.activity_type.toLowerCase()}-${a.resources.id}-${index}`,
					category: a.activity_type,
					title: a.resources.title,
					summary: a.resources.content?.slice(0, 100) + "..." || "",
					author: a.resources.owner_id ?? "",
					date: a.activity_date || "",
					url: `/blog-post/${a.resources.id}`,
				}));
			
			setRecentActivities(sortedActivities);
		};
		
		fetchRecentActivities();
	}, [user]);

	useEffect(() => {
		if (!user || filter === "profile") {
			setPosts([]);
			return;
		}
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
			} else if (filter === "saved") {
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
				type SupabaseRow = { 
					resources: SupabaseResource;
					viewed_at?: string;
					saved_at?: string;
					created_at?: string;
				};
				const posts = (data as SupabaseRow[] | null || [])
					.map((v) => v.resources)
					.filter(Boolean)
					.map((r, index) => {
						// Traduire le filtre en français pour l'affichage
						let categoryLabel = filter;
						if (filter === "history") categoryLabel = "Consultée";
						else if (filter === "saved") categoryLabel = "Sauvegardée";
						else if (filter === "liked") categoryLabel = "Likée";
						
						return {
							id: r.id?.toString(),
							category: categoryLabel,
							title: r.title,
							summary: r.content?.slice(0, 100) + "..." || "",
							author: r.owner_id ?? "",
							date: (data as SupabaseRow[])[index]?.viewed_at || 
								  (data as SupabaseRow[])[index]?.saved_at || 
								  (data as SupabaseRow[])[index]?.created_at || 
								  r.created_at || "",
							url: `/blog-post/${r.id}`,
						};
					}) as ProfilePost[];
				setPosts(posts);
			} else {
				setPosts([]);
			}
			setLoading(false);
		};
		fetchPosts();
	}, [filter, user]);

	const handleProfileUpdate = () => {
		// Recharger les données utilisateur après mise à jour
		fetchUserWithProfile();
	};

	if (checkingAuth) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<div className="text-muted-foreground">Vérification de l&apos;authentification...</div>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="text-2xl font-bold mb-2">Accès refusé</div>
					<div className="text-muted-foreground">Vous devez être connecté pour accéder à cette page.</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-col lg:flex-row min-h-screen max-w-7xl mx-auto pt-8 gap-4 lg:gap-8 px-2 sm:px-4">
				{/* Sidebar au-dessus sur mobile, à gauche sur desktop */}
				<div className="w-full mb-6 lg:mb-0 lg:max-w-xs flex-shrink-0">
					<ProfileSidebar
						posts={recentActivities}
						loading={loading}
						user={user}
						stats={stats}
					/>
				</div>
				{/* Contenu principal à droite ou en dessous */}
				<main className="flex-1 mt-0">
					<Tabs value={filter} onValueChange={setFilter} className="w-full">
						{/* Onglets scroll horizontal mobile */}
						<div className="block lg:hidden w-full overflow-x-auto scrollbar-hide py-2 bg-background">
							<div className="flex gap-2 px-2">
								<TabsList className="flex flex-row min-w-max gap-2">
									<TabsTrigger value="profile" className="flex items-center gap-2 min-w-[120px]">
										<User className="w-4 h-4" />
										Profil
									</TabsTrigger>
									<TabsTrigger value="history" className="flex items-center gap-2 min-w-[120px]">
										<History className="w-4 h-4" />
										Historique
									</TabsTrigger>
									<TabsTrigger value="saved" className="flex items-center gap-2 min-w-[120px]">
										<Bookmark className="w-4 h-4" />
										Sauvegardés
									</TabsTrigger>
									<TabsTrigger value="liked" className="flex items-center gap-2 min-w-[120px]">
										<Heart className="w-4 h-4" />
										Likés
									</TabsTrigger>
								</TabsList>
							</div>
						</div>
						{/* Onglets grille desktop */}
						<div className="hidden lg:block">
							<TabsList className="grid w-full grid-cols-4 mb-6 gap-2">
								<TabsTrigger value="profile" className="flex items-center gap-2">
									<User className="w-4 h-4" />
									Profil
								</TabsTrigger>
								<TabsTrigger value="history" className="flex items-center gap-2">
									<History className="w-4 h-4" />
									Historique
								</TabsTrigger>
								<TabsTrigger value="saved" className="flex items-center gap-2">
									<Bookmark className="w-4 h-4" />
									Sauvegardés
								</TabsTrigger>
								<TabsTrigger value="liked" className="flex items-center gap-2">
									<Heart className="w-4 h-4" />
									Likés
								</TabsTrigger>
							</TabsList>
						</div>
						{/* Contenus */}
						<TabsContent value="profile" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Settings className="w-5 h-5" />
										Paramètres du compte
									</CardTitle>
									<CardDescription>
										Gérez vos informations personnelles et vos préférences
									</CardDescription>
								</CardHeader>
								<CardContent>
									{user && (
										<ProfileForm user={user} onProfileUpdate={handleProfileUpdate} />
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="history" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<History className="w-5 h-5" />
										Historique de navigation
									</CardTitle>
									<CardDescription>
										Vos ressources consultées récemment
									</CardDescription>
								</CardHeader>
								<CardContent>
									{loading ? (
										<div className="text-center py-8">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
											<p className="mt-2 text-muted-foreground">Chargement...</p>
										</div>
									) : posts.length === 0 ? (
										<div className="text-center py-8">
											<History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
											<p className="text-muted-foreground">Aucun historique disponible</p>
										</div>
									) : (
										<div className="grid gap-4">
											{posts.map((post) => (
												<a
													key={post.id}
													href={post.url}
													className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer block"
												>
													<div className="flex items-center gap-2 mb-2">
														<span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
															{post.category}
														</span>
														<span className="text-xs text-muted-foreground ml-auto">
															{new Date(post.date).toLocaleDateString('fr-FR')}
														</span>
													</div>
													<h3 className="font-semibold mb-1">{post.title}</h3>
													<div 
														className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
														dangerouslySetInnerHTML={{ __html: post.summary }}
													/>
												</a>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="saved" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Bookmark className="w-5 h-5" />
										Ressources sauvegardées
									</CardTitle>
									<CardDescription>
										Vos ressources marquées pour lecture ultérieure
									</CardDescription>
								</CardHeader>
								<CardContent>
									{loading ? (
										<div className="text-center py-8">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
											<p className="mt-2 text-muted-foreground">Chargement...</p>
										</div>
									) : posts.length === 0 ? (
										<div className="text-center py-8">
											<Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
											<p className="text-muted-foreground">Aucune ressource sauvegardée</p>
										</div>
									) : (
										<div className="grid gap-4">
											{posts.map((post) => (
												<a
													key={post.id}
													href={post.url}
													className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer block"
												>
													<div className="flex items-center gap-2 mb-2">
														<span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
															{post.category}
														</span>
														<span className="text-xs text-muted-foreground ml-auto">
															{new Date(post.date).toLocaleDateString('fr-FR')}
														</span>
													</div>
													<h3 className="font-semibold mb-1">{post.title}</h3>
													<div 
														className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
														dangerouslySetInnerHTML={{ __html: post.summary }}
													/>
												</a>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="liked" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Heart className="w-5 h-5" />
										Ressources likées
									</CardTitle>
									<CardDescription>
										Vos ressources favorites
									</CardDescription>
								</CardHeader>
								<CardContent>
									{loading ? (
										<div className="text-center py-8">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
											<p className="mt-2 text-muted-foreground">Chargement...</p>
										</div>
									) : posts.length === 0 ? (
										<div className="text-center py-8">
											<Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
											<p className="text-muted-foreground">Aucune ressource likée</p>
										</div>
									) : (
										<div className="grid gap-4">
											{posts.map((post) => (
												<a
													key={post.id}
													href={post.url}
													className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer block"
												>
													<div className="flex items-center gap-2 mb-2">
														<span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
															{post.category}
														</span>
														<span className="text-xs text-muted-foreground ml-auto">
															{new Date(post.date).toLocaleDateString('fr-FR')}
														</span>
													</div>
													<h3 className="font-semibold mb-1">{post.title}</h3>
													<div 
														className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
														dangerouslySetInnerHTML={{ __html: post.summary }}
													/>
												</a>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</main>
			</div>
		</>
	);
}