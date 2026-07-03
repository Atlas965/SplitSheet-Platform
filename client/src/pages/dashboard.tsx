import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Plus, Bell, Upload, Download, Trash2, BookOpen } from "lucide-react";

interface DashboardStats {
  totalContracts: number;
  pendingSignatures: number;
  completedThisMonth: number;
  revenueSplit: number;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    retry: false,
  });

  const deleteContractMutation = useMutation({
    mutationFn: (contractId: string) => apiRequest("DELETE", `/api/contracts/${contractId}`, {}),
    onSuccess: () => {
      toast({
        title: "Contract deleted",
        description: "The contract has been removed from recent activity.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header + quick actions */}
        <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your command center for clients, projects, and agreements</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild className="btn-primary btn-sm" data-testid="btn-new-contract">
              <Link href="/contract/new">
                <Plus className="mr-1 h-3 w-3" />
                New Contract
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild data-testid="quick-notifications">
              <Link href="/notifications">
                <Bell className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Contracts"
            value={statsLoading ? "..." : (stats?.totalContracts || 0).toString()}
            icon="fas fa-file-contract"
            iconBg="bg-accent/10"
            iconColor="text-accent"
            data-testid="stat-total-contracts"
          />
          <StatCard
            title="Pending Signatures"
            value={statsLoading ? "..." : (stats?.pendingSignatures || 0).toString()}
            icon="fas fa-clock"
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
            data-testid="stat-pending-signatures"
          />
          <StatCard
            title="Completed This Month"
            value={statsLoading ? "..." : (stats?.completedThisMonth || 0).toString()}
            icon="fas fa-check"
            iconBg="bg-green-100"
            iconColor="text-green-600"
            data-testid="stat-completed-month"
          />
          <StatCard
            title="Revenue Split"
            value={statsLoading ? "..." : `$${stats?.revenueSplit || 0}`}
            icon="fas fa-dollar-sign"
            iconBg="bg-green-100"
            iconColor="text-green-600"
            data-testid="stat-revenue-split"
          />
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4" data-testid="recent-activity">
              {contractsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : contracts && contracts.length > 0 ? (
                contracts.slice(0, 3).map((contract) => (
                  <div key={contract.id} className="flex items-center space-x-4 p-4 bg-muted rounded-lg group hover:bg-muted/80 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      contract.status === 'signed' ? 'bg-green-100' : 
                      contract.status === 'pending' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <i className={`fas ${
                        contract.status === 'signed' ? 'fa-check text-green-600' :
                        contract.status === 'pending' ? 'fa-clock text-yellow-600' : 'fa-plus text-blue-600'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{contract.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {contract.status === 'signed' ? 'Signed' : 
                         contract.status === 'pending' ? 'Pending signatures' : 'Created'} • 
                        {new Date(contract.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteContractMutation.mutate(contract.id)}
                      disabled={deleteContractMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 hover:text-red-600 rounded-lg"
                      data-testid={`button-delete-contract-${contract.id}`}
                      title="Delete contract"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-file-contract text-4xl mb-4"></i>
                  <p>No contracts yet. Create your first contract to get started!</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start space-x-3 p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90" data-testid="button-create-contract">
                <Link href="/templates">
                  <Plus className="h-4 w-4" />
                  <span>Create New Contract</span>
                </Link>
              </Button>

              <button 
                className="w-full flex items-center space-x-3 p-3 bg-muted text-muted-foreground rounded-lg hover:opacity-80 transition-opacity" 
                data-testid="button-upload-contract"
                onClick={() => {
                  toast({
                    title: "Upload Feature",
                    description: "Select a contract file to upload (PDF or Docx).",
                  });
                }}
              >
                <Upload className="h-4 w-4" />
                <span>Upload Existing Contract</span>
              </button>

              <button 
                className="w-full flex items-center space-x-3 p-3 bg-muted text-muted-foreground rounded-lg hover:opacity-80 transition-opacity" 
                data-testid="button-invite-collaborator"
                onClick={() => {
                  toast({
                    title: "Invite Collaborator",
                    description: "Enter email address to send invitation link.",
                  });
                }}
              >
                <Users className="h-4 w-4" />
                <span>Invite Collaborator</span>
              </button>

              <button 
                className="w-full flex items-center space-x-3 p-3 bg-muted text-muted-foreground rounded-lg hover:opacity-80 transition-opacity" 
                data-testid="button-export-contracts"
                onClick={() => {
                  toast({
                    title: "Export All Contracts",
                    description: "Your contract archive is being generated for download.",
                  });
                }}
              >
                <Download className="h-4 w-4" />
                <span>Export All Contracts</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}