import { LucideEye, LucideBookmark, LucideHeart } from "lucide-react";
import Link from "next/link";

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
	user: unknown;
}

export default function ProfileSidebar({ filter, setFilter, posts, loading, user }: ProfileSidebarProps) {
	if (!user) return null;

	return (
		<div className="w-full">
			<div className="flex flex-row gap-2 w-full justify-center mb-8">
				{FILTERS.map((f) => {
					const Icon = f.icon;
					return (
						<button
							key={f.key}
							onClick={() => setFilter(f.key)}
							className={`flex flex-col items-center justify-center rounded p-2 font-medium text-base transition-colors ${
								filter === f.key
									? "bg-primary text-white"
									: "text-gray-400 hover:bg-gray-200"
							}`}
							style={{ width: 48, height: 48 }}
							aria-label={f.label}
						>
							<Icon className="w-6 h-6" />
						</button>
					);
				})}
			</div>
			<div className="flex-1 w-full overflow-y-auto">
				{loading ? (
					<div className="p-8 text-center text-gray-500">Chargement…</div>
				) : posts.length === 0 ? (
					<div className="p-8 text-center text-gray-400">Aucun post à afficher.</div>
				) : (
					<div className="flex flex-col gap-4 w-full">
						{posts.map((post) => (
							<Link
								key={post.id}
								href={post.url}
								className="border rounded-lg p-4 bg-white shadow-sm hover:shadow transition cursor-pointer hover:bg-gray-50 block"
								tabIndex={0}
								role="button"
							>
								<div className="flex items-center gap-2 mb-1">
									<span className="text-xs text-muted-foreground font-semibold">{post.category}</span>
									<span className="text-xs text-gray-400 ml-auto">{formatDate(post.date)}</span>
								</div>
								<h3 className="text-base font-bold mb-1 line-clamp-1">{post.title}</h3>
								<p className="text-gray-600 text-xs mb-1 line-clamp-2">{post.summary}</p>
								<div className="text-xs text-gray-500">par {post.author}</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}