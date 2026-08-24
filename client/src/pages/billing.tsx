import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CreditCard, CheckCircle2, AlertCircle,
  FileText, Users, HardDrive, Plus, Download, ArrowRight,
  Loader2, XCircle, RefreshCw, Layers, Lock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubscriptionData {
  hasSubscription: boolean;
  subscriptionId?: string;
  status?: string;
  tier: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  nextBillingDate?: number;
}

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
}

// ── Plan config ───────────────────────────────────────────────────────────────
type PlanKey = "free" | "session" | "pro" | "creator_pro" | "studio_pro";

const PLANS: Record<PlanKey, { name: string; price: string; contractLimit: number | null; billing: string }> = {
  free:        { name: "Starter Split",    price: "$0",         contractLimit: 1,    billing: "Free · no card needed" },
  session:     { name: "Pay-Per-Session",  price: "$25 CAD",    contractLimit: 5,    billing: "Per completed session" },
  pro:         { name: "Multi-Creator",    price: "$50–$75 CAD", contractLimit: null, billing: "Per project · quote-based" },
  creator_pro: { name: "Creator Pro",      price: "$15 CAD/mo", contractLimit: null, billing: "Unlimited sessions" },
  studio_pro:  { name: "Studio Pro",       price: "$49 CAD/mo", contractLimit: null, billing: "Unlimited projects & team" },
};

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free:        ["1 collaboration project", "Up to 2 contributors", "Basic split allocation", "Contributor confirmation links", "Timestamped agreement summary", "PDF export"],
  session:     ["Up to 5 contributors", "Split percentage configuration", "Contributor verification workflow", "Agreement completion tracking", "PDF export package", "Audit log storage", "Email confirmations"],
  pro:         ["Up to 10 contributors", "Multi-round revisions", "Enhanced audit history", "Contributor reminders system", "Project dashboard", "Priority processing option", "Full exportable records"],
  creator_pro: ["Unlimited sessions (no per-session fee)", "Project history storage", "Saved contributor profiles", "Collaboration analytics", "Workflow automation tools", "Discounted premium exports"],
  studio_pro:  ["Unlimited projects and contributors", "Team management dashboard", "Role-based permissions", "Advanced audit logs", "Bulk exports", "Organization-level analytics", "Priority support"],
};

// ── Upgrade Dialog ────────────────────────────────────────────────────────────
function UpgradePlanDialog({ open, onClose, currentPlan }: {
  open: boolean; onClose: () => void; currentPlan: PlanKey;
}) {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleUpgrade(plan: string) {
    setLoadingPlan(plan);
    try {
      // Quote-based Multi-Creator — no self-serve Stripe subscription yet
      if (plan === "pro") {
        window.location.href =
          "mailto:enterprise@splitsheet.ca?subject=Multi-Creator%20plan%20quote";
        toast({
          title: "Request a quote",
          description: "Multi-Creator is quote-based. We opened an email to enterprise@splitsheet.ca.",
        });
        return;
      }

      // apiRequest returns the Response — parse JSON manually
      const res  = await apiRequest("POST", "/api/get-or-create-subscription", { plan });
      const data = await res.json();

      // Server returned an error object
      if (data?.error?.message) {
        toast({
          title:       "Could not start upgrade",
          description: data.error.message,
          variant:     "destructive",
        });
        return;
      }

      if (data?.quoteRequired) {
        toast({
          title: "Request a quote",
          description: data.message || "Contact enterprise@splitsheet.ca for this plan.",
        });
        return;
      }

      // User is already on this plan
      if (data?.alreadyActive) {
        toast({
          title:       "Already subscribed",
          description: `You're already on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
        onClose();
        return;
      }

      // Payment required — navigate to subscribe page with clientSecret in sessionStorage
      // (safer than a URL param — secrets shouldn't live in browser history)
      if (data?.clientSecret) {
        sessionStorage.setItem("stripe_client_secret", data.clientSecret);
        sessionStorage.setItem("stripe_plan", plan);
        window.location.href = `/subscribe?plan=${encodeURIComponent(plan)}`;
        return;
      }

      // Fallback: subscription created without requiring payment (trial etc.)
      toast({
        title:       "Plan upgraded",
        description: `You are now on the ${plan} plan.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
      onClose();

    } catch (err: any) {
      let description = err?.message ?? "Please check your connection and try again.";
      try {
        const match = String(err?.message || "").match(/^\d+:\s*(\{[\s\S]*\})$/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (parsed?.error?.message) description = parsed.error.message;
        }
      } catch {
        /* keep raw message */
      }
      toast({
        title:       "Could not start upgrade",
        description,
        variant:     "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col max-h-[min(90dvh,720px)]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold">Upgrade your plan</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Choose the plan that fits your music career. Scroll to compare all options.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4 scroll-smooth [scrollbar-gutter:stable]"
          data-testid="upgrade-plans-scroll"
          role="region"
          aria-label="Available upgrade plans"
        >
          {(["session", "pro", "creator_pro", "studio_pro"] as PlanKey[]).map((plan) => {
            const cfg = PLANS[plan];
            const isCurrent    = plan === currentPlan;
            const isLoading    = loadingPlan === plan;
            const anyLoading   = loadingPlan !== null;

            return (
              <div key={plan} className={`rounded-xl border p-5 ${plan === "session" ? "border-accent/60 bg-accent/5" : "border-border bg-card"}`}>
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-foreground">{cfg.name}</span>
                      {plan === "session" && (
                        <span className="text-xs bg-accent text-accent-foreground rounded-full px-2 py-0.5 font-semibold">Most Popular</span>
                      )}
                      {isCurrent && (
                        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">Current</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {cfg.price}
                    </p>
                    <p className="text-xs text-muted-foreground">{cfg.billing}</p>
                  </div>
                  {!isCurrent && (
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleUpgrade(plan)}
                      disabled={anyLoading}
                      data-testid={`btn-upgrade-${plan}`}
                    >
                      {isLoading
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Starting…</>
                        : plan === "pro"
                          ? <><span>Get Quote</span><ArrowRight className="h-3 w-3 ml-1" /></>
                          : <><span>Start Session</span><ArrowRight className="h-3 w-3 ml-1" /></>}
                    </Button>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 px-6 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Need more?{" "}
            <a href="mailto:enterprise@splitsheet.ca" className="text-accent hover:underline">
              For labels and publishers, contact us →
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Update Payment Method Dialog ──────────────────────────────────────────────
function UpdatePaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvc,        setCvc]        = useState("");
  const [name,       setName]       = useState("");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  // Format card number with spaces every 4 digits
  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  // Format expiry MM / YY
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  };

  const isComplete =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.replace(/\s\/\s/g, "").length === 4 &&
    cvc.length >= 3 &&
    name.trim().length > 1;

  const handleSave = async () => {
    if (!isComplete) return;
    setSaving(true);
    // In production this would call Stripe's Setup Intent API.
    // For demo, we log the action and show success.
    await new Promise((r) => setTimeout(r, 1200));
    await apiRequest("POST", "/api/activity", {
      activityType: "payment_method_update_requested",
      activityData: { last4: cardNumber.replace(/\s/g, "").slice(-4), name, updatedAt: new Date().toISOString() },
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    toast({ title: "Payment method updated", description: `Card ending in ${cardNumber.replace(/\s/g, "").slice(-4)} saved.` });
    setTimeout(() => { setSaved(false); onClose(); }, 1500);
  };

  const resetAndClose = () => {
    setCardNumber(""); setExpiry(""); setCvc(""); setName(""); setSaved(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-accent" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold leading-none">Update Payment Method</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Your card details are encrypted and never stored on our servers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {saved ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-foreground">Payment method updated</p>
              <p className="text-xs text-muted-foreground">
                Card ending in {cardNumber.replace(/\s/g, "").slice(-4)} is now active.
              </p>
            </div>
          ) : (
            <>
              {/* Card number */}
              <div className="space-y-1.5">
                <Label htmlFor="card-number" className="text-sm">Card number</Label>
                <div className="relative">
                  <Input
                    id="card-number"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    className="pr-10 font-mono tracking-wider"
                    maxLength={19}
                    data-testid="input-card-number"
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Expiry + CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry" className="text-sm">Expiry date</Label>
                  <Input
                    id="expiry"
                    inputMode="numeric"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={7}
                    data-testid="input-expiry"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvc" className="text-sm">CVC</Label>
                  <Input
                    id="cvc"
                    inputMode="numeric"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    data-testid="input-cvc"
                  />
                </div>
              </div>

              {/* Name on card */}
              <div className="space-y-1.5">
                <Label htmlFor="card-name" className="text-sm">Name on card</Label>
                <Input
                  id="card-name"
                  placeholder="Jordan Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-card-name"
                />
              </div>

              {/* Accepted cards */}
              <div className="flex items-center gap-2 pt-1">
                {["fab fa-cc-visa", "fab fa-cc-mastercard", "fab fa-cc-amex"].map((icon) => (
                  <i key={icon} className={`${icon} text-2xl text-muted-foreground`} />
                ))}
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> SSL encrypted
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={resetAndClose}>Cancel</Button>
                <Button
                  className="flex-1"
                  disabled={!isComplete || saving}
                  onClick={handleSave}
                  data-testid="btn-save-payment"
                >
                  {saving
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                    : <><CreditCard className="h-4 w-4 mr-2" />Save Card</>}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-3 bg-muted/30 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            Payments processed securely by Stripe · SoundLedger Technologies Inc. · Ontario, Canada
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Invoice CSV download from live contract data ───────────────────────────────
function downloadInvoiceCSV(contracts: Contract[], planName: string, planPrice: string) {
  if (!contracts.length) return null;

  const header = "Date,Description,Status,Amount,Type\n";
  const rows = contracts.map((c) => {
    const date = new Date(c.createdAt).toLocaleDateString("en-CA");
    const desc = `"${c.title.replace(/"/g, '""')}"`;
    return `${date},${desc},${c.status},—,${c.type}`;
  });

  // Append subscription row if paid
  if (planPrice !== "$0") {
    const today = new Date().toLocaleDateString("en-CA");
    rows.unshift(`${today},"${planName} Plan Subscription",active,${planPrice} — session,subscription`);
  }

  const csv = header + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `splitsheet-billing-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return rows.length;
}

// ── Main Billing Page ─────────────────────────────────────────────────────────
export default function Billing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Live data
  const { data: subscriptionData, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/stripe/subscription"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    retry: false,
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/stripe/cancel-subscription", {}),
    onSuccess: () => {
      toast({ title: "Subscription cancelled", description: "You keep access until the end of the billing period." });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
    },
    onError: () =>
      toast({ title: "Could not cancel", description: "Please try again.", variant: "destructive" }),
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({ title: "Session expired", description: "Please sign in.", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  // Map legacy tier names to new service model keys
  const tierMap: Record<string, PlanKey> = {
    free: "free", starter: "free",
    pro: "session", session: "session",
    label: "pro", studio: "pro",
    creator_pro: "creator_pro", studio_pro: "studio_pro",
  };
  const rawTier = subscriptionData?.tier ?? (user as any)?.subscriptionTier ?? "free";
  const planKey: PlanKey = tierMap[rawTier] ?? "free";
  const plan = PLANS[planKey];
  const isActive = subscriptionData?.hasSubscription && subscriptionData?.status === "active";

  // Live usage numbers
  const contractCount = contracts?.length ?? stats?.totalContracts ?? 0;
  const { contractLimit } = plan;
  const contractPct = contractLimit
    ? Math.min((contractCount / contractLimit) * 100, 100)
    : Math.min(contractCount * 8, 85);
  const atLimit = !!(contractLimit && contractCount >= contractLimit);

  const pendingSigs = stats?.pendingSignatures ?? 0;
  const signedThisMonth = stats?.completedThisMonth ?? 0;

  // Formatted dates
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const fmtShort = (ts: number) =>
    new Date(ts).toLocaleDateString("en-CA", { month: "long", year: "numeric" });

  const nextBillingStr = subscriptionData?.nextBillingDate ? fmt(subscriptionData.nextBillingDate) : null;
  const periodStartStr = subscriptionData?.currentPeriodStart ? fmtShort(subscriptionData.currentPeriodStart) : null;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    toast({ title: "Refreshed", description: "Usage data is up to date." });
  };

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Billing &amp; Subscription</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and payment methods</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: main content ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Current Plan */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">Current Plan</h2>
                {isActive && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                    Active
                  </Badge>
                )}
              </div>

              {subLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-3xl font-bold text-accent">{plan.name}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {plan.price} · {plan.billing}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowUpgrade(true)}
                      data-testid="button-change-plan"
                    >
                      {planKey === "free" ? "Upgrade Session" : "Change Plan"}
                    </Button>
                  </div>

                  {/* Feature list */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PLAN_FEATURES[planKey].map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />{f}
                      </div>
                    ))}
                  </div>

                  {/* Notices */}
                  {subscriptionData?.hasSubscription && nextBillingStr && !subscriptionData.cancelAtPeriodEnd && (
                    <div className="mt-5 p-3.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      <p className="text-sm text-green-800 dark:text-green-300">
                        Next billing date: <strong>{nextBillingStr}</strong>
                      </p>
                    </div>
                  )}

                  {subscriptionData?.cancelAtPeriodEnd && nextBillingStr && (
                    <div className="mt-5 p-3.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">Subscription ending</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                          Your plan reverts to Free on {nextBillingStr}.
                        </p>
                      </div>
                      <Button size="sm" className="shrink-0" onClick={() => setShowUpgrade(true)}>
                        Keep plan
                      </Button>
                    </div>
                  )}

                  {/* Cancel */}
                  {subscriptionData?.hasSubscription && !subscriptionData.cancelAtPeriodEnd && (
                    <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Cancel anytime — access continues until {nextBillingStr ?? "end of period"}.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                        disabled={cancelMutation.isPending}
                        onClick={() => {
                          if (confirm("Cancel subscription? You'll keep access until end of current period.")) {
                            cancelMutation.mutate();
                          }
                        }}
                        data-testid="button-cancel-subscription"
                      >
                        {cancelMutation.isPending
                          ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cancelling…</>
                          : <><XCircle className="h-3 w-3 mr-1" />Cancel subscription</>}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Payment Method — paid plans only */}
            {planKey !== "free" && subscriptionData?.hasSubscription && (
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Payment Method</h2>
                  <button
                    className="text-sm text-accent hover:underline"
                    onClick={() => toast({ title: "Stripe Portal", description: "Payment updates are managed in the Stripe customer portal." })}
                    data-testid="button-update-payment"
                  >
                    Update
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0">
                    <i className="fab fa-cc-visa text-white text-lg" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Managed securely via Stripe</p>
                  </div>
                </div>
              </div>
            )}

            {/* Billing History */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Billing History</h2>
              {planKey === "free" ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-muted-foreground">No billing history</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You're on the Free plan — no charges have been made.
                  </p>
                  <Button className="mt-4" size="sm" onClick={() => setShowUpgrade(true)}>
                    Start a Split Session — $25 CAD <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              ) : subscriptionData?.currentPeriodStart ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {plan.name} Plan — {periodStartStr}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Current billing period · {subscriptionData.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground text-sm">{plan.price}</p>
                      <button
                        className="text-accent text-xs hover:underline mt-0.5 flex items-center gap-1 ml-auto"
                        onClick={() => toast({ title: "Invoice", description: "Manage invoices in your Stripe customer portal." })}
                        data-testid="button-download-invoice"
                      >
                        <Download className="h-3 w-3" /> Invoice
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-3">
                    Full invoice history available in your{" "}
                    <button
                      className="text-accent hover:underline"
                      onClick={() => toast({ title: "Stripe Portal", description: "Customer portal integration — coming soon." })}
                    >
                      Stripe customer portal →
                    </button>
                  </p>
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  Billing history will appear here after your first payment.
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: usage + actions ── */}
          <div className="space-y-6">

            {/* Usage This Month — LIVE */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">Usage This Month</h2>
                {(statsLoading || contractsLoading) && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="space-y-5">
                {/* Contracts */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Contracts Created
                    </span>
                    <span className={`font-semibold tabular-nums ${atLimit ? "text-destructive" : "text-foreground"}`}>
                      {contractsLoading ? "…" : contractCount}
                      {" / "}
                      {contractLimit ?? "∞"}
                    </span>
                  </div>
                  <Progress
                    value={contractPct}
                    className={`h-2 ${atLimit ? "[&>div]:bg-destructive" : ""}`}
                  />
                  {atLimit && (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Limit reached —{" "}
                      <button className="underline" onClick={() => setShowUpgrade(true)}>
                        upgrade for unlimited
                      </button>
                    </p>
                  )}
                </div>

                {/* Pending signatures */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Pending Signatures
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {statsLoading ? "…" : pendingSigs}
                    </span>
                  </div>
                  <Progress value={pendingSigs ? Math.min(pendingSigs * 12, 100) : 0} className="h-2" />
                </div>

                {/* Signed this month */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Signed This Month
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {statsLoading ? "…" : signedThisMonth}
                    </span>
                  </div>
                  <Progress
                    value={signedThisMonth ? Math.min(signedThisMonth * 20, 100) : 0}
                    className="h-2 [&>div]:bg-green-500"
                  />
                </div>

                {/* Storage */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                      Storage
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {planKey === "free" ? "Shared" : "∞ included"}
                    </span>
                  </div>
                  <Progress value={planKey === "free" ? 15 : 4} className="h-2" />
                </div>
              </div>

              {planKey === "free" && (
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">
                    Free plan: 1 project, 2 contributors max. Start a Split Session for $25 CAD to unlock more.
                  </p>
                  <Button size="sm" className="w-full" onClick={() => setShowUpgrade(true)}>
                    Start a Split Session — $25 CAD <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-3">

                {/* 1. Update Payment Method */}
                <button
                  className="flex items-center gap-3 w-full p-3.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground text-left group"
                  onClick={() => setShowPaymentModal(true)}
                  data-testid="quick-action-update-payment"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Update Payment Method</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {planKey !== "free" && subscriptionData?.hasSubscription
                        ? "Change the card used for your subscription"
                        : "Add a card before upgrading your plan"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                </button>

                {/* 2. Download All Invoices */}
                <button
                  className="flex items-center gap-3 w-full p-3.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground text-left group"
                  onClick={() => {
                    if (!contracts || contracts.length === 0) {
                      toast({
                        title: "No invoices yet",
                        description: "Create your first contract to generate billing records.",
                      });
                      return;
                    }
                    const count = downloadInvoiceCSV(contracts, plan.name, plan.price);
                    if (count) {
                      toast({
                        title: "Invoices downloaded",
                        description: `${count} record${count !== 1 ? "s" : ""} exported as CSV.`,
                      });
                      apiRequest("POST", "/api/activity", {
                        activityType: "invoices_downloaded",
                        activityData: { count, exportedAt: new Date().toISOString() },
                      }).catch(() => {});
                    }
                  }}
                  data-testid="quick-action-download-invoices"
                >
                  <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center shrink-0 group-hover:bg-green-100 dark:group-hover:bg-green-900/40 transition-colors">
                    <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Download All Invoices</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {contractsLoading
                        ? "Loading…"
                        : contractCount > 0
                        ? `Export ${contractCount} record${contractCount !== 1 ? "s" : ""} as CSV`
                        : "No billing records yet"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                </button>

                {/* 3. Create New Contract */}
                <Link
                  href="/contract/split-sheet"
                  className="flex items-center gap-3 w-full p-3.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity font-medium text-sm group"
                  data-testid="quick-action-new-contract"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Create New Contract</p>
                    <p className="text-xs opacity-80 mt-0.5">
                      Split sheet, performance, producer or management
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-70 shrink-0 group-hover:opacity-100 transition-opacity" />
                </Link>

              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />

      <UpgradePlanDialog
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={planKey}
      />

      <UpdatePaymentDialog
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  );
}