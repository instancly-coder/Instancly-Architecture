import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { initThemeOnce } from "@/hooks/use-theme";
import { AuthGate } from "@/components/auth-gate";
import { SessionSync } from "@/components/session-sync";

initThemeOnce();

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SignupUsername from "@/pages/signup-username";
import Handler from "@/pages/handler";
import Dashboard from "@/pages/dashboard";
import Billing from "@/pages/dashboard/billing";
import Settings from "@/pages/dashboard/settings";
import Explore from "@/pages/explore";
import Profile from "@/pages/profile";
import Project from "@/pages/project";
import Builder from "@/pages/builder";
import Admin from "@/pages/admin";
import AdminModels from "@/pages/admin/models";
import AdminUsers from "@/pages/admin/users";
import AdminRevenue from "@/pages/admin/revenue";
import {
  Docs,
  Changelog,
  Templates,
  Status,
  Blog,
  About,
  Careers,
  Privacy,
  Terms,
  Community,
} from "@/pages/info";

const queryClient = new QueryClient();

function gated(Component: React.ComponentType) {
  return function Gated() {
    return (
      <AuthGate>
        <Component />
      </AuthGate>
    );
  };
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup/username" component={gated(SignupUsername)} />
      <Route path="/handler/:rest*" component={Handler} />
      <Route path="/dashboard" component={gated(Dashboard)} />
      <Route path="/dashboard/billing" component={gated(Billing)} />
      <Route path="/dashboard/settings" component={gated(Settings)} />
      <Route path="/explore" component={Explore} />
      <Route path="/admin" component={gated(Admin)} />
      <Route path="/admin/models" component={gated(AdminModels)} />
      <Route path="/admin/users" component={gated(AdminUsers)} />
      <Route path="/admin/revenue" component={gated(AdminRevenue)} />
      <Route path="/docs" component={Docs} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/templates" component={Templates} />
      <Route path="/status" component={Status} />
      <Route path="/blog" component={Blog} />
      <Route path="/about" component={About} />
      <Route path="/careers" component={Careers} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/community" component={Community} />
      <Route path="/:username" component={Profile} />
      <Route path="/:username/:slug" component={Project} />
      <Route path="/:username/:slug/build" component={gated(Builder)} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionSync />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
