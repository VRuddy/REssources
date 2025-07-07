'use client';

import { Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
}

interface Navbar1Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  menu?: MenuItem[];
  auth?: {
    login: {
      title: string;
      url: string;
    };
    signup: {
      title: string;
      url: string;
    };
  };
}

export default function Navbar1({
  logo = {
    url: "/",
    src: "/logo-resource.png",
    alt: "logo",
    title: "(Re)sources",
  },
  menu = [
    { title: "Accueil", url: "/" },
    { title: "Blog", url: "/blog-list" },
  ],
  auth = {
    login: { title: "Connexion", url: "/auth/login" },
    signup: { title: "Inscription", url: "/auth/sign-up" },
  },
}: Navbar1Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setIsAuthenticated(true);
        
        // Récupérer le rôle de l'utilisateur
        const { data: userData } = await supabase
          .from("users")
          .select("role_id, roles(name)")
          .eq("id", data.user.id)
          .single();
        
        const roleName = userData?.roles?.name || null;
        setUserRole(roleName);
        setIsAdmin(roleName === "admin" || roleName === "super-admin");
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAdmin(false);
      }
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          checkAuth();
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
          setIsAdmin(false);
        }
      }
    );
    
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <section className="py-4">
      <div className="max-w-5xl mx-auto px-4">
        {/* Desktop Menu */}
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href={isAuthenticated ? "/blog-list" : logo.url} className="flex items-center gap-2">
              <Image src={logo.src} width={32} height={32} alt={logo.alt} />
              <span className="text-lg font-semibold tracking-tighter">
                {logo.title}
              </span>
            </Link>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {(isAuthenticated
                    ? menu.filter((item) => item.title !== "Accueil")
                    : menu
                  ).map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex gap-2">
            {isAuthenticated ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">Profil</Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
                <LogoutButton />
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={auth.login.url}>{auth.login.title}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={auth.signup.url}>{auth.signup.title}</Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href={isAuthenticated ? "/blog-list" : logo.url} className="flex items-center gap-2">
              <Image src={logo.src} width={32} height={32} alt={logo.alt} />
            </Link>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link
                      href={isAuthenticated ? "/blog-list" : logo.url}
                      className="flex items-center gap-2"
                      onClick={() => setOpen(false)}
                    >
                      <Image src={logo.src} width={32} height={32} alt={logo.alt} />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4"
                  >
                    {(isAuthenticated
                      ? menu.filter((item) => item.title !== "Accueil")
                      : menu
                    ).map((item) => renderMobileMenuItem(item, setOpen))}
                  </Accordion>

                  <div className="flex flex-col gap-3">
                    {isAuthenticated ? (
                      <>
                        <Button asChild variant="outline">
                          <Link
                            href="/profile"
                            onClick={() => setOpen(false)}
                          >
                            Profil
                          </Link>
                        </Button>
                        {isAdmin && (
                          <Button asChild variant="outline">
                            <Link
                              href="/admin"
                              onClick={() => setOpen(false)}
                            >
                              Admin
                            </Link>
                          </Button>
                        )}
                        <LogoutButton />
                      </>
                    ) : (
                      <>
                        <Button asChild variant="outline">
                          <Link
                            href={auth.login.url}
                            onClick={() => setOpen(false)}
                          >
                            {auth.login.title}
                          </Link>
                        </Button>
                        <Button asChild>
                          <Link
                            href={auth.signup.url}
                            onClick={() => setOpen(false)}
                          >
                            {auth.signup.title}
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
}

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground">
          {item.items.map((subItem) => (
            <NavigationMenuLink asChild key={subItem.title} className="w-80">
              <SubMenuLink item={subItem} setOpen={() => {}} />
            </NavigationMenuLink>
          ))}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink asChild>
        <Link
          href={item.url}
          className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground"
        >
          {item.title}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

// Render mobile menu item with setOpen
const renderMobileMenuItem = (item: MenuItem, setOpen: (open: boolean) => void) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="text-md py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          {item.items.map((subItem) => (
            <SubMenuLink key={subItem.title} item={subItem} setOpen={setOpen} />
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }
  return (
    <Link key={item.title} href={item.url} className="text-md font-semibold" onClick={() => setOpen(false)}>
      {item.title}
    </Link>
  );
};

const SubMenuLink = ({ item, setOpen }: { item: MenuItem, setOpen: (open: boolean) => void }) => {
  return (
    <Link
      className="flex flex-row gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
      href={item.url}
      onClick={() => setOpen(false)}
    >
      <div className="text-foreground">{item.icon}</div>
      <div>
        <div className="text-sm font-semibold">{item.title}</div>
        {item.description && (
          <p className="text-sm leading-snug text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
    </Link>
  );
};
