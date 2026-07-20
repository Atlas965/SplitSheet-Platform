/**
 * TermsGate.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Blocks the authenticated app shell until the operator has affirmatively
 * accepted the current Terms of Service / Privacy Policy. Backed by
 * server/compliance-routes.ts (GET/POST /api/user/terms-status,
 * /api/user/accept-terms) and server/legal-routes.ts (GET
 * /api/legal/documents/:docType/latest). Every other authenticated API route
 * is rejected server-side (403 TERMS_NOT_ACCEPTED) until acceptance is
 * recorded, so this gate is enforcement UI, not just a courtesy prompt.
 *
 * As of Priority 1.1, the ToS/Privacy text itself is data-driven — published
 * via the admin-only POST /api/legal/documents route (counsel-editable,
 * no code deploy required) — rather than hardcoded as React components.
 * Publishing a new version automatically re-triggers this gate for every
 * user, since `status.accepted` becomes false again the moment the version
 * on the server changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LegalMarkdown } from "@/lib/legalMarkdown";
import { useAuth } from "@/hooks/useAuth";

interface DocAcceptanceStatus {
  docType: "tos" | "privacy";
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  accepted: boolean;
}

interface TermsStatus {
  tos: DocAcceptanceStatus;
  privacy: DocAcceptanceStatus;
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  accepted: boolean;
}

interface LegalDocument {
  docType: string;
  version: string;
  effectiveDate: string;
  markdownBody: string;
  publishedAt: string;
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

  const needsGate = isAuthenticated && !!status && !status.accepted;

  // Only fetch the (potentially large) markdown bodies once we know the
  // gate needs to be shown — no point loading them on every authenticated
  // page load once a user is already current.
  const { data: tosDoc, isLoading: tosLoading } = useQuery<LegalDocument>({
    queryKey: ["/api/legal/documents/tos/latest"],
    enabled: needsGate,
  });
  const { data: privacyDoc, isLoading: privacyLoading } = useQuery<LegalDocument>({
    queryKey: ["/api/legal/documents/privacy/latest"],
    enabled: needsGate,
  });

  // IMPORTANT: all hooks must run unconditionally on every render (Rules of
  // Hooks) — this mutation must be declared before any early `return` below,
  // otherwise toggling `isAuthenticated` changes the hook count between
  // renders and React throws "Rendered more hooks than during the previous
  // render."
  const acceptMutation = useMutation({
    mutationFn: async () => {
      // Omitting docType accepts every gated doc type (tos + privacy) in one call.
      const res = await apiRequest("POST", "/api/user/accept-terms", {});
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

  if (needsGate) {
    const docsLoading = tosLoading || privacyLoading;
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
            {docsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-foreground">
                    Terms of Service {tosDoc ? `(version ${tosDoc.version})` : ""}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {tosDoc ? (
                      <LegalMarkdown markdown={tosDoc.markdownBody} />
                    ) : (
                      <p>Terms of Service text is not yet published. Please contact support.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-foreground">
                    Privacy Policy {privacyDoc ? `(version ${privacyDoc.version})` : ""}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {privacyDoc ? (
                      <LegalMarkdown markdown={privacyDoc.markdownBody} />
                    ) : (
                      <p>Privacy Policy text is not yet published. Please contact support.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                data-testid="checkbox-accept-terms"
              />
              <span className="text-foreground">
                I have read and agree to the Terms of Service (version {status.tos.currentVersion}) and
                Privacy Policy (version {status.privacy.currentVersion}).
              </span>
            </label>
            <Button
              className="w-full"
              disabled={!checked || acceptMutation.isPending || docsLoading}
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
