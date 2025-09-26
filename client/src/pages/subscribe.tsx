import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ plan }: { plan: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing?success=true`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Subscription Successful",
        description: `You are now subscribed to the ${plan} plan!`,
      });
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-subscribe"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          `Subscribe to ${plan}`
        )}
      </Button>
    </form>
  );
};

interface SubscribeProps {
  plan?: string;
}

export default function Subscribe({ plan = "Pro" }: SubscribeProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe to a plan.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 2000);
      return;
    }

    if (isAuthenticated) {
      // Create subscription as soon as the page loads
      apiRequest("POST", "/api/get-or-create-subscription", { plan })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            toast({
              title: "Already Subscribed",
              description: "You already have an active subscription.",
            });
          }
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to initialize subscription. Please try again.",
            variant: "destructive",
          });
          console.error("Subscription error:", error);
        });
    }
  }, [isAuthenticated, isLoading, plan, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Logo />
                <span className="text-xl font-bold text-primary">Splitfy</span>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="max-w-md mx-auto mt-20 p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Setting up your subscription...</h2>
            <p className="text-muted-foreground">Please wait while we prepare your payment.</p>
          </div>
        </div>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Logo />
              <span className="text-xl font-bold text-primary">Splitfy</span>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-md mx-auto mt-20 p-8">
        <div className="bg-card p-8 rounded-xl border border-border">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Subscribe to {plan} Plan</h2>
            <p className="text-muted-foreground">
              {plan === "Pro" ? "$19/month" : "$49/month"} - Cancel anytime
            </p>
          </div>
          
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SubscribeForm plan={plan} />
          </Elements>
        </div>
      </div>
    </div>
  );
}
