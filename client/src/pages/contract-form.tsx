import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ContractForm from "@/components/ContractForm";
import DynamicAgreementForm from "@/components/DynamicAgreementForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LEGAL_DISCLAIMER } from "@shared/agreement-catalog";

const LEGACY_TYPES = ["split-sheet", "performance", "producer", "management"] as const;
type LegacyType = (typeof LEGACY_TYPES)[number];

function isLegacyType(t: string | undefined): t is LegacyType {
  return LEGACY_TYPES.includes(t as LegacyType);
}

const LEGACY_TITLES: Record<LegacyType, string> = {
  "split-sheet": "Create Split Sheet Agreement",
  performance: "Create Performance Agreement",
  producer: "Create Producer Agreement",
  management: "Create Management Agreement",
};

type TemplateRow = {
  id: string;
  name: string;
  type: string;
  version?: string | null;
  status?: string | null;
  legalReviewStatus?: string | null;
  riskLevel?: string | null;
  category?: string | null;
  template?: {
    fields?: any[];
    sections?: Array<{ id: string; title: string }>;
  };
};

export default function ContractFormPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { type } = useParams<{ type: string }>();
  const [, setLocation] = useLocation();
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Session expired",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: template, isLoading: templateLoading, error: templateError } = useQuery<TemplateRow>({
    queryKey: [`/api/templates/by-type/${type}`],
    enabled: Boolean(isAuthenticated && type),
    retry: false,
  });

  const createContractMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/contracts", payload);
      return res.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: "Agreement created",
        description: "Saved successfully. Continue confirmation and signature from the contract page.",
      });
      if (result?.id) setLocation(`/contracts/${result.id}`);
      else setLocation("/contracts");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Could not create agreement",
        description: error instanceof Error ? error.message : "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const handleLegacySubmit = (data: any) => {
    if (!isLegacyType(type)) return;
    createContractMutation.mutate({
      title: data.title || `${LEGACY_TITLES[type]} — ${new Date().toLocaleDateString("en-CA")}`,
      type,
      status: data.saveAsDraft ? "draft" : "pending",
      data,
      templateId: template?.id,
      metadata: { contractType: type, createdFrom: "template" },
    });
  };

  const handleDynamicSubmit = (asDraft: boolean) => {
    if (!type || !template) return;
    const title =
      values.title ||
      values.songTitle ||
      values.recordingTitle ||
      `${template.name} — ${new Date().toLocaleDateString("en-CA")}`;
    createContractMutation.mutate({
      title,
      type,
      status: asDraft ? "draft" : "pending",
      data: values,
      templateId: template.id,
      templateVersion: template.version,
      metadata: {
        contractType: type,
        createdFrom: "template",
        templateVersion: template.version,
        legalReviewStatus: template.legalReviewStatus,
      },
    });
  };

  const handleCancel = () => setLocation("/templates");

  if (isLoading || !isAuthenticated || templateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!template || templateError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <h1 className="text-2xl font-bold text-foreground">Unknown agreement type</h1>
          <p className="text-muted-foreground">"{type}" is not in the template library.</p>
          <Link
            href="/templates"
            className="inline-block bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            ← Browse templates
          </Link>
        </div>
      </div>
    );
  }

  const useLegacyForm = isLegacyType(type);
  const fields = template.template?.fields || [];

  return (
    <div className="bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link
            href="/templates"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Agreement Templates
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <Badge variant="secondary">{template.status}</Badge>
            <Badge variant="outline">v{template.version || "1.0"}</Badge>
            <Badge variant="outline">{template.legalReviewStatus || "NOT_REVIEWED"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{LEGAL_DISCLAIMER}</p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <p className="text-sm text-muted-foreground">
              Complete transaction details, then continue into confirmation / signature from the contract record.
              This integrates with the existing operator workflow — it does not bypass review or confirmation stages.
            </p>
          </div>

          <div className="p-6">
            {useLegacyForm ? (
              <ContractForm
                contractType={type}
                onSubmit={handleLegacySubmit}
                onCancel={handleCancel}
                isLoading={createContractMutation.isPending}
                data-testid="contract-form"
              />
            ) : (
              <div className="space-y-6">
                <DynamicAgreementForm
                  fields={fields}
                  sections={template.template?.sections}
                  values={values}
                  onChange={setValues}
                  disabled={createContractMutation.isPending}
                />
                <div className="flex flex-wrap gap-3 justify-end border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={createContractMutation.isPending}
                    onClick={() => handleDynamicSubmit(true)}
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    disabled={createContractMutation.isPending}
                    onClick={() => handleDynamicSubmit(false)}
                  >
                    Create Agreement
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
