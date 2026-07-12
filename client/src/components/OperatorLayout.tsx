import { Link } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import UserAvatar from "@/components/UserAvatar";
import Footer from "@/components/Footer";

interface OperatorLayoutProps {
  children: React.ReactNode;
}

export default function OperatorLayout({ children }: OperatorLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Logo />
            </Link>
            <Link href="/" className="text-xl font-bold text-primary">
              SplitSheet
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Dashboard
            </Link>
            <UserAvatar />
          </div>
        </div>
      </nav>

      <div className="flex-1">{children}</div>

      <Footer />
    </div>
  );
}
