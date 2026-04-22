import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { initThemeOnce } from "@/hooks/use-theme";

initThemeOnce();

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SignupUsername from "@/pages/signup-username";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup/username" component={SignupUsername} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/billing" component={Billing} />
      <Route path="/dashboard/settings" component={Settings} />
      <Route path="/explore" component={Explore} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/models" component={AdminModels} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/revenue" component={AdminRevenue} />
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
      <Route path="/:username/:slug/build" component={Builder} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
