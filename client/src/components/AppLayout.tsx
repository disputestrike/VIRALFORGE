import AIAgent from "@/components/AIAgent";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  BarChart3,
  Bot,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Megaphone, Calendar,
  Settings,
  Shield,
  Star,
  Users,
  Zap,
  FileText,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { trpc } from "@/lib/trpc";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/voice-ai", label: "Voice AI", icon: Bot },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/testimonials", label: "Testimonials", icon: Star },
  { href: "/onboarding", label: "Onboarding", icon: Zap },
];

const adminItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading ApexAI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold">ApexAI</span>
          </div>
          <h2 className="text-xl font-semibold">Sign in to continue</h2>
          <p className="text-muted-foreground text-sm">Access your campaign management dashboard</p>
          <Button className="w-full" onClick={() => (window.location.href = getLoginUrl())}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[var(--sidebar)] border-r border-border flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-foreground">ApexAI</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Outbound Engine</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Platform</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <div className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                </div>
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-4">Admin</p>
              {adminItems.map(({ href, label, icon: Icon }) => {
                const isActive = location === href;
                return (
                  <Link key={href} href={href}>
                    <div className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{label}</span>
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="px-3 py-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email ?? user?.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 min-h-screen overflow-auto">
        {children}
      </main>
      <AIAgent />
    </div>
  );
}
