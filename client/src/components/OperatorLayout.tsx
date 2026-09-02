import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resetOnboarding } from "@/components/OnboardingWalkthrough";
import {
  Home,
  User,
  FileText,
  Users,
  Layers,
  CreditCard,
  Plus,
  Bell,
  Menu,
  X,
  BookOpen,
  HelpCircle,
  FolderOpen,
  Building2,
  Shield,
} from "lucide-react";

interface OperatorLayoutProps {
  children: React.ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: Home, testId: "nav-dashboard" },
      { href: "/clients", label: "Clients", icon: Users, testId: "nav-clients" },
      { href: "/projects", label: "Projects", icon: FolderOpen, testId: "nav-projects" },
      { href: "/organizations", label: "Organizations", icon: Building2, testId: "nav-organizations" },
      { href: "/contracts", label: "Agreements", icon: FileText, testId: "nav-contracts" },
    ],
  },
  {
    title: "Records",
    items: [
      { href: "/ownership", label: "Rights Ledger", icon: BookOpen, testId: "nav-ownership" },
      { href: "/templates", label: "Templates", icon: Layers, testId: "nav-templates" },
      { href: "/notifications", label: "Notifications", icon: Bell, testId: "nav-notifications" },
      { href: "/billing", label: "Billing", icon: CreditCard, testId: "nav-billing" },
      { href: "/profile", label: "Profile", icon: User, testId: "nav-profile" },
    ],
  },
];

function isActivePath(location: string, href: string): boolean {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(`${href}/`);
}

function SidebarNav({
  location,
  onNavigate,
  sections = NAV_SECTIONS,
}: {
  location: string;
  onNavigate?: () => void;
  sections?: NavSection[];
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    data-testid={item.testId}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function OperatorLayout({ children }: OperatorLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navSections =
    user?.role === "admin"
      ? [
          ...NAV_SECTIONS,
          {
            title: "Admin",
            items: [{ href: "/admin", label: "Admin", icon: Shield, testId: "nav-admin" }],
          },
        ]
      : NAV_SECTIONS;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border bg-sidebar z-40">
        <div className="flex items-center gap-2.5 h-16 px-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Logo />
            <span className="text-lg font-bold text-primary tracking-tight truncate">
              SplitSheet
            </span>
          </Link>
        </div>

        <div className="px-3 pt-4">
          <Button asChild className="w-full justify-start gap-2" data-testid="btn-new-contract">
            <Link href="/projects?new=1">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        <SidebarNav location={location} sections={navSections} />

        <div className="border-t border-sidebar-border p-3 space-y-2">
          <button
            type="button"
            onClick={() => resetOnboarding()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            data-testid="nav-restart-tour"
          >
            <HelpCircle className="h-4 w-4" />
            Restart Walkthrough
          </button>
          <div className="flex items-center gap-3 px-3 py-2">
            <UserAvatar />
            <a
              href="/api/logout"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[18rem] bg-sidebar border-r border-sidebar-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <Logo />
                <span className="text-lg font-bold text-primary">SplitSheet</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="px-3 pt-4">
              <Button asChild className="w-full justify-start gap-2" onClick={() => setMobileOpen(false)}>
                <Link href="/projects?new=1">
                  <Plus className="h-4 w-4" />
                  New Project
                </Link>
              </Button>
            </div>
            <SidebarNav location={location} onNavigate={() => setMobileOpen(false)} sections={navSections} />
            <div className="border-t border-sidebar-border p-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <UserAvatar />
                <a href="/api/logout" className="text-xs text-muted-foreground hover:text-foreground">
                  Sign out
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 backdrop-blur-md px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            data-testid="btn-open-sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
            <Logo />
            <span className="text-base font-bold text-primary truncate">SplitSheet</span>
          </Link>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/notifications" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>
          <UserAvatar />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
