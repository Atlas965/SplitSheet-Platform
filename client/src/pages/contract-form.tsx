import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Logo from "@/components/Logo";
import ContractForm from "@/components/ContractForm";

export default function ContractFormPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { type } = useParams<{ type: string }>();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<any>({});

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

  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/contracts", data);
    },
    onSuccess: () => {
      toast({
        title: "Contract Created",
        description: "Your contract has been created successfully.",
      });
      setLocation("/contracts");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getContractTitle = (contractType: string) => {
    switch (contractType) {
      case "split-sheet":
        return "Create Split Sheet Agreement";
      case "performance":
        return "Create Performance Agreement";
      case "producer":
        return "Create Producer Agreement";
      case "management":
        return "Create Management Agreement";
      default:
        return "Create Contract";
    }
  };

  const handleSubmit = (data: any) => {
    createContractMutation.mutate({
      title: data.title || `${getContractTitle(type!)} - ${new Date().toLocaleDateString()}`,
      type: type,
      status: data.saveAsDraft ? "draft" : "pending",
      data: data,
      metadata: {
        contractType: type,
        createdFrom: "template",
      }
    });
  };

  const handleCancel = () => {
    setLocation("/templates");
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!type) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Contract Type</h1>
          <p className="text-muted-foreground">Please select a valid contract template.</p>
        </div>
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

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-card border-b border-border p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold" data-testid="contract-form-title">
                {getContractTitle(type)}
              </h2>
              <button 
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-close-form"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>
          
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
      </div>
    </div>
  );
}
