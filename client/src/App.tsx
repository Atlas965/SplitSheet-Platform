import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Contracts from "@/pages/contracts";
import ContractDetails from "@/pages/contract-details";
import ContractEdit from "@/pages/contract-edit";
import Profile from "@/pages/profile";
import Templates from "@/pages/templates";
import Analytics from "@/pages/analytics";
import Billing from "@/pages/billing";
import Subscribe from "@/pages/subscribe";
import ContractForm from "@/pages/contract-form";
import Negotiations from "@/pages/negotiations";
import NegotiationDetail from "@/pages/negotiation-detail";
import Matches from "@/pages/matches";
import Messages from "@/pages/messages";
import Admin from "@/pages/admin";
import Search from "@/pages/search";
import Ownership from "@/pages/ownership";
import Notifications from "@/pages/notifications";
import Clients from "@/pages/clients";
import Projects from "@/pages/projects";
import Organizations from "@/pages/organizations";
import OrganizationDetail from "@/pages/organization-detail";
import Creators from "@/pages/creators";
import CreatorDetail from "@/pages/creator-detail";
import ConfirmSplit from "@/pages/confirm-split";
import NotFound from "@/pages/not-found";
import SoundLedgerCopilot from "@/components/SoundLedgerCopilot";
import OnboardingWalkthrough from "@/components/OnboardingWalkthrough";
import TermsGate from "@/components/TermsGate";
import OperatorLayout from "@/components/OperatorLayout";
import ClientDetail from "@/pages/client-detail";
import ProjectDetail from "@/pages/project-detail";

function AuthenticatedRoutes() {
  return (
    <OperatorLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contracts" component={Contracts} />
        <Route path="/contracts/:id" component={ContractDetails} />
        <Route path="/contracts/:id/edit" component={ContractEdit} />
        <Route path="/profile" component={Profile} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/templates" component={Templates} />
        <Route path="/billing" component={Billing} />
        <Route
          path="/subscribe"
          component={() => {
            const params = new URLSearchParams(window.location.search);
            const plan = params.get("plan") ?? "pro";
            return <Subscribe plan={plan} />;
          }}
        />
        <Route path="/negotiations" component={Negotiations} />
        <Route path="/negotiations/:id" component={NegotiationDetail} />
        <Route path="/matches" component={Matches} />
        <Route path="/messages" component={Messages} />
        <Route path="/messages/:userId" component={Messages} />
        <Route path="/search" component={Search} />
        <Route path="/admin" component={Admin} />
        <Route path="/ownership" component={Ownership} />
        <Route path="/ownership/:id" component={Ownership} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/organizations" component={Organizations} />
        <Route path="/organizations/:id" component={OrganizationDetail} />
        <Route path="/creators" component={Creators} />
        <Route path="/creators/:id" component={CreatorDetail} />
        <Route
          path="/contract/new"
          component={() => {
            window.location.replace("/contract/split-sheet");
            return null;
          }}
        />
        <Route path="/contract/:type" component={ContractForm} />
        <Route component={NotFound} />
      </Switch>
    </OperatorLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();
  const showCopilot = !isLoading && isAuthenticated;

  // Brief boot spinner only — never block the login page on API outages
  if (isLoading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  return (
    <TermsGate>
      <Switch>
        <Route path="/confirm/:contractId/:token" component={ConfirmSplit} />
        <Route path="/confirm/:token" component={ConfirmSplit} />
        {!isAuthenticated && <Route path="/login" component={Login} />}
        {!isAuthenticated && <Route path="/" component={Landing} />}
        {isAuthenticated && <Route component={AuthenticatedRoutes} />}
        {!isAuthenticated && <Route component={Landing} />}
        <Route component={NotFound} />
      </Switch>
      {showCopilot && <SoundLedgerCopilot />}
      {showCopilot && <OnboardingWalkthrough />}
    </TermsGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
