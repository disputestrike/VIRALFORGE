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
  Settings2,
  Building2,
  BookOpen,
  GitBranch,
  Plug,
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
import { useTheme } from "@/contexts/ThemeContext";
import ApexLogo from "@/components/branding/ApexLogo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/voice-ai", label: "Voice AI", icon: Bot },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings2 },
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
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <div className="mb-8 flex items-center justify-center">
            <ApexLogo variant="wordmark" size="lg" imgClassName="rounded-md border border-border/40 px-3 py-2" />
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
        className={`bg-[var(--sidebar)] border-r border-border flex flex-col fixed h-full z-20 transition-all duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo + collapse button */}
        <div className="h-14 flex items-center border-b border-border px-3 gap-2 overflow-hidden">
          {!collapsed && (
            <Link href="/dashboard" className="flex flex-col gap-0.5 no-underline flex-1 min-w-0">
              <ApexLogo variant="full" size="xs" imgClassName="max-w-[148px] rounded-md border border-border/40 px-1.5 py-0.5" />
              <p className="text-[9px] text-muted-foreground leading-none">Outbound Engine</p>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="flex items-center justify-center w-full no-underline">
              <ApexLogo variant="mark" size="xs" imgClassName="rounded-md border border-border/40" />
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
              <div key={href} className="relative group">
                <Link href={href}>
                  <div
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
                {/* CSS tooltip — shows on group hover when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border border-border whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border" />
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
                  <div key={href} className="relative group">
                    <Link href={href}>
                      <div
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
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border border-border whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className="flex-1 min-h-screen overflow-auto transition-all duration-200 md:ml-[var(--sidebar-width)]"
        style={{ "--sidebar-width": sidebarWidth } as React.CSSProperties}
      >
        {/* Top bar with theme toggle */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-30">
          {/* Mobile hamburger */}
          <button className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="hidden md:block" />{/* spacer on desktop */}
          <div className="flex items-center gap-2">
            {/* Sun icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            {/* Toggle */}
            <button
              onClick={toggleTheme}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
              aria-label="Toggle theme"
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`} />
            </button>
            {/* Moon icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>
        </div>
        {children}
      </main>
      <AIAgent />
    </div>
  );
}
