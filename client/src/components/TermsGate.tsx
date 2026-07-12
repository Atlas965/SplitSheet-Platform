/**
 * TermsGate.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Blocks the authenticated app shell until the operator has affirmatively
 * accepted the current Terms of Service / Privacy Policy. Backed by
 * server/compliance-routes.ts (GET/POST /api/user/terms-status,
 * /api/user/accept-terms). Every other authenticated API route is rejected
 * server-side (403 TERMS_NOT_ACCEPTED) until acceptance is recorded, so this
 * gate is enforcement UI, not just a courtesy prompt.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TermsContent, PrivacyContent } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

interface TermsStatus {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  accepted: boolean;
}

export default function TermsGate({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);
  const { isAuthenticated } = useAuth();

  const { data: status, isLoading } = useQuery<TermsStatus>({
    queryKey: ["/api/user/terms-status"],
    enabled: isAuthenticated,
  });

  // IMPORTANT: all hooks must run unconditionally on every render (Rules of
  // Hooks) — this mutation must be declared before any early `return` below,
  // otherwise toggling `isAuthenticated` changes the hook count between
  // renders and React throws "Rendered more hooks than during the previous
  // render."
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/accept-terms", {
        version: status?.currentVersion,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user/terms-status"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Thanks!", description: "Terms accepted. Welcome to SplitSheet." });
    },
    onError: () => {
      toast({
        title: "Could not record acceptance",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status && !status.accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-lg flex flex-col max-h-[90vh]">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-lg text-foreground">
                Review our Terms of Service &amp; Privacy Policy
              </h2>
              <p className="text-xs text-muted-foreground">
                You must accept before continuing to use SplitSheet.
              </p>
            </div>
          </div>

          <div className="overflow-y-auto px-6 py-4 space-y-6 flex-1">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Terms of Service</h3>
              <div className="text-sm text-muted-foreground">
                <TermsContent />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Privacy Policy</h3>
              <div className="text-sm text-muted-foreground">
                <PrivacyContent />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                data-testid="checkbox-accept-terms"
              />
              <span className="text-foreground">
                I have read and agree to the Terms of Service and Privacy Policy
                (version {status.currentVersion}).
              </span>
            </label>
            <Button
              className="w-full"
              disabled={!checked || acceptMutation.isPending}
              onClick={() => acceptMutation.mutate()}
              data-testid="button-accept-terms"
            >
              {acceptMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</>
              ) : (
                "Accept & Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
