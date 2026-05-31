import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

import {
  Bell,
  CheckCheck,
  FileText,
  Users,
  CreditCard,
  AlertCircle,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

function notifIcon(type: string) {
  if (type?.includes("contract")) {
    return <FileText className="h-4 w-4 text-accent" />;
  }

  if (type?.includes("user") || type?.includes("collab")) {
    return <Users className="h-4 w-4 text-green-500" />;
  }

  if (type?.includes("payment") || type?.includes("billing")) {
    return <CreditCard className="h-4 w-4 text-yellow-500" />;
  }

  if (type?.includes("alert") || type?.includes("warn")) {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }

  return <Info className="h-4 w-4 text-muted-foreground" />;
}

export default function NotificationsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`, {});
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications"],
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/read-all", {});
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications"],
      });

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const userInitial =
    (user as any)?.firstName?.[0] ||
    (user as any)?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Logo />
            </Link>

            <Link href="/">
              <span className="text-xl font-bold text-primary cursor-pointer">
                SplitSheet
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                ← Dashboard
              </span>
            </Link>

            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {userInitial}
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6" />

              Notifications

              {unreadCount > 0 && (
                <span className="text-sm bg-accent text-white rounded-full px-2 py-0.5 font-semibold">
                  {unreadCount}
                </span>
              )}
            </h1>

            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount !== 1 ? "s" : ""
                  }`
                : "All caught up"}
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />

              Mark all read
            </Button>
          )}
        </div>

        {/* NOTIFICATION LIST */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {notificationsLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />

              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />

              <p className="font-medium text-foreground">
                No notifications yet
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Activity on your contracts and collaborations will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.isRead) {
                      markReadMutation.mutate(notification.id);
                    }
                  }}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer ${
                    !notification.isRead
                      ? "bg-accent/5 hover:bg-accent/10"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      !notification.isRead ? "bg-accent/10" : "bg-muted"
                    }`}
                  >
                    {notifIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm ${
                          !notification.isRead
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>

                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {notification.message}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(notification.createdAt).toLocaleDateString(
                        "en-CA",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}