import AIAgent from "@/components/AIAgent";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Megaphone,
  Calendar,
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
import { useState, useEffect } from "react";

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
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

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

  const sidebarWidth = collapsed ? "64px" : "224px";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        className="bg-[var(--sidebar)] border-r border-border flex flex-col fixed h-full z-20 transition-all duration-200"
      >
        {/* Logo + collapse button */}
        <div className="h-14 flex items-center border-b border-border px-3 gap-2 overflow-hidden">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 no-underline flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-foreground">ApexAI</span>
                <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Outbound Engine</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="flex items-center justify-center w-full no-underline">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
            </Link>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Platform
            </p>
          )}
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
            return (
              <div key={href} className="relative">
                <Link href={href}>
                  <div
                    onMouseEnter={() => collapsed && setTooltip(label)}
                    onMouseLeave={() => setTooltip(null)}
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }
                      ${collapsed ? "justify-center" : ""}
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                    {!collapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-40 flex-shrink-0" />}
                  </div>
                </Link>
                {/* Tooltip on hover when collapsed */}
                {collapsed && tooltip === label && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border border-border whitespace-nowrap z-50 pointer-events-none">
                    {label}
                  </div>
                )}
              </div>
            );
          })}

          {user?.role === "admin" && (
            <>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-4">
                  Admin
                </p>
              )}
              {adminItems.map(({ href, label, icon: Icon }) => {
                const isActive = location === href;
                return (
                  <div key={href} className="relative">
                    <Link href={href}>
                      <div
                        onMouseEnter={() => collapsed && setTooltip(label)}
                        onMouseLeave={() => setTooltip(null)}
                        className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium
                          ${isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }
                          ${collapsed ? "justify-center" : ""}
                        `}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </div>
                    </Link>
                    {collapsed && tooltip === label && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border border-border whitespace-nowrap z-50 pointer-events-none">
                        {label}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* User profile + collapse button */}
        <div className="px-2 py-3 border-t border-border space-y-1">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
              : <>
                  <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Collapse</span>
                </>
            }
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary transition-colors ${collapsed ? "justify-center" : ""}`}>
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email ?? user?.role}</p>
                  </div>
                )}
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
      <main
        style={{ marginLeft: sidebarWidth }}
        className="flex-1 min-h-screen overflow-auto transition-all duration-200"
      >
        {children}
      </main>
      <AIAgent />
    </div>
  );
}
