"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/types/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  FileText,
  Eye,
  Heart,
  MessageSquare,
  Shield,
  Download,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { AddOrEditResourceForm } from "@/components/ressources/AddOrEditResourceForm";

type Resource = Tables<"resources"> & {
  categories: { name: string } | null;
  users: { firstname: string; lastname: string } | null;
  _count?: {
    views: number;
    likes: number;
    comments: number;
  };
};


// Nouveau type pour les utilisateurs fusionnés de l'API admin
type MergedUser = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role_id?: number | null;
  roles?: { name: string; id?: number } | null;
  created_at: string;
  banned_until?: string | null;
  ban_duration?: string | null;
  _count?: {
    resources: number;
    views: number;
    likes: number;
  };
};

type DashboardStats = {
  totalUsers: number;
  totalResources: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  verifiedResources: number;
  publicResources: number;
  newUsersThisMonth: number;
  newResourcesThisMonth: number;
};

// Ajout du type pour les filtres de durée
type DurationFilter = '24h' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

const chartConfig = {
  views: {
    label: "Vues",
    color: "hsl(var(--chart-1))",
  },
  likes: {
    label: "Likes",
    color: "hsl(var(--chart-2))",
  },
  comments: {
    label: "Commentaires",
    color: "hsl(var(--chart-3))",
  },
  resources: {
    label: "Ressources",
    color: "hsl(var(--chart-4))",
  },
  users: {
    label: "Utilisateurs",
    color: "hsl(var(--chart-5))",
  },
};

// Fonction pour générer des couleurs modernes et neutres pour les catégories
const generateCategoryColors = (count: number): string[] => {
  // Palette moderne et neutre
  const modernColors = [
    "#64748b", // Slate-500 - Gris neutre
    "#3b82f6", // Blue-500 - Bleu moderne
    "#10b981", // Emerald-500 - Vert moderne
    "#8b5cf6", // Violet-500 - Violet subtil
    "#f59e0b", // Amber-500 - Orange doux
    "#ef4444", // Red-500 - Rouge moderne
    "#06b6d4", // Cyan-500 - Cyan moderne
    "#84cc16", // Lime-500 - Vert lime
    "#f97316", // Orange-500 - Orange moderne
    "#ec4899", // Pink-500 - Rose moderne
    "#6366f1", // Indigo-500 - Indigo moderne
    "#14b8a6", // Teal-500 - Teal moderne
    "#f43f5e", // Rose-500 - Rose vif
    "#a855f7", // Purple-500 - Purple moderne
    "#22c55e", // Green-500 - Vert vif
    "#eab308", // Yellow-500 - Jaune moderne
    "#78716c", // Stone-500 - Gris pierre
    "#6b7280", // Gray-500 - Gris standard
    "#059669", // Emerald-600 - Vert foncé
    "#1d4ed8", // Blue-600 - Bleu foncé
  ];

  // Si on a plus de catégories que de couleurs, on répète avec des variations
  const colors = [];
  for (let i = 0; i < count; i++) {
    const baseColor = modernColors[i % modernColors.length];
    
    // Pour les couleurs répétées, on ajuste légèrement la luminosité
    const repeatCount = Math.floor(i / modernColors.length);
    if (repeatCount > 0) {
      // Ajuster la luminosité pour créer des variations
      const adjustedColor = adjustColorBrightness(baseColor, repeatCount * 0.1);
      colors.push(adjustedColor);
    } else {
      colors.push(baseColor);
    }
  }

  return colors;
};

// Fonction pour ajuster la luminosité d'une couleur
const adjustColorBrightness = (hex: string, factor: number): string => {
  // Convertir hex en RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Ajuster la luminosité
  const newR = Math.max(0, Math.min(255, Math.round(r + (255 - r) * factor)));
  const newG = Math.max(0, Math.min(255, Math.round(g + (255 - g) * factor)));
  const newB = Math.max(0, Math.min(255, Math.round(b + (255 - b) * factor)));

  // Convertir en hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [adminUsers, setAdminUsers] = useState<MergedUser[]>([]); // Pour l'affichage admin
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [dailyData, setDailyData] = useState<unknown[]>([]);
  const [categoryColors, setCategoryColors] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<Tables<"categories"> | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Tables<"categories"> | null>(null);
  
  // États pour le CRUD des ressources - simplifiés car maintenant géré par le composant
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [deleteResourceDialogOpen, setDeleteResourceDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [resourceFormLoading, setResourceFormLoading] = useState(false);

  // Ajout des états pour la gestion des rôles et de la suspension
  const [selectedUser, setSelectedUser] = useState<MergedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roles, setRoles] = useState<Tables<"roles">[]>([]);

  // États pour l'authentification
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>("");

  // Nouvel état pour le filtre de durée
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('30d');
  
  // État pour le chargement des filtres
  const [filterLoading, setFilterLoading] = useState(false);

  // Fonction pour recharger les utilisateurs fusionnés
  const fetchMergedUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/list-users");
      const data = await res.json();
      console.log("[ADMIN] Utilisateurs fusionnés:", data.users);
      if (data.users) {
        setAdminUsers(data.users);
      }
    } catch (e) {
      console.error("Erreur lors du rechargement des utilisateurs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Vérification de l'authentification et du rôle
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);
      // Récupérer le rôle de l'utilisateur
      const { data: userData } = await supabase
        .from("users")
        .select("role_id, roles(name)")
        .eq("id", data.user.id)
        .single();
      const roleName = userData?.roles?.name || "";
      setUserRole(roleName);
      setIsAdmin(roleName === "admin" || roleName === "super-admin");
    };
    checkAuth();
  }, []);

  // Charger les rôles au montage
  useEffect(() => {
    const fetchRoles = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("roles").select("*");
      if (data) setRoles(data);
    };
    fetchRoles();
  }, []);

  // Charger les utilisateurs au montage
  useEffect(() => {
    fetchMergedUsers();
  }, []);

  // Fonction pour calculer la date de début selon le filtre
  const getStartDate = (filter: DurationFilter): Date | null => {
    const now = new Date();
    switch (filter) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all':
        return null;
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  // Fonction pour obtenir le label du filtre
  const getDurationLabel = (filter: DurationFilter): string => {
    switch (filter) {
      case '24h': return '24h';
      case '7d': return '7 jours';
      case '30d': return '30 jours';
      case '3m': return '3 mois';
      case '6m': return '6 mois';
      case '1y': return '1 an';
      case 'all': return 'Tout';
      default: return '30 jours';
    }
  };

  // Fonction pour obtenir le nombre de points de données selon le filtre
  const getDataPoints = (filter: DurationFilter): number => {
    switch (filter) {
      case '24h': return 24; // 24 heures
      case '7d': return 7; // 7 jours
      case '30d': return 30; // 30 jours
      case '3m': return 12; // 12 semaines
      case '6m': return 6; // 6 mois
      case '1y': return 12; // 12 mois
      case 'all': return 7; // Par défaut 7 jours pour "tout"
      default: return 7;
    }
  };



  // Fonction pour calculer les données temporelles selon le filtre
  const calculateTimeData = (filter: DurationFilter) => {
    const dataPoints = getDataPoints(filter);
    const data = [];
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date();
      
      switch (filter) {
        case '24h':
          date.setHours(date.getHours() - i);
          break;
        case '7d':
          date.setDate(date.getDate() - i);
          break;
        case '30d':
          date.setDate(date.getDate() - i);
          break;
        case '3m':
          date.setDate(date.getDate() - (i * 7)); // Par semaine
          break;
        case '6m':
          date.setMonth(date.getMonth() - i);
          break;
        case '1y':
          date.setMonth(date.getMonth() - i);
          break;
        case 'all':
          date.setDate(date.getDate() - i);
          break;
        default:
          date.setDate(date.getDate() - i);
      }
      
      const startOfPeriod = new Date(date);
      const endOfPeriod = new Date(date);
      
      // Ajuster les bornes selon le filtre
      switch (filter) {
        case '24h':
          startOfPeriod.setMinutes(0, 0, 0);
          endOfPeriod.setMinutes(59, 59, 999);
          break;
        case '7d':
        case '30d':
        case 'all':
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
        case '3m':
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
        case '6m':
        case '1y':
          startOfPeriod.setDate(1);
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);
          endOfPeriod.setDate(0);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
      }
      
      data.push({
        date: startOfPeriod,
        startOfPeriod,
        endOfPeriod,
        label: startOfPeriod.toLocaleDateString("fr-FR", {
          weekday: filter === '24h' ? undefined : 'short',
          day: filter === '24h' ? undefined : 'numeric',
          month: filter === '6m' || filter === '1y' ? 'short' : undefined,
          year: filter === '1y' ? 'numeric' : undefined,
          hour: filter === '24h' ? '2-digit' : undefined,
          minute: filter === '24h' ? '2-digit' : undefined,
        }).replace(',', ''),
      });
    }
    
    return data;
  };

  // Fonction pour charger les données de base (une seule fois)
  const loadDashboardData = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      // Charger les données de base (sans filtre de durée)
      const [
        { count: totalUsers },
        { count: totalResources },
        { count: totalViews },
        { count: totalLikes },
        { count: totalComments },
        { count: verifiedResources },
        { count: publicResources },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("views").select("*", { count: "exact", head: true }),
        supabase.from("likes").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("resources").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("resources").select("*", { count: "exact", head: true }).eq("is_public", true),
      ]);

      // Statistiques ce mois (toujours calculées sur le mois en cours)
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const [{ count: newUsersThisMonth }, { count: newResourcesThisMonth }] =
        await Promise.all([
          supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .gte("created_at", thisMonth.toISOString()),
          supabase
            .from("resources")
            .select("*", { count: "exact", head: true })
            .gte("created_at", thisMonth.toISOString()),
        ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalResources: totalResources || 0,
        totalViews: totalViews || 0,
        totalLikes: totalLikes || 0,
        totalComments: totalComments || 0,
        verifiedResources: verifiedResources || 0,
        publicResources: publicResources || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        newResourcesThisMonth: newResourcesThisMonth || 0,
      });

      // Charger les ressources avec leurs statistiques (sans filtre de durée)
      const { data: resourcesData } = await supabase
        .from("resources")
        .select(`
          *,
          categories(name),
          users(firstname, lastname)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (resourcesData) {
        // Ajouter les comptes pour chaque ressource (sans filtre de durée)
        const resourcesWithCounts = await Promise.all(
          resourcesData.map(async (resource) => {
            const [
              { count: viewsCount },
              { count: likesCount },
              { count: commentsCount },
            ] = await Promise.all([
              supabase
                .from("views")
                .select("*", { count: "exact", head: true })
                .eq("resource_id", resource.id),
              supabase
                .from("likes")
                .select("*", { count: "exact", head: true })
                .eq("resource_id", resource.id),
              supabase
                .from("comments")
                .select("*", { count: "exact", head: true })
                .eq("resource_id", resource.id),
            ]);

            return {
              ...resource,
              _count: {
                views: viewsCount || 0,
                likes: likesCount || 0,
                comments: commentsCount || 0,
              },
            };
          })
        );

        setResources(resourcesWithCounts);
      }

      // Charger les utilisateurs (sans filtre de durée)
      const { data: usersData } = await supabase
        .from("users")
        .select(`
          *,
          roles(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (usersData) {
        await Promise.all(
          usersData.map(async (user) => {
            const [
              { count: resourcesCount },
              { count: viewsCount },
              { count: likesCount },
            ] = await Promise.all([
              supabase
                .from("resources")
                .select("*", { count: "exact", head: true })
                .eq("owner_id", user.id),
              supabase
                .from("views")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id),
              supabase
                .from("likes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id),
            ]);

            return {
              ...user,
              _count: {
                resources: resourcesCount || 0,
                views: viewsCount || 0,
                likes: likesCount || 0,
              },
            };
          })
        );
      }

      // Charger les catégories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);

        // Générer des couleurs pour les catégories
        const colors = generateCategoryColors(categoriesData.length);
        setCategoryColors(colors);

        // Données pour le graphique par catégorie (sans filtre de durée)
        const categoryStats = await Promise.all(
          categoriesData.map(async (category) => {
            const { count } = await supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("category_id", category.id);

            return {
              name: category.name,
              value: count || 0,
            };
          })
        );

        setCategoryData(categoryStats);
      }

      // Charger les données temporelles avec le filtre par défaut
      await updateFilteredData(durationFilter);

    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour uniquement les données filtrées
  const updateFilteredData = async (filter: DurationFilter) => {
    setFilterLoading(true);
    const supabase = createClient();
    
    try {
      const startDate = getStartDate(filter);
      const startDateISO = startDate ? startDate.toISOString() : null;

      // Mettre à jour les statistiques avec filtre de durée
      const [
        { count: totalUsers },
        { count: totalResources },
        { count: totalViews },
        { count: totalLikes },
        { count: totalComments },
        { count: verifiedResources },
        { count: publicResources },
      ] = await Promise.all([
        startDateISO 
          ? supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", startDateISO)
          : supabase.from("users").select("*", { count: "exact", head: true }),
        startDateISO 
          ? supabase.from("resources").select("*", { count: "exact", head: true }).gte("created_at", startDateISO)
          : supabase.from("resources").select("*", { count: "exact", head: true }),
        startDateISO 
          ? supabase.from("views").select("*", { count: "exact", head: true }).gte("viewed_at", startDateISO)
          : supabase.from("views").select("*", { count: "exact", head: true }),
        startDateISO 
          ? supabase.from("likes").select("*", { count: "exact", head: true }).gte("created_at", startDateISO)
          : supabase.from("likes").select("*", { count: "exact", head: true }),
        startDateISO 
          ? supabase.from("comments").select("*", { count: "exact", head: true }).gte("created_at", startDateISO)
          : supabase.from("comments").select("*", { count: "exact", head: true }),
        startDateISO 
          ? supabase.from("resources").select("*", { count: "exact", head: true }).eq("is_verified", true).gte("created_at", startDateISO)
          : supabase.from("resources").select("*", { count: "exact", head: true }).eq("is_verified", true),
        startDateISO 
          ? supabase.from("resources").select("*", { count: "exact", head: true }).eq("is_public", true).gte("created_at", startDateISO)
          : supabase.from("resources").select("*", { count: "exact", head: true }).eq("is_public", true),
      ]);

      // Mettre à jour les stats avec les données filtrées
      setStats(prev => prev ? {
        ...prev,
        totalUsers: totalUsers || 0,
        totalResources: totalResources || 0,
        totalViews: totalViews || 0,
        totalLikes: totalLikes || 0,
        totalComments: totalComments || 0,
        verifiedResources: verifiedResources || 0,
        publicResources: publicResources || 0,
      } : null);

      // Mettre à jour les ressources avec statistiques filtrées
      const resourcesQuery = supabase
        .from("resources")
        .select(`
          *,
          categories(name),
          users(firstname, lastname)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (startDateISO) {
        resourcesQuery.gte("created_at", startDateISO);
      }

      const { data: resourcesData } = await resourcesQuery;

      if (resourcesData) {
        const resourcesWithCounts = await Promise.all(
          resourcesData.map(async (resource) => {
            const viewsQuery = supabase
              .from("views")
              .select("*", { count: "exact", head: true })
              .eq("resource_id", resource.id);
            
            const likesQuery = supabase
              .from("likes")
              .select("*", { count: "exact", head: true })
              .eq("resource_id", resource.id);
            
            const commentsQuery = supabase
              .from("comments")
              .select("*", { count: "exact", head: true })
              .eq("resource_id", resource.id);

            if (startDateISO) {
              viewsQuery.gte("viewed_at", startDateISO);
              likesQuery.gte("created_at", startDateISO);
              commentsQuery.gte("created_at", startDateISO);
            }

            const [
              { count: viewsCount },
              { count: likesCount },
              { count: commentsCount },
            ] = await Promise.all([
              viewsQuery,
              likesQuery,
              commentsQuery,
            ]);

            return {
              ...resource,
              _count: {
                views: viewsCount || 0,
                likes: likesCount || 0,
                comments: commentsCount || 0,
              },
            };
          })
        );

        setResources(resourcesWithCounts);
      }

      // Mettre à jour les données des catégories avec filtre
      if (categories.length > 0) {
        const categoryStats = await Promise.all(
          categories.map(async (category) => {
            const categoryQuery = supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("category_id", category.id);

            if (startDateISO) {
              categoryQuery.gte("created_at", startDateISO);
            }

            const { count } = await categoryQuery;

            return {
              name: category.name,
              value: count || 0,
            };
          })
        );

        setCategoryData(categoryStats);
      }

      // Mettre à jour les données temporelles
      const timeData = calculateTimeData(filter);
      const timeStats = await Promise.all(
        timeData.map(async (timePoint) => {
          const [
            { count: periodResources },
            { count: periodUsers },
            { count: periodViews },
          ] = await Promise.all([
            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .gte("created_at", timePoint.startOfPeriod.toISOString())
              .lt("created_at", timePoint.endOfPeriod.toISOString()),
            supabase
              .from("users")
              .select("*", { count: "exact", head: true })
              .gte("created_at", timePoint.startOfPeriod.toISOString())
              .lt("created_at", timePoint.endOfPeriod.toISOString()),
            supabase
              .from("views")
              .select("*", { count: "exact", head: true })
              .gte("viewed_at", timePoint.startOfPeriod.toISOString())
              .lt("viewed_at", timePoint.endOfPeriod.toISOString()),
          ]);

          return {
            day: timePoint.label,
            resources: periodResources || 0,
            users: periodUsers || 0,
            views: periodViews || 0,
          };
        })
      );

      setDailyData(timeStats);

    } catch (error) {
      console.error("Erreur lors de la mise à jour des données filtrées:", error);
    } finally {
      setFilterLoading(false);
    }
  };

  // Mettre à jour les données filtrées quand le filtre change
  useEffect(() => {
    if (!loading) {
      updateFilteredData(durationFilter);
    }
  }, [durationFilter]);

  const handleToggleVerification = async (resourceId: number, currentStatus: boolean) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("resources")
      .update({ is_verified: !currentStatus })
      .eq("id", resourceId);

    if (!error) {
      setResources((prev) =>
        prev.map((resource) =>
          resource.id === resourceId
            ? { ...resource, is_verified: !currentStatus }
            : resource
        )
      );
    }
  };

  const handleTogglePublic = async (resourceId: number, currentStatus: boolean) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("resources")
      .update({ is_public: !currentStatus })
      .eq("id", resourceId);

    if (!error) {
      setResources((prev) =>
        prev.map((resource) =>
          resource.id === resourceId
            ? { ...resource, is_public: !currentStatus }
            : resource
        )
      );
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && resource.is_verified) ||
      (statusFilter === "unverified" && !resource.is_verified) ||
      (statusFilter === "public" && resource.is_public) ||
      (statusFilter === "private" && !resource.is_public);
    const matchesCategory =
      categoryFilter === "all" ||
      resource.category_id?.toString() === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert([{
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || null
      }])
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => [...prev, data]);
      setNewCategory({ name: "", description: "" });
      setCategoryDialogOpen(false);
      // Recharger les données pour mettre à jour les graphiques
      loadDashboardData();
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: editingCategory.name.trim(),
        description: editingCategory.description?.trim() || null
      })
      .eq("id", editingCategory.id)
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => 
        prev.map(cat => cat.id === editingCategory.id ? data : cat)
      );
      setEditingCategory(null);
      setCategoryDialogOpen(false);
      // Recharger les données pour mettre à jour les graphiques
      loadDashboardData();
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    const supabase = createClient();
    
    // Vérifier s'il y a des ressources associées à cette catégorie
    const { count } = await supabase
      .from("resources")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryToDelete.id);

    if (count && count > 0) {
      alert(`Impossible de supprimer cette catégorie car elle contient ${count} ressource(s).`);
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryToDelete.id);

    if (!error) {
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      // Recharger les données pour mettre à jour les graphiques
      loadDashboardData();
    }
  };

  const openEditDialog = (category: Tables<"categories">) => {
    setEditingCategory({ ...category });
    setCategoryDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setNewCategory({ name: "", description: "" });
    setCategoryDialogOpen(true);
  };

  // Fonctions pour le CRUD des ressources - mise à jour pour utiliser le composant
  const handleResourceSubmit = async (values: {
    title: string;
    content: string;
    isPublic: boolean;
    categoryId: number | null;
  }) => {
    setResourceFormLoading(true);
    
    try {
      const supabase = createClient();
      
      if (editingResource) {
        // Modification
        const { data, error } = await supabase
          .from("resources")
          .update({
            title: values.title.trim(),
            content: values.content.trim() || null,
            category_id: values.categoryId,
            is_public: values.isPublic,
            is_verified: editingResource.is_verified, // Garder le statut de vérification
            updated_at: new Date().toISOString()
          })
          .eq("id", editingResource.id)
          .select(`
            *,
            categories(name),
            users(firstname, lastname)
          `)
          .single();

        if (!error && data) {
          setResources((prev) => 
            prev.map((resource) => 
              resource.id === editingResource.id 
                ? { ...data, _count: resource._count } 
                : resource
            )
          );
          setEditingResource(null);
          setResourceDialogOpen(false);
          toast.success("Ressource modifiée avec succès");
          loadDashboardData(); // Recharger les stats
        } else {
          toast.error("Erreur lors de la modification de la ressource");
        }
      } else {
        // Création
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from("resources")
          .insert([{
            title: values.title.trim(),
            content: values.content.trim() || null,
            category_id: values.categoryId,
            is_public: values.isPublic,
            is_verified: true, // Les ressources créées par l'admin sont automatiquement vérifiées
            owner_id: user?.id || null
          }])
          .select(`
            *,
            categories(name),
            users(firstname, lastname)
          `)
          .single();

        if (!error && data) {
          setResources(prev => [{ ...data, _count: { views: 0, likes: 0, comments: 0 } }, ...prev]);
          setResourceDialogOpen(false);
          toast.success("Ressource créée avec succès");
          loadDashboardData(); // Recharger les stats
        } else {
          toast.error("Erreur lors de la création de la ressource");
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setResourceFormLoading(false);
    }
  };

  const openEditResourceDialog = (resource: Resource) => {
    setEditingResource({ ...resource });
    setResourceDialogOpen(true);
  };

  const openCreateResourceDialog = () => {
    setEditingResource(null);
    setResourceDialogOpen(true);
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;

    const supabase = createClient();
    
    // Supprimer d'abord les dépendances
    await Promise.all([
      supabase.from("views").delete().eq("resource_id", resourceToDelete.id),
      supabase.from("likes").delete().eq("resource_id", resourceToDelete.id),
      supabase.from("comments").delete().eq("resource_id", resourceToDelete.id),
      supabase.from("read_later").delete().eq("resource_id", resourceToDelete.id)
    ]);

    const { error } = await supabase
      .from("resources")
      .delete()
      .eq("id", resourceToDelete.id);

    if (!error) {
      setResources((prev) => prev.filter((resource) => resource.id !== resourceToDelete.id));
      setDeleteResourceDialogOpen(false);
      setResourceToDelete(null);
      toast.success("Ressource supprimée avec succès");
      loadDashboardData(); // Recharger les stats
    } else {
      toast.error("Erreur lors de la suppression de la ressource");
    }
  };

  // Fonction pour changer le rôle d'un utilisateur
  const handleUpdateUserRole = async () => {
    if (!selectedUser || !selectedRole) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ role_id: parseInt(selectedRole) })
      .eq("id", selectedUser.id);
    if (!error) {
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
      // Recharger les utilisateurs pour avoir les données à jour
      await fetchMergedUsers();
      toast.success("Rôle mis à jour");
    } else {
      toast.error("Erreur lors de la mise à jour du rôle");
    }
  };

  // Fonction pour suspendre un utilisateur pour 2 ans
  const handleSuspendUser = async (user: MergedUser) => {
    const res = await fetch("/api/admin/ban-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, banDuration: 730 }), // 2 ans = 730 jours
    });
    if (res.ok) {
      await fetchMergedUsers();
      toast.success("Utilisateur suspendu pour 2 ans");
    } else {
      toast.error("Erreur lors de la suspension");
    }
  };

  // Fonction pour lever la suspension d'un utilisateur
  const handleUnsuspendUser = async (user: MergedUser) => {
    const res = await fetch("/api/admin/ban-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, banDuration: 0 }),
    });
    if (res.ok) {
      await fetchMergedUsers();
      toast.success("Suspension levée");
    } else {
      toast.error("Erreur lors de la levée de suspension");
    }
  };

  // Fonctions d'export des données
  const exportToExcel = (data: unknown[], filename: string, sheetName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToCSV = (data: unknown[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (data: unknown[], filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export des ressources
  const exportResources = (format: 'excel' | 'csv' | 'json') => {
    const exportData = filteredResources.map(resource => ({
      ID: resource.id,
      Titre: resource.title,
      Catégorie: resource.categories?.name || 'Sans catégorie',
      Auteur: resource.users ? `${resource.users.firstname} ${resource.users.lastname}` : 'Anonyme',
      'Est Publique': resource.is_public ? 'Oui' : 'Non',
      'Est Vérifiée': resource.is_verified ? 'Oui' : 'Non',
      Vues: resource._count?.views || 0,
      Likes: resource._count?.likes || 0,
      Commentaires: resource._count?.comments || 0,
      'Date de création': new Date(resource.created_at!).toLocaleDateString('fr-FR'),
      'Dernière modification': resource.updated_at ? new Date(resource.updated_at).toLocaleDateString('fr-FR') : 'Jamais',
      Contenu: resource.content || ''
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ressources_${timestamp}`;

    switch (format) {
      case 'excel':
        exportToExcel(exportData, filename, 'Ressources');
        break;
      case 'csv':
        exportToCSV(exportData, filename);
        break;
      case 'json':
        exportToJSON(exportData, filename);
        break;
    }

    toast.success(`Export des ressources en ${format.toUpperCase()} terminé !`);
  };

  // Export des utilisateurs
  const exportUsers = (format: 'excel' | 'csv' | 'json') => {
    const exportData = adminUsers.map(user => ({
      ID: user.id,
      Email: user.email,
      Prénom: user.firstname,
      Nom: user.lastname,
      Rôle: user.roles?.name || 'Utilisateur',
      'Nombre de ressources': user._count?.resources || 0,
      'Nombre de vues': user._count?.views || 0,
      'Nombre de likes': user._count?.likes || 0,
      'Date d\'inscription': new Date(user.created_at!).toLocaleDateString('fr-FR'),
      Statut: user.banned_until ? `Suspendu jusqu'au ${new Date(user.banned_until).toLocaleDateString('fr-FR')}` : 'Actif'
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `utilisateurs_${timestamp}`;

    switch (format) {
      case 'excel':
        exportToExcel(exportData, filename, 'Utilisateurs');
        break;
      case 'csv':
        exportToCSV(exportData, filename);
        break;
      case 'json':
        exportToJSON(exportData, filename);
        break;
    }

    toast.success(`Export des utilisateurs en ${format.toUpperCase()} terminé !`);
  };

  // Export des statistiques
  const exportStats = (format: 'excel' | 'csv' | 'json') => {
    const exportData = [
      {
        Métrique: 'Utilisateurs totaux',
        Valeur: stats?.totalUsers || 0,
        'Nouveaux ce mois': stats?.newUsersThisMonth || 0
      },
      {
        Métrique: 'Ressources totales',
        Valeur: stats?.totalResources || 0,
        'Nouvelles ce mois': stats?.newResourcesThisMonth || 0
      },
      {
        Métrique: 'Vues totales',
        Valeur: stats?.totalViews || 0,
        'Nouvelles ce mois': 'N/A'
      },
      {
        Métrique: 'Likes totaux',
        Valeur: stats?.totalLikes || 0,
        'Nouveaux ce mois': 'N/A'
      },
      {
        Métrique: 'Commentaires totaux',
        Valeur: stats?.totalComments || 0,
        'Nouveaux ce mois': 'N/A'
      },
      {
        Métrique: 'Ressources vérifiées',
        Valeur: stats?.verifiedResources || 0,
        'Nouvelles ce mois': 'N/A'
      },
      {
        Métrique: 'Ressources publiques',
        Valeur: stats?.publicResources || 0,
        'Nouvelles ce mois': 'N/A'
      }
    ];

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `statistiques_${timestamp}`;

    switch (format) {
      case 'excel':
        exportToExcel(exportData, filename, 'Statistiques');
        break;
      case 'csv':
        exportToCSV(exportData, filename);
        break;
      case 'json':
        exportToJSON(exportData, filename);
        break;
    }

    toast.success(`Export des statistiques en ${format.toUpperCase()} terminé !`);
  };

  // Export complet avec plusieurs feuilles Excel
  const exportCompleteReport = () => {
    const workbook = XLSX.utils.book_new();

    // Feuille Statistiques
    const statsData = [
      {
        Métrique: 'Utilisateurs totaux',
        Valeur: stats?.totalUsers || 0,
        'Nouveaux ce mois': stats?.newUsersThisMonth || 0
      },
      {
        Métrique: 'Ressources totales',
        Valeur: stats?.totalResources || 0,
        'Nouvelles ce mois': stats?.newResourcesThisMonth || 0
      },
      {
        Métrique: 'Vues totales',
        Valeur: stats?.totalViews || 0,
        'Nouvelles ce mois': 'N/A'
      },
      {
        Métrique: 'Likes totaux',
        Valeur: stats?.totalLikes || 0,
        'Nouveaux ce mois': 'N/A'
      },
      {
        Métrique: 'Commentaires totaux',
        Valeur: stats?.totalComments || 0,
        'Nouveaux ce mois': 'N/A'
      },
      {
        Métrique: 'Ressources vérifiées',
        Valeur: stats?.verifiedResources || 0,
        'Nouvelles ce mois': 'N/A'
      },
      {
        Métrique: 'Ressources publiques',
        Valeur: stats?.publicResources || 0,
        'Nouvelles ce mois': 'N/A'
      }
    ];
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiques');

    // Feuille Ressources
    const resourcesData = filteredResources.map(resource => ({
      ID: resource.id,
      Titre: resource.title,
      Catégorie: resource.categories?.name || 'Sans catégorie',
      Auteur: resource.users ? `${resource.users.firstname} ${resource.users.lastname}` : 'Anonyme',
      'Est Publique': resource.is_public ? 'Oui' : 'Non',
      'Est Vérifiée': resource.is_verified ? 'Oui' : 'Non',
      Vues: resource._count?.views || 0,
      Likes: resource._count?.likes || 0,
      Commentaires: resource._count?.comments || 0,
      'Date de création': new Date(resource.created_at!).toLocaleDateString('fr-FR'),
      'Dernière modification': resource.updated_at ? new Date(resource.updated_at).toLocaleDateString('fr-FR') : 'Jamais'
    }));
    const resourcesSheet = XLSX.utils.json_to_sheet(resourcesData);
    XLSX.utils.book_append_sheet(workbook, resourcesSheet, 'Ressources');

    // Feuille Utilisateurs
    const usersData = adminUsers.map(user => ({
      ID: user.id,
      Email: user.email,
      Prénom: user.firstname,
      Nom: user.lastname,
      Rôle: user.roles?.name || 'Utilisateur',
      'Nombre de ressources': user._count?.resources || 0,
      'Nombre de vues': user._count?.views || 0,
      'Nombre de likes': user._count?.likes || 0,
      'Date d\'inscription': new Date(user.created_at!).toLocaleDateString('fr-FR'),
      Statut: user.banned_until ? `Suspendu jusqu'au ${new Date(user.banned_until).toLocaleDateString('fr-FR')}` : 'Actif'
    }));
    const usersSheet = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Utilisateurs');

    // Feuille Catégories
    const categoriesData = categories.map(category => ({
      ID: category.id,
      Nom: category.name,
      Description: category.description || 'Aucune description',
      'Nombre de ressources': (categoryData.find((c) => (c as { name: string; value: number }).name === category.name) as { name: string; value: number } | undefined)?.value || 0
    }));
    const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
    XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Catégories');

    // Feuille Activité quotidienne
    const dailySheet = XLSX.utils.json_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Activité 7 jours');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `rapport_complet_${timestamp}.xlsx`);

    toast.success('Export du rapport complet terminé !');
  };

  // Filtrage des utilisateurs selon la période sélectionnée
  const filteredAdminUsers = useMemo(() => {
    if (!adminUsers) return [];
    const startDate = getStartDate(durationFilter);
    if (!startDate) return adminUsers;
    return adminUsers.filter(user => new Date(user.created_at) >= startDate);
  }, [adminUsers, durationFilter]);

  // Filtrage des catégories selon la période sélectionnée (au moins une ressource dans la période)
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const startDate = getStartDate(durationFilter);
    if (!startDate) return categories;
    return categories.filter(cat => {
      const catData = categoryData.find(c => c.name === cat.name);
      return catData && catData.value > 0;
    });
  }, [categories, categoryData, durationFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Accès refusé</div>
          <div className="text-muted-foreground">Vous devez être connecté pour accéder à cette page.</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Accès refusé</div>
          <div className="text-muted-foreground">Vous n`&apos;`avez pas les droits administrateur pour accéder à cette page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Admin</h1>
          <p className="text-muted-foreground">
            Gérez votre plateforme de ressources
          </p>
        </div>
        <div className="flex gap-2">
          {/* Filtre de durée */}
          <Select 
            value={durationFilter} 
            onValueChange={(value: DurationFilter) => setDurationFilter(value)}
            disabled={filterLoading}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Durée" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24h</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="3m">3 mois</SelectItem>
              <SelectItem value="6m">6 mois</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => exportCompleteReport()}>
                <FileText className="h-4 w-4 mr-2" />
                Rapport complet (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportStats('excel')}>
                <Download className="h-4 w-4 mr-2" />
                Statistiques (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportStats('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Statistiques (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportStats('json')}>
                <Download className="h-4 w-4 mr-2" />
                Statistiques (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards avec indication de la période */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newUsersThisMonth} ce mois • {getDurationLabel(durationFilter)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ressources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalResources}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newResourcesThisMonth} ce mois • {getDurationLabel(durationFilter)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vues totales</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalViews}</div>
            
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLikes}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalComments} commentaires • {getDurationLabel(durationFilter)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité • {getDurationLabel(durationFilter)}</CardTitle>
            <CardDescription>
              Données temporelles selon la période sélectionnée
              {filterLoading && " • Mise à jour..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="resources"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Ressources"
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#3b82f6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Utilisateurs"
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#10b981" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Vues"
                    dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#f59e0b" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par catégorie</CardTitle>
            <CardDescription>
              Distribution des ressources par catégorie • {getDurationLabel(durationFilter)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.filter(cat => cat.value > 0).length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart width={533} height={300}>
                  <Pie
                    data={categoryData.filter(cat => cat.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.filter(cat => cat.value > 0).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={categoryColors[index % categoryColors.length]} 
                      />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Catégorie
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {payload[0].payload.name}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Ressources
                                </span>
                                <span className="font-bold">
                                  {payload[0].value}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Aucune ressource dans cette période</p>
                  <p className="text-xs">Les catégories apparaîtront quand des ressources seront créées</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs pour les différentes sections */}
      <Tabs defaultValue="resources" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resources">Ressources</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
        </TabsList>

        {/* Onglet Ressources */}
        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Ressources ({filteredResources.length})</CardTitle>
                  <CardDescription>
                    Gérez les ressources de la plateforme • {getDurationLabel(durationFilter)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportResources('excel')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Excel (.xlsx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportResources('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        CSV (.csv)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportResources('json')}>
                        <Download className="h-4 w-4 mr-2" />
                        JSON (.json)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" onClick={openCreateResourceDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle ressource
                  </Button>
                </div>
              </div>
              
              {/* Barre de recherche et filtres intégrés dans la card */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Rechercher des ressources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="verified">Vérifiées</SelectItem>
                    <SelectItem value="unverified">Non vérifiées</SelectItem>
                    <SelectItem value="public">Publiques</SelectItem>
                    <SelectItem value="private">Privées</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="none">Aucune catégorie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Statistiques</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">
                        {resource.title}
                      </TableCell>
                      <TableCell>
                        {resource.categories?.name || "Sans catégorie"}
                      </TableCell>
                      <TableCell>
                        {resource.users
                          ? `${resource.users.firstname} ${resource.users.lastname}`
                          : "Anonyme"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge
                            variant={resource.is_verified ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleVerification(resource.id, resource.is_verified)}
                          >
                            {resource.is_verified ? (
                              <>
                                <Shield className="h-3 w-3 mr-1" />
                                Vérifiée
                              </>
                            ) : (
                              "Non vérifiée"
                            )}
                          </Badge>
                          <Badge
                            variant={resource.is_public ? "outline" : "destructive"}
                            className="cursor-pointer"
                            onClick={() => handleTogglePublic(resource.id, resource.is_public)}
                          >
                            {resource.is_public ? "Publique" : "Privée"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {resource._count?.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {resource._count?.likes || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {resource._count?.comments || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(resource.created_at!).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditResourceDialog(resource)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setResourceToDelete(resource);
                                setDeleteResourceDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredResources.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune ressource trouvée avec les filtres actuels.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Utilisateurs ({filteredAdminUsers.length})</CardTitle>
                  <CardDescription>
                    Gérez les utilisateurs de la plateforme • {getDurationLabel(durationFilter)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportUsers('excel')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Excel (.xlsx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportUsers('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        CSV (.csv)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportUsers('json')}>
                        <Download className="h-4 w-4 mr-2" />
                        JSON (.json)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Ressources</TableHead>
                    <TableHead>Activité</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdminUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstname}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.lastname}
                      </TableCell>
                      <TableCell>
                        {user.email}
                      </TableCell>
                      <TableCell>
<Badge variant="outline">
                        {user.roles?.name || "Utilisateur"}
</Badge>
                      </TableCell>
                      <TableCell>
                        {user._count?.resources || 0} ressources
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {user._count?.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {user._count?.likes || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at!).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {user.banned_until ? (
                          (() => {
                            const bannedUntil = new Date(user.banned_until);
                            const now = new Date();
                            if (bannedUntil > now) {
                              // Calculer la durée restante
                              const remainingMs = bannedUntil.getTime() - now.getTime();
                              const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
                              const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
                              
                              return (
                                <span className="text-destructive">
                                  Suspendu jusqu&apos;au {bannedUntil.toLocaleDateString("fr-FR")} 
                                  {remainingDays > 1 ? ` (${remainingDays} jours restants)` : ` (${remainingHours}h restantes)`}
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-orange-500">
                                  Suspension expirée (jusqu&apos;au {bannedUntil.toLocaleDateString("fr-FR")})
                                </span>
                              );
                            }
                          })()
                        ) : (
                          <span className="text-muted-foreground">Actif</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {userRole === "super-admin" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.role_id?.toString() || "");
                                  setIsRoleDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifier le rôle
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                if (user.banned_until) {
                                  handleUnsuspendUser(user);
                                } else {
                                  handleSuspendUser(user);
                                }
                              }}
                            >
                              {user.banned_until ? (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Lever la suspension
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Suspendre pour 2 ans
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Catégories */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Catégories ({filteredCategories.length})</CardTitle>
                  <CardDescription>
                    Gérez les catégories de ressources • {getDurationLabel(durationFilter)}
                  </CardDescription>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle catégorie
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Ressources</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>
                        {category.description || "Aucune description"}
                      </TableCell>
                      <TableCell>
                        {categoryData.find((c: { name: string; value: number }) => c.name === category.name)?.value || 0} ressources
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(category)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCategoryToDelete(category);
                                setDeleteCategoryDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour Créer/Modifier une catégorie */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Modifiez les informations de la catégorie"
                : "Créez une nouvelle catégorie pour organiser vos ressources"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Nom de la catégorie</Label>
              <Input
                id="category-name"
                value={editingCategory ? editingCategory.name : newCategory.name}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, name: e.target.value });
                  } else {
                    setNewCategory({ ...newCategory, name: e.target.value });
                  }
                }}
                placeholder="Ex: Développement Web"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-description">Description (optionnelle)</Label>
              <Textarea
                id="category-description"
                value={editingCategory ? editingCategory.description || "" : newCategory.description}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, description: e.target.value });
                  } else {
                    setNewCategory({ ...newCategory, description: e.target.value });
                  }
                }}
                placeholder="Décrivez cette catégorie..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
              disabled={editingCategory ? !editingCategory.name.trim() : !newCategory.name.trim()}
            >
              {editingCategory ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour Supprimer une catégorie */}
      <Dialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la catégorie &apos;{categoryToDelete?.name}&apos; ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour Créer/Modifier une ressource avec éditeur Tiptap */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? "Modifier la ressource" : "Nouvelle ressource"}
            </DialogTitle>
            <DialogDescription>
              {editingResource 
                ? "Modifiez les informations de la ressource avec l'éditeur enrichi"
                : "Créez une nouvelle ressource pour la plateforme avec l'éditeur enrichi"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <AddOrEditResourceForm
              initialValues={editingResource ? {
                title: editingResource.title,
                content: editingResource.content || "",
                isPublic: editingResource.is_public,
                categoryId: editingResource.category_id
              } : undefined}
              categories={categories.map(cat => ({ id: cat.id, name: cat.name }))}
              loading={resourceFormLoading}
              onSubmit={handleResourceSubmit}
              onCancel={() => setResourceDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour Supprimer une ressource */}
      <Dialog open={deleteResourceDialogOpen} onOpenChange={setDeleteResourceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la ressource</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la ressource &apos;{resourceToDelete?.title}&apos; ?
              Cette action supprimera également toutes les vues, likes et commentaires associés.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteResourceDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteResource}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour Modifier le rôle d'un utilisateur */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle de l&apos;utilisateur</DialogTitle>
            <DialogDescription>
              Sélectionnez un nouveau rôle pour cet utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user-role">Rôle</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateUserRole}>
              Modifier le rôle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}