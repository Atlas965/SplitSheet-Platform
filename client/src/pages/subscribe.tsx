import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// ── Plan display config ────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { label: string; price: string; features: string[] }> = {
  pro: {
    label: "Pro",
    price: "$19/month",
    features: ["Unlimited agreements", "All contract templates", "Collaborator tracking",
                "Payment dashboard", "Activity log", "Receipt vault", "Priority support"],
  },
  label: {
    label: "Label",
    price: "$49/month",
    features: ["Everything in Pro", "Team management", "Multi-artist roster",
                "Custom templates", "SMS notifications", "Dedicated support"],
  },
};

// ── Payment form ───────────────────────────────────────────────────────────────
function SubscribeForm({ planKey }: { planKey: string }) {
  const stripe   = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded]   = useState(false);

  const cfg = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.pro;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing?upgraded=true`,
      },
      // Keep on page to show success before redirect
      redirect: "if_required",
    });

    if (error) {
      toast({
        title:       "Payment failed",
        description: error.message ?? "Please check your card details and try again.",
        variant:     "destructive",
      });
      setProcessing(false);
    } else {
      // Payment succeeded (redirect will happen if 3DS required)
      setSucceeded(true);
      // Clean up session storage
      sessionStorage.removeItem("stripe_client_secret");
      sessionStorage.removeItem("stripe_plan");
      setTimeout(() => {
        window.location.href = "/billing?upgraded=true";
      }, 2000);
    }
  };

  if (succeeded) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Subscribed!</h3>
        <p className="text-sm text-muted-foreground text-center">
          Welcome to the {cfg.label} plan. Redirecting to your billing page…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <Button
        type="submit"
        className="w-full h-11 text-sm font-semibold"
        disabled={!stripe || processing}
        data-testid="button-subscribe"
      >
        {processing ? (
          <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />Processing…</>
        ) : (
          `Subscribe — ${cfg.price}`
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Cancel anytime · Powered by Stripe · SoundLedger Technologies Inc.
      </p>
    </form>
  );
}

// ── Main Subscribe page ────────────────────────────────────────────────────────
interface SubscribeProps {
  plan?: string;
}

export default function Subscribe({ plan = "pro" }: SubscribeProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const planKey = plan.toLowerCase();
  const cfg     = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.pro;

  const [clientSecret, setClientSecret] = useState<string>(() => {
    // Priority 1: read from sessionStorage (set by billing dialog)
    const stored = sessionStorage.getItem("stripe_client_secret");
    const storedPlan = sessionStorage.getItem("stripe_plan");
    if (stored && storedPlan === planKey) return stored;
    return "";
  });

  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(!clientSecret);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title:       "Sign in required",
        description: "Please sign in to subscribe.",
        variant:     "destructive",
      });
      setTimeout(() => { window.location.href = "/api/login"; }, 1500);
      return;
    }

    // If we already have clientSecret from sessionStorage, skip the API call
    if (clientSecret) {
      setLoading(false);
      return;
    }

    // Fallback: direct navigation to /subscribe — make a fresh API call
    if (isAuthenticated && !clientSecret) {
      setLoading(true);
      apiRequest("POST", "/api/get-or-create-subscription", { plan: planKey })
        .then((res) => res.json())
        .then((data) => {
          if (data?.error?.message) {
            setError(data.error.message);
            return;
          }
          if (data?.alreadyActive) {
            toast({ title: "Already subscribed", description: `You're already on the ${cfg.label} plan.` });
            window.location.href = "/billing";
            return;
          }
          if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            setError("Could not initialize payment. Please try again from the billing page.");
          }
        })
        .catch((err) => {
          setError(err?.message ?? "Network error. Please try again.");
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, isLoading, planKey, clientSecret, cfg.label, toast]);

  // ── Auth loading ───────────────────────────────────────────────────────────
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/billing" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex items-center space-x-3">
                <Logo />
                <span className="text-xl font-bold text-primary">SplitSheet</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Left: plan summary */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                You're subscribing to
              </p>
              <h2 className="text-2xl font-bold text-foreground">{cfg.label} Plan</h2>
              <p className="text-3xl font-bold text-accent mt-1">{cfg.price}</p>
              <p className="text-xs text-muted-foreground mt-1">Billed monthly · cancel anytime</p>
            </div>
            <ul className="space-y-2.5">
              {cfg.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
              <p>🔒 Payments secured by Stripe</p>
              <p>🇨🇦 SoundLedger Technologies Inc. · Ontario, Canada</p>
            </div>
          </div>

          {/* Right: payment form */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-5">Payment details</h3>

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-sm text-muted-foreground">Setting up your payment…</p>
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm font-medium text-destructive">Could not initialize payment</p>
                  <p className="text-xs text-destructive/80 mt-1">{error}</p>
                </div>
                <Link
                  href="/billing"
                  className="block text-center text-sm text-accent hover:underline"
                >
                  ← Return to billing
                </Link>
              </div>
            )}

            {/* Stripe Payment Element */}
            {!loading && !error && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme:     "stripe",
                    variables: { colorPrimary: "#3b6ef5", borderRadius: "8px" },
                  },
                }}
              >
                <SubscribeForm planKey={planKey} />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}