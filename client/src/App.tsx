import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Appointments from "@/pages/Appointments";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import { useAuth } from "./_core/hooks/useAuth";
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
import Settings from "@/pages/Settings";
import Agency from "@/pages/Agency";
import AppLayout from "./components/AppLayout";
import Login from "./pages/login";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Security from "./pages/Security";

import Platform from "@/pages/Platform";
import Solutions from "@/pages/Solutions";
import Resources from "@/pages/Resources";

function RootPage() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0a0c12",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"rgba(255,255,255,0.5)",fontSize:14}}>Loading...</div>
    </div>
  );
  if (user) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      {/* Public pages */}
      <Route path="/" component={RootPage} />
      <Route path="/login" component={Login} />
      <Route path="/about" component={About} />
      <Route path="/platform" component={Platform} />
      <Route path="/solutions" component={Solutions} />
      <Route path="/resources" component={Resources} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/security" component={Security} />

      {/* Legacy alias — single public marketing surface lives at / */}
      <Route path="/app">
        <Redirect to="/" />
      </Route>

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
      <Route path="/appointments">
        <AppLayout><Appointments /></AppLayout>
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
      <Route path="/settings">
        <AppLayout><Settings /></AppLayout>
      </Route>
      <Route path="/agency">
        <AppLayout><Agency /></AppLayout>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
