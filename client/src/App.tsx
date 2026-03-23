import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import VoiceAI from "./pages/VoiceAI";
import Messages from "./pages/Messages";
import Templates from "./pages/Templates";
import Analytics from "./pages/Analytics";
import Testimonials from "./pages/Testimonials";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";
import AppLayout from "./components/AppLayout";
import Login from "./pages/login";
import About from "./pages/About";
import Pricing from "./pages/Pricing";

function Router() {
  return (
    <Switch>
      {/* Public pages */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/about" component={About} />
      <Route path="/pricing" component={Pricing} />

      {/* App home (authenticated users) */}
      <Route path="/app" component={Home} />

      {/* App routes — wrapped in AppLayout */}
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/leads">
        <AppLayout><Leads /></AppLayout>
      </Route>
      <Route path="/campaigns">
        <AppLayout><Campaigns /></AppLayout>
      </Route>
      <Route path="/campaigns/:id">
        <AppLayout><CampaignDetail /></AppLayout>
      </Route>
      <Route path="/voice-ai">
        <AppLayout><VoiceAI /></AppLayout>
      </Route>
      <Route path="/messages">
        <AppLayout><Messages /></AppLayout>
      </Route>
      <Route path="/templates">
        <AppLayout><Templates /></AppLayout>
      </Route>
      <Route path="/analytics">
        <AppLayout><Analytics /></AppLayout>
      </Route>
      <Route path="/testimonials">
        <AppLayout><Testimonials /></AppLayout>
      </Route>
      <Route path="/onboarding">
        <AppLayout><Onboarding /></AppLayout>
      </Route>
      <Route path="/admin">
        <AppLayout><Admin /></AppLayout>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
