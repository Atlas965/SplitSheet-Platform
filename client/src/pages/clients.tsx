import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { Users, Search, FileText, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/Footer";
import UserAvatar from "@/components/UserAvatar";

interface Client {
  id: string;
  name: string;
  email?: string;
  role: string;
  contractCount?: number;
  lastActivity?: string;
}

export default function Clients() {
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  // Pull clients from operator API
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/"><Logo /></Link>
            <Link href="/" className="text-xl font-bold text-primary">SplitSheet</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Dashboard</Link>
            <UserAvatar />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" /> Clients &amp; Collaborators
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Everyone you've worked with across your contracts
            </p>
          </div>
          <Button asChild>
            <Link href="/contract/split-sheet">
              <Plus className="h-4 w-4 mr-1.5" /> New Contract
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {clientsLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-16">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-foreground">
              {search ? "No clients match your search" : "No collaborators yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search ? "Try a different name or email." : "Add collaborators to a contract to see them here."}
            </p>
            {!search && (
              <Button asChild size="sm">
                <Link href="/contract/split-sheet">Create your first split sheet</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {filtered.length} collaborator{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent shrink-0">
                    {client.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{client.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {client.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />{client.email}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground capitalize">{client.role}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {client.contractCount} contract{client.contractCount !== 1 ? "s" : ""}
                    </div>
                    {client.lastActivity && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(client.lastActivity).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}