import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import ContractForm from "@/components/ContractForm";

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function ContractEdit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

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

  const { data: contract, isLoading: contractLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", id],
    enabled: !!id && isAuthenticated,
    retry: false,
  });

  const updateContractMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/contracts/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Contract Updated",
        description: "Your contract has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id] });
      setLocation(`/contracts/${id}`);
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
        description: "Failed to update contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getContractTitle = (contractType: string) => {
    switch (contractType) {
      case "split-sheet":
        return "Edit Split Sheet Agreement";
      case "performance":
        return "Edit Performance Agreement";
      case "producer":
        return "Edit Producer Agreement";
      case "management":
        return "Edit Management Agreement";
      default:
        return "Edit Contract";
    }
  };

  const handleSubmit = (data: any) => {
    updateContractMutation.mutate({
      title: data.title || contract?.title,
      status: data.saveAsDraft ? "draft" : "pending",
      data: data,
      metadata: {
        contractType: contract?.type,
        lastModified: new Date().toISOString(),
      }
    });
  };

  const handleCancel = () => {
    setLocation(`/contracts/${id}`);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (contractLoading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Logo />
                <span className="text-xl font-bold text-primary">SplitSheet</span>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Logo />
                <span className="text-xl font-bold text-primary">SplitSheet</span>
              </div>
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Contract Not Found</h2>
            <p className="text-muted-foreground mb-4">The contract you're looking for doesn't exist or you don't have access to it.</p>
            <Link href="/contracts">
              <Button>Back to Contracts</Button>
            </Link>
          </div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/contracts" className="text-muted-foreground hover:text-foreground">
                  Contracts
                </Link>
              </li>
              <li>
                <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
              </li>
              <li>
                <Link href={`/contracts/${id}`} className="text-muted-foreground hover:text-foreground">
                  {contract.title}
                </Link>
              </li>
              <li>
                <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
              </li>
              <li>
                <span className="text-foreground font-medium">Edit</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="page-title">
                {getContractTitle(contract.type)}
              </h1>
              <p className="text-muted-foreground">
                Update the contract details below. Changes will be saved when you submit the form.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link href={`/contracts/${id}`}>
                <Button variant="outline" data-testid="button-cancel">
                  <i className="fas fa-times mr-2"></i>
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Contract Form */}
        <div className="bg-card rounded-xl border border-border">
          <ContractForm
            contractType={contract.type}
            initialData={contract.data}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={updateContractMutation.isPending}
            isEdit={true}
          />
        </div>
      </div>
    </div>
  );
}