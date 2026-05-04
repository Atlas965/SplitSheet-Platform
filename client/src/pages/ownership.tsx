import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Music, Plus, TrendingUp, DollarSign, History, Users, ChevronRight,
  BarChart3, Clock, CheckCircle2, AlertCircle, Home, MoreVertical,
  Archive, ArchiveRestore, PowerOff, Trash2, Activity, Eye, Shield,
} from "lucide-react";

interface SongAsset {
  id: string;
  title: string;
  artistName: string | null;
  isrc: string | null;
  iswc: string | null;
  type: string | null;
  status: string;
  archivedAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OwnershipRecord {
  id: string;
  assetId: string;
  userId: string;
  ownershipPercentage: string;
  role: string;
  version: number;
  changeReason: string | null;
  effectiveAt: string;
  createdAt: string;
}

interface RevenueEvent {
  id: string;
  assetId: string;
  source: string;
  amount: string;
  currency: string;
  description: string | null;
  createdAt: string;
}

interface UserBalance {
  totalEarned: string;
  totalPaid: string;
  pendingBalance: string;
  currency: string;
}

interface ActivityLog {
  id: string;
  assetId: string;
  userId: string;
  action: string;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

const REVENUE_SOURCES = ["streaming", "sync", "performance", "mechanical", "other"];

const sourceColor: Record<string, string> = {
  streaming: "bg-blue-100 text-blue-700",
  sync:      "bg-purple-100 text-purple-700",
  performance: "bg-green-100 text-green-700",
  mechanical: "bg-orange-100 text-orange-700",
  other:     "bg-gray-100 text-gray-700",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "active":       return <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>;
    case "archived":     return <Badge className="bg-yellow-100 text-yellow-700 text-xs">Archived</Badge>;
    case "deactivated":  return <Badge className="bg-red-100 text-red-700 text-xs">Deactivated</Badge>;
    default:             return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

const actionLabel: Record<string, string> = {
  created:           "Asset created",
  archived:          "Archived",
  restored:          "Restored to active",
  deactivated:       "Deactivated",
  deleted_draft:     "Draft deleted",
  ownership_updated: "Ownership updated",
  revenue_recorded:  "Revenue recorded",
  payout_executed:   "Payout executed",
};

export default function Ownership() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const [selectedAsset, setSelectedAsset] = useState<SongAsset | null>(null);
  const [tab, setTab]           = useState<"active" | "archived">("active");
  const [showAddAsset, setShowAddAsset]   = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [showHistory, setShowHistory]     = useState(false);
  const [showActivity, setShowActivity]   = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<SongAsset | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SongAsset | null>(null);
  const [deleteDraftTarget, setDeleteDraftTarget] = useState<SongAsset | null>(null);

  const [newAsset, setNewAsset] = useState({ title: "", artistName: "", isrc: "", iswc: "", type: "master" });
  const [newRevenue, setNewRevenue] = useState({ source: "streaming", amount: "", description: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: activeAssets = [], isLoading: assetsLoading } = useQuery<SongAsset[]>({
    queryKey: ["/api/assets"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: archivedAssets = [] } = useQuery<SongAsset[]>({
    queryKey: ["/api/assets/archived"],
    enabled: isAuthenticated && tab === "archived",
    retry: false,
  });

  const assets = tab === "archived" ? archivedAssets : activeAssets;

  const { data: ownership = [], isLoading: ownershipLoading } = useQuery<OwnershipRecord[]>({
    queryKey: ["/api/assets", selectedAsset?.id, "ownership"],
    queryFn: () => fetch(`/api/assets/${selectedAsset!.id}/ownership`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedAsset,
    retry: false,
  });

  const { data: ownershipHistory = [] } = useQuery<OwnershipRecord[]>({
    queryKey: ["/api/assets", selectedAsset?.id, "ownership", "history"],
    queryFn: () => fetch(`/api/assets/${selectedAsset!.id}/ownership/history`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedAsset && showHistory,
    retry: false,
  });

  const { data: revenue = [] } = useQuery<RevenueEvent[]>({
    queryKey: ["/api/assets", selectedAsset?.id, "revenue"],
    queryFn: () => fetch(`/api/assets/${selectedAsset!.id}/revenue`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedAsset,
    retry: false,
  });

  const { data: activityLog = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/assets", selectedAsset?.id, "activity"],
    queryFn: () => fetch(`/api/assets/${selectedAsset!.id}/activity`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedAsset && showActivity,
    retry: false,
  });

  const { data: earnings } = useQuery<{ balance: UserBalance | null; payouts: any[] }>({
    queryKey: ["/api/earnings"],
    enabled: isAuthenticated,
    retry: false,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createAssetMutation = useMutation({
    mutationFn: (data: typeof newAsset) => apiRequest("POST", "/api/assets", data),
    onSuccess: (asset: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setShowAddAsset(false);
      setNewAsset({ title: "", artistName: "", isrc: "", iswc: "", type: "master" });
      setSelectedAsset(asset);
      toast({ title: "Song Asset Created", description: `"${asset.title}" is now in your Rights Ledger.` });
    },
    onError: () => toast({ title: "Error", description: "Failed to create asset.", variant: "destructive" }),
  });

  const recordRevenueMutation = useMutation({
    mutationFn: (data: typeof newRevenue) => apiRequest("POST", `/api/assets/${selectedAsset!.id}/revenue`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", selectedAsset?.id, "revenue"] });
      setShowAddRevenue(false);
      setNewRevenue({ source: "streaming", amount: "", description: "" });
      toast({ title: "Revenue Recorded", description: "Income has been logged." });
    },
    onError: () => toast({ title: "Error", description: "Failed to record revenue.", variant: "destructive" }),
  });

  const executePayoutsMutation = useMutation({
    mutationFn: (eventId: string) => apiRequest("POST", `/api/revenue/${eventId}/payouts/execute`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/earnings"] });
      toast({ title: "Payouts Executed", description: "Earnings distributed to all stakeholders." });
    },
    onError: () => toast({ title: "Error", description: "Failed to execute payouts.", variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/assets/${id}/archive`, {}),
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      if (selectedAsset?.id === updated.id) setSelectedAsset(null);
      setArchiveTarget(null);
      toast({ title: "Asset Archived", description: "Removed from active dashboard. History preserved." });
    },
    onError: () => toast({ title: "Error", description: "Failed to archive.", variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/assets/${id}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets/archived"] });
      toast({ title: "Asset Restored", description: "Asset is now active again." });
    },
    onError: () => toast({ title: "Error", description: "Failed to restore.", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/assets/${id}/deactivate`, {}),
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      if (selectedAsset?.id === updated.id) setSelectedAsset(null);
      setDeactivateTarget(null);
      toast({ title: "Asset Deactivated", description: "Payouts and new revenue entries paused." });
    },
    onError: () => toast({ title: "Error", description: "Failed to deactivate.", variant: "destructive" }),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/assets/${id}/draft`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setSelectedAsset(null);
      setDeleteDraftTarget(null);
      toast({ title: "Draft Deleted", description: "Asset has been removed." });
    },
    onError: (e: any) => toast({ title: "Cannot Delete", description: e.message || "Asset has revenue or ownership records.", variant: "destructive" }),
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalRevenue = revenue.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Logo />
              <span className="text-xl font-bold text-primary">SplitSheet</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/"><Home className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Rights Ledger</h1>
            <p className="text-muted-foreground mt-1">
              Music ownership cap table — track splits, revenue, and payouts for every song.
            </p>
          </div>
          <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-asset">
                <Plus className="h-4 w-4 mr-2" /> Add Song Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register a Song Asset</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asset-title">Song Title *</Label>
                  <Input id="asset-title" placeholder="e.g. Midnight Drive"
                    value={newAsset.title} onChange={e => setNewAsset({ ...newAsset, title: e.target.value })}
                    data-testid="input-asset-title" />
                </div>
                <div>
                  <Label htmlFor="asset-artist">Artist / Project Name</Label>
                  <Input id="asset-artist" placeholder="e.g. The Band"
                    value={newAsset.artistName} onChange={e => setNewAsset({ ...newAsset, artistName: e.target.value })}
                    data-testid="input-asset-artist" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="asset-isrc">ISRC Code</Label>
                    <Input id="asset-isrc" placeholder="e.g. USRC11600001"
                      value={newAsset.isrc} onChange={e => setNewAsset({ ...newAsset, isrc: e.target.value })}
                      data-testid="input-asset-isrc" />
                  </div>
                  <div>
                    <Label htmlFor="asset-iswc">ISWC Code</Label>
                    <Input id="asset-iswc" placeholder="e.g. T-034.524.680-1"
                      value={newAsset.iswc} onChange={e => setNewAsset({ ...newAsset, iswc: e.target.value })}
                      data-testid="input-asset-iswc" />
                  </div>
                </div>
                <div>
                  <Label>Asset Type</Label>
                  <Select value={newAsset.type} onValueChange={v => setNewAsset({ ...newAsset, type: v })}>
                    <SelectTrigger data-testid="select-asset-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="master">Master Recording</SelectItem>
                      <SelectItem value="composition">Composition</SelectItem>
                      <SelectItem value="split_sheet">Split Sheet</SelectItem>
                      <SelectItem value="agreement">Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>
                  <Button onClick={() => createAssetMutation.mutate(newAsset)}
                    disabled={!newAsset.title || createAssetMutation.isPending} data-testid="button-confirm-add-asset">
                    {createAssetMutation.isPending ? "Creating..." : "Create Asset"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Earnings Summary */}
        {earnings?.balance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Earned", value: `$${parseFloat(earnings.balance.totalEarned).toFixed(2)}`, icon: <DollarSign className="h-5 w-5 text-green-600" />, bg: "bg-green-100" },
              { label: "Pending Balance", value: `$${parseFloat(earnings.balance.pendingBalance).toFixed(2)}`, icon: <TrendingUp className="h-5 w-5 text-blue-600" />, bg: "bg-blue-100" },
              { label: "Total Paid Out", value: `$${parseFloat(earnings.balance.totalPaid).toFixed(2)}`, icon: <CheckCircle2 className="h-5 w-5 text-purple-600" />, bg: "bg-purple-100" },
            ].map(c => (
              <Card key={c.label}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center`}>{c.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-2xl font-bold">{c.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Asset List ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Music className="h-4 w-4" /> Song Assets
              </h2>
            </div>

            {/* Status Tabs */}
            <Tabs value={tab} onValueChange={v => { setTab(v as any); setSelectedAsset(null); }}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="active" data-testid="tab-active-assets">Active</TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived-assets">Archived</TabsTrigger>
              </TabsList>
            </Tabs>

            {assetsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : assets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Music className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{tab === "archived" ? "No archived assets." : "No song assets yet."}</p>
                  {tab === "active" && <p className="text-xs mt-1">Add a song to start tracking ownership.</p>}
                </CardContent>
              </Card>
            ) : (
              assets.map(asset => (
                <Card key={asset.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedAsset?.id === asset.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => { setSelectedAsset(asset); setShowHistory(false); setShowActivity(false); }}
                  data-testid={`card-asset-${asset.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.title}</p>
                        {asset.artistName && <p className="text-xs text-muted-foreground">{asset.artistName}</p>}
                        {asset.isrc && <p className="text-[10px] text-muted-foreground font-mono mt-1">{asset.isrc}</p>}
                        <div className="mt-2">{statusBadge(asset.status)}</div>
                      </div>

                      {/* Actions dropdown — stop propagation so card click doesn't fire */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" data-testid={`button-asset-actions-${asset.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52" onClick={e => e.stopPropagation()}>
                          <DropdownMenuLabel>Asset Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelectedAsset(asset)} data-testid={`action-view-${asset.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Ledger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {asset.status === "active" && (
                            <>
                              <DropdownMenuItem onClick={() => setArchiveTarget(asset)} data-testid={`action-archive-${asset.id}`}>
                                <Archive className="mr-2 h-4 w-4" /> Archive Asset
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeactivateTarget(asset)} className="text-orange-600 focus:text-orange-600" data-testid={`action-deactivate-${asset.id}`}>
                                <PowerOff className="mr-2 h-4 w-4" /> Deactivate Asset
                              </DropdownMenuItem>
                            </>
                          )}
                          {asset.status === "archived" && (
                            <DropdownMenuItem onClick={() => restoreMutation.mutate(asset.id)} data-testid={`action-restore-${asset.id}`}>
                              <ArchiveRestore className="mr-2 h-4 w-4" /> Restore Asset
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-red-600">Danger Zone</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => setDeleteDraftTarget(asset)}
                            className="text-red-600 focus:text-red-600"
                            data-testid={`action-delete-${asset.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Draft Asset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* ── Asset Detail Panel ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedAsset ? (
              <Card className="border-dashed h-64 flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>Select a song asset to view its cap table</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Asset Header */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedAsset.title}</CardTitle>
                        {selectedAsset.artistName && <p className="text-sm text-muted-foreground">{selectedAsset.artistName}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(selectedAsset.status)}
                        {selectedAsset.status === "archived" && (
                          <Button size="sm" variant="outline" onClick={() => restoreMutation.mutate(selectedAsset.id)} disabled={restoreMutation.isPending} data-testid="button-restore-asset">
                            <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restore
                          </Button>
                        )}
                        {selectedAsset.status === "deactivated" && (
                          <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1">
                            <PowerOff className="h-3 w-3" /> Payouts paused
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Total Revenue</p>
                        <p className="font-semibold text-lg">${totalRevenue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Stakeholders</p>
                        <p className="font-semibold text-lg">{ownership.length}</p>
                      </div>
                      {selectedAsset.isrc && (
                        <div>
                          <p className="text-muted-foreground text-xs">ISRC</p>
                          <p className="font-mono text-xs font-semibold mt-0.5">{selectedAsset.isrc}</p>
                        </div>
                      )}
                      {selectedAsset.iswc && (
                        <div>
                          <p className="text-muted-foreground text-xs">ISWC</p>
                          <p className="font-mono text-xs font-semibold mt-0.5">{selectedAsset.iswc}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Deactivated notice */}
                {selectedAsset.status === "deactivated" && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4 flex items-start gap-3">
                      <PowerOff className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800">Asset Deactivated</p>
                        <p className="text-xs text-orange-700 mt-0.5">
                          New revenue entries and payout runs are paused. All historical records remain intact.
                          {selectedAsset.deactivatedAt && ` Deactivated on ${new Date(selectedAsset.deactivatedAt).toLocaleDateString()}.`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Ownership Cap Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" /> Cap Table
                      {ownership.length > 0 && (
                        <Badge variant="outline" className="text-xs">v{ownership[0]?.version}</Badge>
                      )}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} data-testid="button-toggle-history">
                      <History className="h-4 w-4 mr-1" />
                      {showHistory ? "Hide History" : "Audit Trail"}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ownershipLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : ownership.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        <Users className="h-6 w-6 mx-auto mb-2 opacity-30" />
                        No ownership records yet. Use your contracts to auto-generate splits.
                      </div>
                    ) : (
                      ownership.map(record => (
                        <div key={record.id} className="space-y-1" data-testid={`ownership-row-${record.id}`}>
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium font-mono text-xs">{record.userId.slice(0, 8)}…</span>
                              <Badge variant="outline" className="ml-2 text-[10px]">{record.role}</Badge>
                            </div>
                            <span className="font-bold">{parseFloat(record.ownershipPercentage).toFixed(2)}%</span>
                          </div>
                          <Progress value={parseFloat(record.ownershipPercentage)} className="h-2" />
                        </div>
                      ))
                    )}

                    {/* Ownership Validation */}
                    {ownership.length > 0 && (() => {
                      const total = ownership.reduce((s, r) => s + parseFloat(r.ownershipPercentage), 0);
                      const isValid = Math.abs(total - 100) < 0.01;
                      return (
                        <div className={`flex items-center gap-2 text-xs mt-2 p-2 rounded-lg ${isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {isValid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          {isValid ? "Ownership totals 100% — valid" : `Total is ${total.toFixed(2)}% — must equal 100%`}
                        </div>
                      );
                    })()}

                    {/* Audit History */}
                    {showHistory && ownershipHistory.length > 0 && (
                      <div className="mt-4 border-t pt-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audit Trail</p>
                        {ownershipHistory.map(h => (
                          <div key={h.id} className="flex items-center gap-3 text-xs text-muted-foreground p-2 bg-muted rounded-lg">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>v{h.version} · {h.role} · {parseFloat(h.ownershipPercentage).toFixed(2)}%</span>
                            {h.changeReason && <span className="italic">— {h.changeReason}</span>}
                            <span className="ml-auto">{new Date(h.effectiveAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue Events */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Revenue Events
                    </CardTitle>
                    {selectedAsset.status === "active" && (
                      <Dialog open={showAddRevenue} onOpenChange={setShowAddRevenue}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid="button-add-revenue">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Record Income
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Record Revenue Event</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Source</Label>
                              <Select value={newRevenue.source} onValueChange={v => setNewRevenue({ ...newRevenue, source: v })}>
                                <SelectTrigger data-testid="select-revenue-source"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {REVENUE_SOURCES.map(s => (
                                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Amount (USD)</Label>
                              <Input type="number" min="0" step="0.01" placeholder="e.g. 250.00"
                                value={newRevenue.amount} onChange={e => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                                data-testid="input-revenue-amount" />
                            </div>
                            <div>
                              <Label>Description (optional)</Label>
                              <Input placeholder="e.g. Spotify Q1 2026"
                                value={newRevenue.description} onChange={e => setNewRevenue({ ...newRevenue, description: e.target.value })}
                                data-testid="input-revenue-description" />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setShowAddRevenue(false)}>Cancel</Button>
                              <Button onClick={() => recordRevenueMutation.mutate(newRevenue)}
                                disabled={!newRevenue.amount || recordRevenueMutation.isPending} data-testid="button-confirm-revenue">
                                {recordRevenueMutation.isPending ? "Saving..." : "Record Revenue"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {revenue.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        No revenue events yet. Record income to auto-calculate stakeholder splits.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {/* Revenue by source bar */}
                        {(() => {
                          const bySource: Record<string, number> = {};
                          revenue.forEach(e => { bySource[e.source] = (bySource[e.source] || 0) + parseFloat(e.amount); });
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                              {Object.entries(bySource).map(([src, amt]) => (
                                <div key={src} className={`rounded-lg px-3 py-2 text-xs font-medium ${sourceColor[src] ?? "bg-gray-100 text-gray-700"}`}>
                                  <span className="capitalize">{src}</span>
                                  <span className="float-right font-bold">${amt.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {revenue.map(event => (
                          <div key={event.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`revenue-row-${event.id}`}>
                            <div className="flex items-center gap-3">
                              <Badge className={sourceColor[event.source] ?? "bg-gray-100 text-gray-700"}>{event.source}</Badge>
                              <div>
                                <p className="text-sm font-medium">${parseFloat(event.amount).toFixed(2)} {event.currency}</p>
                                {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleDateString()}</span>
                              {selectedAsset.status === "active" && (
                                <Button size="sm" variant="outline" className="text-xs h-7"
                                  onClick={() => executePayoutsMutation.mutate(event.id)}
                                  disabled={executePayoutsMutation.isPending}
                                  data-testid={`button-execute-payout-${event.id}`}>
                                  Distribute
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Log */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Activity Log
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowActivity(!showActivity)} data-testid="button-toggle-activity">
                      {showActivity ? "Hide" : "Show"} Log
                    </Button>
                  </CardHeader>
                  {showActivity && (
                    <CardContent className="space-y-2">
                      {activityLog.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">No activity recorded yet.</p>
                      ) : (
                        activityLog.map(log => (
                          <div key={log.id} className="flex items-start gap-3 text-xs p-2 bg-muted rounded-lg">
                            <Shield className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-medium">{actionLabel[log.action] ?? log.action}</span>
                              {log.ipAddress && <span className="text-muted-foreground ml-2">· IP: {log.ipAddress}</span>}
                            </div>
                            <span className="text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Archive Confirmation Modal ────────────────────────────────── */}
      <AlertDialog open={!!archiveTarget} onOpenChange={o => { if (!o) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive "{archiveTarget?.title}"?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">
            This removes the asset from your active dashboard while fully preserving all ownership records,
            payout history, and legal documentation. You can restore it at any time.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">Cancel</AlertDialogCancel>
            <Button onClick={() => archiveMutation.mutate(archiveTarget!.id)}
              disabled={archiveMutation.isPending} data-testid="button-confirm-archive">
              {archiveMutation.isPending ? "Archiving..." : "Archive Asset"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Deactivate Confirmation Modal ─────────────────────────────── */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={o => { if (!o) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate "{deactivateTarget?.title}"?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 px-1">
            <p className="text-sm text-muted-foreground">
              Deactivating an asset pauses all new revenue entries and payout runs. All existing history is preserved.
            </p>
            <p className="text-xs text-orange-700 font-medium bg-orange-50 rounded-lg p-2">
              New income cannot be logged while the asset is deactivated. Collaborator payouts will be suspended.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deactivate">Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deactivateMutation.mutate(deactivateTarget!.id)}
              disabled={deactivateMutation.isPending} data-testid="button-confirm-deactivate">
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate Asset"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Draft Confirmation Modal ───────────────────────────── */}
      <AlertDialog open={!!deleteDraftTarget} onOpenChange={o => { if (!o) setDeleteDraftTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft "{deleteDraftTarget?.title}"?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 px-1">
            <p className="text-sm text-muted-foreground">
              This action is only permitted for draft assets with no signatures, revenue, or finalized ownership records.
            </p>
            <p className="text-xs text-red-700 font-medium bg-red-50 rounded-lg p-2">
              Even draft deletes are recorded in the audit trail. Signed agreements and revenue records can never be deleted.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-draft">Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deleteDraftMutation.mutate(deleteDraftTarget!.id)}
              disabled={deleteDraftMutation.isPending} data-testid="button-confirm-delete-draft">
              {deleteDraftMutation.isPending ? "Deleting..." : "Delete Draft"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
