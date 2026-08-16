import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAccount from "./pages/AdminAccount";
import AdminLeads from "./pages/AdminLeads";
import AdminPurchases from "./pages/AdminPurchases";
import AdminFiles from "./pages/AdminFiles";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminPreview from "./pages/AdminPreview";
import AdminSettings from "./pages/AdminSettings";
import AdminAnalytics from "./pages/AdminAnalytics";
import NotFound from "./pages/NotFound";

// Design philosophy: Editorial Arabic modernism for a calm, trustworthy study product.
// This shell keeps the public experience focused: one RTL landing page, one clear CTA,
// and no distracting route branches before checkout is connected.
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/account" component={AdminAccount} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/admin/purchases" component={AdminPurchases} />
      <Route path="/admin/files" component={AdminFiles} />
      <Route path="/admin/audit-logs" component={AdminAuditLogs} />
      <Route path="/admin/preview" component={AdminPreview} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
