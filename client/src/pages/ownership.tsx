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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Music, Plus, TrendingUp, DollarSign, History, Users, ChevronRight,
  BarChart3, Clock, CheckCircle2, AlertCircle, Home,
} from "lucide-react";

interface SongAsset {
  id: string;
  title: string;
  artistName: string | null;
  isrc: string | null;
  status: string;
  createdAt: string;
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

const REVENUE_SOURCES = ["streaming", "sync", "performance", "mechanical", "other"];
const ROLES = ["writer", "producer", "performer", "publisher", "co-writer"];

const sourceColor: Record<string, string> = {
  streaming: "bg-blue-100 text-blue-700",
  sync: "bg-purple-100 text-purple-700",
  performance: "bg-green-100 text-green-700",
  mechanical: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

export default function Ownership() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedAsset, setSelectedAsset] = useState<SongAsset | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newAsset, setNewAsset] = useState({ title: "", artistName: "", isrc: "" });
  const [newRevenue, setNewRevenue] = useState({ source: "streaming", amount: "", description: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: assets = [], isLoading: assetsLoading } = useQuery<SongAsset[]>({
    queryKey: ["/api/assets"],
    enabled: isAuthenticated,
    retry: false,
  });

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

  const { data: earnings } = useQuery<{ balance: UserBalance | null; payouts: any[] }>({
    queryKey: ["/api/earnings"],
    enabled: isAuthenticated,
    retry: false,
  });

  const createAssetMutation = useMutation({
    mutationFn: (data: typeof newAsset) => apiRequest("POST", "/api/assets", data),
    onSuccess: (asset: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setShowAddAsset(false);
      setNewAsset({ title: "", artistName: "", isrc: "" });
      setSelectedAsset(asset);
      toast({ title: "Song Asset Created", description: `"${asset.title}" is now in your rights ledger.` });
    },
    onError: () => toast({ title: "Error", description: "Failed to create asset.", variant: "destructive" }),
  });

  const recordRevenueMutation = useMutation({
    mutationFn: (data: typeof newRevenue) =>
      apiRequest("POST", `/api/assets/${selectedAsset!.id}/revenue`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", selectedAsset?.id, "revenue"] });
      setShowAddRevenue(false);
      setNewRevenue({ source: "streaming", amount: "", description: "" });
      toast({ title: "Revenue Recorded", description: "Income has been logged in the ledger." });
    },
    onError: () => toast({ title: "Error", description: "Failed to record revenue.", variant: "destructive" }),
  });

  const executePayoutsMutation = useMutation({
    mutationFn: (eventId: string) => apiRequest("POST", `/api/revenue/${eventId}/payouts/execute`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/earnings"] });
      toast({ title: "Payouts Executed", description: "Earnings have been distributed to all stakeholders." });
    },
    onError: () => toast({ title: "Error", description: "Failed to execute payouts.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalRevenue = revenue.reduce((sum, e) => sum + parseFloat(e.amount), 0);

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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">Rights Ledger</h1>
            <p className="text-muted-foreground mt-1">
              Music ownership cap table — track splits, revenue, and payouts for every song.
            </p>
          </div>
          <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-asset">
                <Plus className="h-4 w-4 mr-2" />
                Add Song Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register a Song Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asset-title">Song Title *</Label>
                  <Input
                    id="asset-title"
                    placeholder="e.g. Midnight Drive"
                    value={newAsset.title}
                    onChange={(e) => setNewAsset({ ...newAsset, title: e.target.value })}
                    data-testid="input-asset-title"
                  />
                </div>
                <div>
                  <Label htmlFor="asset-artist">Artist / Project Name</Label>
                  <Input
                    id="asset-artist"
                    placeholder="e.g. The Band"
                    value={newAsset.artistName}
                    onChange={(e) => setNewAsset({ ...newAsset, artistName: e.target.value })}
                    data-testid="input-asset-artist"
                  />
                </div>
                <div>
                  <Label htmlFor="asset-isrc">ISRC Code (optional)</Label>
                  <Input
                    id="asset-isrc"
                    placeholder="e.g. USRC11600001"
                    value={newAsset.isrc}
                    onChange={(e) => setNewAsset({ ...newAsset, isrc: e.target.value })}
                    data-testid="input-asset-isrc"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>
                  <Button
                    onClick={() => createAssetMutation.mutate(newAsset)}
                    disabled={!newAsset.title || createAssetMutation.isPending}
                    data-testid="button-confirm-add-asset"
                  >
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
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold">${parseFloat(earnings.balance.totalEarned).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Balance</p>
                  <p className="text-2xl font-bold">${parseFloat(earnings.balance.pendingBalance).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid Out</p>
                  <p className="text-2xl font-bold">${parseFloat(earnings.balance.totalPaid).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Asset List — left column */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Music className="h-4 w-4" /> Song Assets ({assets.length})
            </h2>
            {assetsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : assets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Music className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No song assets yet.</p>
                  <p className="text-xs mt-1">Add a song to start tracking ownership.</p>
                </CardContent>
              </Card>
            ) : (
              assets.map((asset) => (
                <Card
                  key={asset.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedAsset?.id === asset.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => { setSelectedAsset(asset); setShowHistory(false); }}
                  data-testid={`card-asset-${asset.id}`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{asset.title}</p>
                      {asset.artistName && <p className="text-xs text-muted-foreground">{asset.artistName}</p>}
                      {asset.isrc && <p className="text-[10px] text-muted-foreground font-mono mt-1">{asset.isrc}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Asset Detail — right panel */}
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
                        {selectedAsset.artistName && (
                          <p className="text-sm text-muted-foreground">{selectedAsset.artistName}</p>
                        )}
                      </div>
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Total Revenue</p>
                        <p className="font-semibold text-lg">${totalRevenue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Stakeholders</p>
                        <p className="font-semibold text-lg">{ownership.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ownership Cap Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" /> Cap Table
                      {ownership.length > 0 && (
                        <Badge variant="outline" className="text-xs">v{ownership[0]?.version}</Badge>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistory(!showHistory)}
                      data-testid="button-toggle-history"
                    >
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
                      ownership.map((record) => (
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
                        {ownershipHistory.map((h) => (
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
                    <Dialog open={showAddRevenue} onOpenChange={setShowAddRevenue}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" data-testid="button-add-revenue">
                          <Plus className="h-3.5 w-3.5 mr-1" /> Record Income
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Revenue Event</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Source</Label>
                            <Select
                              value={newRevenue.source}
                              onValueChange={(v) => setNewRevenue({ ...newRevenue, source: v })}
                            >
                              <SelectTrigger data-testid="select-revenue-source">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {REVENUE_SOURCES.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Amount (USD)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="e.g. 250.00"
                              value={newRevenue.amount}
                              onChange={(e) => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                              data-testid="input-revenue-amount"
                            />
                          </div>
                          <div>
                            <Label>Description (optional)</Label>
                            <Input
                              placeholder="e.g. Spotify Q1 2026"
                              value={newRevenue.description}
                              onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                              data-testid="input-revenue-description"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowAddRevenue(false)}>Cancel</Button>
                            <Button
                              onClick={() => recordRevenueMutation.mutate(newRevenue)}
                              disabled={!newRevenue.amount || recordRevenueMutation.isPending}
                              data-testid="button-confirm-revenue"
                            >
                              {recordRevenueMutation.isPending ? "Saving..." : "Record Revenue"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {revenue.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        No revenue events yet. Record income to auto-calculate stakeholder splits.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {revenue.map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`revenue-row-${event.id}`}>
                            <div className="flex items-center gap-3">
                              <Badge className={sourceColor[event.source] ?? "bg-gray-100 text-gray-700"}>
                                {event.source}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium">${parseFloat(event.amount).toFixed(2)} {event.currency}</p>
                                {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.createdAt).toLocaleDateString()}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => executePayoutsMutation.mutate(event.id)}
                                disabled={executePayoutsMutation.isPending}
                                data-testid={`button-execute-payout-${event.id}`}
                              >
                                Distribute
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
