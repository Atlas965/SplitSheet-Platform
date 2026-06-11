import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, FolderOpen, FileText, BookOpen,
  ChevronDown, LogOut, User, CreditCard, Menu, X,
  Mic2, Building2,
} from "lucide-react";

const NAV = [
  { href: "/",              label: "Dashboard",       icon: LayoutDashboard },
  { href: "/clients",       label: "Clients",         icon: Users },
  { href: "/projects",      label: "Projects",        icon: FolderOpen },
  { href: "/creators",      label: "Creator Registry",icon: Mic2 },
  { href: "/organizations", label: "Organizations",   icon: Building2 },
  { href: "/contracts",     label: "Music Agreements",icon: FileText },
  { href: "/ownership",     label: "Rights Ledger",   icon: BookOpen },
];

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <nav className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <Logo />
        <div>
          <span className="font-bold text-foreground">SplitSheet</span>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Operator</p>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && !active && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">{badge}</Badge>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* User menu */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left" data-testid="sidebar-user-menu">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                {(user as any)?.firstName?.[0] ?? (user as any)?.email?.[0]?.toUpperCase() ?? "O"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {(user as any)?.firstName ? `${(user as any).firstName} ${(user as any)?.lastName ?? ""}`.trim() : "Operator"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{(user as any)?.email ?? ""}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52" side="top">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center cursor-pointer"><User className="mr-2 h-4 w-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing" className="flex items-center cursor-pointer"><CreditCard className="mr-2 h-4 w-4" /> Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => { window.location.href = "/api/logout"; }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-card border-r border-border flex flex-col">
            <div className="flex justify-end p-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} data-testid="button-open-sidebar">
            <Menu className="h-5 w-5" />
          </Button>
          <Logo className="w-6 h-6" />
          <span className="font-bold text-primary">SplitSheet</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
