import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "wouter";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean | null;
  actionUrl?: string | null;
  createdAt: string;
};

export default function Notifications() {
  const { data: items = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications"],
  });

  const markAll = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Confirmation activity and workflow updates for your projects.
          </p>
        </div>
        {unread > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No notifications yet. When a contributor confirms or requests a change, it will appear here.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.isRead && <Badge variant="outline" className="text-[10px]">New</Badge>}
              </div>
            );
            return (
              <li key={n.id} className={`rounded-lg border p-4 ${n.isRead ? "bg-card" : "bg-muted/40"}`}>
                {n.actionUrl ? (
                  <Link
                    href={n.actionUrl}
                    onClick={() => {
                      if (!n.isRead) markOne.mutate(n.id);
                    }}
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      if (!n.isRead) markOne.mutate(n.id);
                    }}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
