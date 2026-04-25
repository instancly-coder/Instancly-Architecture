import {
  Switch,
  Route,
  Router as WouterRouter,
  Link as WouterLink,
  useLocation,
} from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import "@neondatabase/neon-js/ui/css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { initThemeOnce } from "@/hooks/use-theme";
import { AuthGate } from "@/components/auth-gate";
import { SessionSync } from "@/components/session-sync";
import { ConfigPrewarm } from "@/components/config-prewarm";
import { authClient } from "@/auth";

initThemeOnce();

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SignupUsername from "@/pages/signup-username";
import Handler from "@/pages/handler";
import Dashboard from "@/pages/dashboard";
import Billing from "@/pages/dashboard/billing";
import Settings from "@/pages/dashboard/settings";
import Explore from "@/pages/explore";
import Library from "@/pages/library";
import Profile from "@/pages/profile";
import Project from "@/pages/project";
import Builder from "@/pages/builder";
import BuildNew from "@/pages/build-new";
import Pricing from "@/pages/pricing";
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
  AcceptableUse,
  CookiePolicy,
  DPA,
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
      <Route path="/handler" component={Handler} />
      <Route path="/handler/:rest*" component={Handler} />
      <Route path="/dashboard" component={gated(Dashboard)} />
      <Route path="/dashboard/billing" component={gated(Billing)} />
      <Route path="/dashboard/settings" component={gated(Settings)} />
      <Route path="/explore" component={Explore} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/library" component={Library} />
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
      <Route path="/aup" component={AcceptableUse} />
      <Route path="/cookies" component={CookiePolicy} />
      <Route path="/dpa" component={DPA} />
      <Route path="/community" component={Community} />
      <Route path="/build/new" component={gated(BuildNew)} />
      <Route path="/:username" component={Profile} />
      <Route path="/:username/:slug" component={Project} />
      <Route path="/:username/:slug/build" component={gated(Builder)} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Mounts Neon's official `<NeonAuthUIProvider>` so the SDK's components
 * (`<AuthCallback>`, `<AuthView>`, `<AccountView>`, `<SignedIn>` /
 * `<SignedOut>`, `useAuthData()` …) can find their auth client + theme +
 * navigation context. We bridge wouter's `useLocation` into the provider's
 * `navigate`/`replace` props so post-login redirects stay SPA-routed.
 *
 * When auth isn't configured (no `VITE_NEON_AUTH_BASE_URL`), we render the
 * children unwrapped so the dev fallback (`demo` user) keeps working.
 */
function AuthProviderShell({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  if (!authClient) return <>{children}</>;
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={(href) => navigate(href)}
      replace={(href) => navigate(href, { replace: true })}
      Link={({ href, ...props }) => <WouterLink href={href} {...props} />}
      social={{ providers: ["google", "github", "apple"] }}
      redirectTo="/dashboard"
      credentials={false}
      signUp={false}
      defaultTheme="dark"
    >
      {children}
    </NeonAuthUIProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionSync />
        <ConfigPrewarm />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProviderShell>
            <Router />
          </AuthProviderShell>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
