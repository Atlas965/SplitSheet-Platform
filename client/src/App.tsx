import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
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
import Admin from "@/pages/admin";
import Ownership from "@/pages/ownership";
import Notifications from "@/pages/notifications";
import Clients from "@/pages/clients";
import Projects from "@/pages/projects";
import Organizations from "@/pages/organizations";
import OrganizationDetail from "@/pages/organization-detail";
import ConfirmSplit from "@/pages/confirm-split";
import NotFound from "@/pages/not-found";
import SoundLedgerCopilot from "@/components/SoundLedgerCopilot";
import OnboardingWalkthrough from "@/components/OnboardingWalkthrough";
import TermsGate from "@/components/TermsGate";
import OperatorLayout from "@/components/OperatorLayout";
import ClientDetail from "@/pages/client-detail";
import ProjectDetail from "@/pages/project-detail";
import StudioPublic from "@/pages/studio-public";

function RedirectTo({ href }: { href: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(href);
  }, [href, setLocation]);
  return null;
}

function AuthenticatedRoutes() {
  return (
    <OperatorLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contracts" component={Contracts} />
        <Route path="/contracts/:id" component={ContractDetails} />
        <Route path="/contracts/:id/edit" component={ContractEdit} />
        <Route path="/profile" component={Profile} />
        <Route path="/templates" component={Templates} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/billing" component={Billing} />
        <Route
          path="/subscribe"
          component={() => {
            const params = new URLSearchParams(window.location.search);
            const plan = params.get("plan") ?? "pro";
            return <Subscribe plan={plan} />;
          }}
        />
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
        <Route path="/contract/new" component={() => <RedirectTo href="/projects?new=1" />} />
        <Route path="/negotiations" component={() => <RedirectTo href="/" />} />
        <Route path="/negotiations/:id" component={() => <RedirectTo href="/" />} />
        <Route path="/matches" component={() => <RedirectTo href="/" />} />
        <Route path="/messages" component={() => <RedirectTo href="/" />} />
        <Route path="/messages/:userId" component={() => <RedirectTo href="/" />} />
        <Route path="/search" component={() => <RedirectTo href="/" />} />
        <Route path="/creators" component={() => <RedirectTo href="/clients" />} />
        <Route path="/creators/:id" component={() => <RedirectTo href="/clients" />} />
        <Route path="/contract/:type" component={ContractForm} />
        <Route component={NotFound} />
      </Switch>
    </OperatorLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const showCopilot = isAuthenticated;
  const publicConfirm = window.location.pathname.startsWith("/confirm/");
  const publicStudio = window.location.pathname.startsWith("/studio/");
  const publicMarketing =
    window.location.pathname === "/" || window.location.pathname === "/login";

  // Do not block landing/login/confirm on a slow /api/auth/user call.
  // Deep authenticated links still wait briefly so the shell does not flash.
  if (isLoading && !publicConfirm && !publicMarketing && !publicStudio) {
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
        <Route path="/studio/:id" component={StudioPublic} />
        {isAuthenticated && <Route component={AuthenticatedRoutes} />}
        <Route path="/login" component={Login} />
        <Route path="/" component={Landing} />
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
