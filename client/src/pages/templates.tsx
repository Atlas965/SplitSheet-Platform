import { useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

export default function Templates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const templates = [
    {
      id: "split-sheet",
      name: "Split Sheet Agreement",
      description: "Define ownership percentages and revenue splits for collaborative music projects.",
      icon: "fas fa-chart-pie",
      setupTime: "5 min setup",
      features: "2-10 collaborators"
    },
    {
      id: "performance",
      name: "Performance Agreement",
      description: "Secure bookings with venues, festivals, and event organizers.",
      icon: "fas fa-microphone",
      setupTime: "10 min setup",
      features: "Event details"
    },
    {
      id: "producer",
      name: "Producer Agreement",
      description: "Establish terms for beat licensing, production credits, and royalties.",
      icon: "fas fa-sliders-h",
      setupTime: "8 min setup",
      features: "Beat licensing"
    },
    {
      id: "management",
      name: "Management Agreement",
      description: "Define roles and responsibilities with your artist manager or booking agent.",
      icon: "fas fa-handshake",
      setupTime: "15 min setup",
      features: "Commission terms"
    }
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Logo />
              <span className="text-xl font-bold text-primary">SplitSheet</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-muted-foreground hover:text-foreground">
                <i className="fas fa-bell"></i>
              </button>
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-semibold">
                JD
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tabs */}
        <div className="mb-8">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <Link href="/" className="nav-item" data-testid="tab-overview">
                <i className="fas fa-home mr-2"></i>Overview
              </Link>
              <Link href="/contracts" className="nav-item" data-testid="tab-contracts">
                <i className="fas fa-file-contract mr-2"></i>Contracts
              </Link>
              <Link href="/profile" className="nav-item" data-testid="tab-profile">
                <i className="fas fa-user mr-2"></i>Profile
              </Link>
              <Link href="/templates" className="nav-item nav-active" data-testid="tab-templates">
                <i className="fas fa-layer-group mr-2"></i>Templates
              </Link>
              <Link href="/billing" className="nav-item" data-testid="tab-billing">
                <i className="fas fa-credit-card mr-2"></i>Billing
              </Link>
            </nav>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Contract Templates</h2>
          <p className="text-muted-foreground">Choose from our lawyer-informed templates to create professional music contracts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Link key={template.id} href={`/contract/${template.id}`}>
              <div className="bg-card p-6 rounded-xl border border-border hover:border-accent transition-colors cursor-pointer" data-testid={`template-${template.id}`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <i className={`${template.icon} text-accent text-xl`}></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
                    <p className="text-muted-foreground mb-4">{template.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span><i className="fas fa-clock mr-1"></i>{template.setupTime}</span>
                      <span><i className="fas fa-users mr-1"></i>{template.features}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
