import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ContractForm from "@/components/ContractForm";

// All valid contract types the form supports
const VALID_TYPES = ["split-sheet", "performance", "producer", "management"] as const;
type ContractType = typeof VALID_TYPES[number];

function isValidType(t: string | undefined): t is ContractType {
  return VALID_TYPES.includes(t as ContractType);
}

const CONTRACT_TITLES: Record<ContractType, string> = {
  "split-sheet":  "Create Split Sheet Agreement",
  "performance":  "Create Performance Agreement",
  "producer":     "Create Producer Agreement",
  "management":   "Create Management Agreement",
};

export default function ContractFormPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { type } = useParams<{ type: string }>();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Session expired",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  // Redirect invalid type to templates page
  useEffect(() => {
    if (!isLoading && isAuthenticated && type && !isValidType(type)) {
      toast({
        title: "Invalid contract type",
        description: `"${type}" is not a valid contract type. Redirecting to templates.`,
        variant: "destructive",
      });
      setLocation("/templates");
    }
  }, [isLoading, isAuthenticated, type, toast, setLocation]);

  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/contracts", data);
    },
    onSuccess: (result: any) => {
      toast({
        title: "Contract created",
        description: "Your contract has been saved successfully.",
      });
      // Navigate to the new contract's detail page if ID is available
      if (result?.id) {
        setLocation(`/contracts/${result.id}`);
      } else {
        setLocation("/contracts");
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Could not create contract",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    if (!isValidType(type)) return;
    createContractMutation.mutate({
      title: data.title || `${CONTRACT_TITLES[type]} — ${new Date().toLocaleDateString("en-CA")}`,
      type,
      status: data.saveAsDraft ? "draft" : "pending",
      data,
      metadata: { contractType: type, createdFrom: "template" },
    });
  };

  const handleCancel = () => setLocation("/templates");

  // Loading state
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

  // Invalid / missing type — show while redirect is in-flight
  if (!isValidType(type)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <h1 className="text-2xl font-bold text-foreground">Unknown contract type</h1>
          <p className="text-muted-foreground">
            "{type}" is not a recognised contract type.
          </p>
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

  return (
    <div className="bg-background">
      {/* Form body */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link
            href="/templates"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Templates
          </Link>
          <h1 className="text-2xl font-bold mt-2">{CONTRACT_TITLES[type]}</h1>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">

          {/* Form header */}
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-2xl font-bold text-foreground"
                  data-testid="contract-form-title"
                >
                  {CONTRACT_TITLES[type]}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Fill in the details below. You can save as a draft at any time.
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
                data-testid="button-close-form"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            {/* Type badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {VALID_TYPES.map((t) => (
                <Link
                  key={t}
                  href={`/contract/${t}`}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    t === type
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-muted text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  {t.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="p-6">
            <ContractForm
              contractType={type}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={createContractMutation.isPending}
              data-testid="contract-form"
            />
          </div>
        </div>

        {/* Legal note */}
        <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
          SplitSheet provides tools to help document agreements between parties.
          For complex arrangements, consult a qualified music industry lawyer.
          Governed by Ontario, Canada law · SoundLedger Technologies Inc.
        </p>
      </div>
    </div>
  );
}