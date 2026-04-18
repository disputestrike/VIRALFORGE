import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, AlertTriangle, BarChart3, CheckCircle, Database, Download, Mic, Pencil, Phone, RefreshCw, Save, Settings, Shield, Users, X } from "lucide-react";
import { useLocation } from "wouter";

const DEFAULT_CONFIG = [
  { key: "voice_model", value: "Neural TTS v3", category: "voice", label: "Voice Model" },
  { key: "default_language", value: "English (US)", category: "voice", label: "Default Language" },
  { key: "call_recording", value: "enabled", category: "voice", label: "Call Recording" },
  { key: "max_concurrent_calls", value: "50", category: "voice", label: "Max Concurrent Calls" },
  { key: "daily_sms_limit", value: "500", category: "limits", label: "Daily SMS Limit (per user)" },
  { key: "daily_email_limit", value: "1000", category: "limits", label: "Daily Email Limit (per user)" },
  { key: "daily_call_limit", value: "200", category: "limits", label: "Daily Call Limit (per user)" },
  { key: "rate_limiting", value: "active", category: "limits", label: "Rate Limiting" },
  { key: "signalwire_status", value: "connected", category: "integrations", label: "SignalWire (Voice/SMS)" },
  { key: "sendgrid_status", value: "connected", category: "integrations", label: "SendGrid (Email)" },
  { key: "linkedin_api_status", value: "pending", category: "integrations", label: "LinkedIn API" },
  { key: "crm_webhook", value: "not_configured", category: "integrations", label: "CRM Webhook URL" },
  { key: "session_timeout", value: "24h", category: "security", label: "Session Timeout" },
  { key: "two_factor_auth", value: "optional", category: "security", label: "2FA" },
  { key: "data_encryption", value: "AES-256", category: "security", label: "Data Encryption" },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  voice: Settings,
  limits: AlertTriangle,
  integrations: Database,
  security: Shield,
};

const CATEGORY_LABELS: Record<string, string> = {
  voice: "AI Voice Settings",
  limits: "Outreach Limits",
  integrations: "Integrations",
  security: "Security",
};

export default function Admin() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("users");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const isAdmin = user?.role === "admin";

  const utils = trpc.useUtils();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (user.role === "admin") return;
    navigate("/dashboard");
  }, [loading, navigate, user]);

  const { data: users } = trpc.admin.users.useQuery(undefined, { enabled: isAdmin });
  const { data: disabledUserIds } = trpc.admin.disabledUserIds.useQuery(undefined, { enabled: isAdmin });
  const { data: stats } = trpc.admin.systemStats.useQuery(undefined, { enabled: isAdmin });
  const { data: logs } = trpc.admin.activityLogs.useQuery({ limit: 100 }, { enabled: isAdmin });
  const { data: integrationReadiness, refetch: refetchReadiness, isFetching: readinessRefreshing } = trpc.admin.integrationReadiness.useQuery(undefined, { enabled: isAdmin });
  const { data: campaigns } = trpc.campaigns.list.useQuery({}, { enabled: isAdmin });
  const { data: savedConfig } = trpc.admin.getConfig.useQuery(undefined, { enabled: isAdmin });
  const { data: voiceMetrics } = trpc.admin.voiceMetricEvents.useQuery({ limit: 200 }, { enabled: isAdmin });
  const { data: voiceLatency } = trpc.admin.voiceMetricLatencySummary.useQuery({ sampleLimit: 500 }, { enabled: isAdmin });
  const { data: demoConfig } = trpc.demoCall.config.useQuery();

  const promoteUserMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { utils.admin.users.invalidate(); toast.success("User role updated"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setConfigMutation = trpc.admin.setConfig.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); setEditingKey(null); toast.success("Configuration saved"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setUserDisabledMutation = trpc.admin.setUserDisabled.useMutation({
    onSuccess: (_, variables) => {
      utils.admin.disabledUserIds.invalidate();
      utils.admin.activityLogs.invalidate();
      toast.success(variables.disabled ? "User disabled" : "User reactivated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const exportAuditMutation = trpc.admin.exportAudit.useMutation({
    onSuccess: (payload) => {
      const blob = new Blob([payload.content], { type: payload.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success(`Audit export downloaded (${payload.rowCount} activity rows)`);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Merge saved config with defaults
  const configMap: Record<string, string> = {};
  DEFAULT_CONFIG.forEach((d) => { configMap[d.key] = d.value; });
  (savedConfig ?? []).forEach((c) => { configMap[c.key] = c.value; });

  // Group config by category
  const configByCategory: Record<string, typeof DEFAULT_CONFIG> = {};
  DEFAULT_CONFIG.forEach((item) => {
    if (!configByCategory[item.category]) configByCategory[item.category] = [];
    configByCategory[item.category].push(item);
  });

  const getStatusColor = (value: string) => {
    const v = value.toLowerCase();
    if (v === "enabled" || v === "active" || v === "connected") return "text-green-400";
    if (v === "pending" || v === "optional") return "text-orange-400";
    if (v === "not_configured" || v === "disabled") return "text-red-400";
    return "";
  };

  if (loading || !user) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-sm text-muted-foreground">Loading admin access…</CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" /> Admin access required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Your account is authenticated but does not have admin permissions for this workspace.</p>
            <div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">User management, campaign oversight, and system configuration</p>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Total Campaigns", value: stats?.totalCampaigns ?? 0, icon: BarChart3, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Total Leads", value: stats?.totalLeads ?? 0, icon: Database, color: "text-orange-400", bg: "bg-orange-500/10" },
          { label: "Admin Users", value: stats?.adminUsers ?? 0, icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="integrations">Readiness</TabsTrigger>
          <TabsTrigger value="voice-metrics">Voice traces</TabsTrigger>
          <TabsTrigger value="config">System Config</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["User", "Email", "Login Method", "Role", "Account", "Joined", "Last Sign In", "Actions"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(users ?? []).map((u) => (
                      (() => {
                        const isDisabled = (disabledUserIds ?? []).includes(u.id);
                        return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{u.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{u.email ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground capitalize text-xs">{u.loginMethod ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-xs capitalize ${u.role === "admin" ? "text-red-400 border-red-500/30 bg-red-500/5" : "text-muted-foreground"}`}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-xs ${isDisabled ? "text-orange-300 border-orange-500/40 bg-orange-500/10" : "text-green-300 border-green-500/40 bg-green-500/10"}`}>
                            {isDisabled ? "Disabled" : "Active"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(u.lastSignedIn).toLocaleDateString()}</td>
                        <td className="px-3 py-2">
                          {u.id !== user?.id ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={u.role}
                                onValueChange={(role) => promoteUserMutation.mutate({ userId: u.id, role: role as "admin" | "user" })}
                              >
                                <SelectTrigger className="h-7 w-24 bg-secondary border-border text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant={isDisabled ? "outline" : "secondary"}
                                className="h-7 text-[11px]"
                                onClick={() => setUserDisabledMutation.mutate({ userId: u.id, disabled: !isDisabled })}
                                disabled={setUserDisabledMutation.isPending}
                              >
                                {isDisabled ? "Reactivate" : "Disable"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">You</span>
                          )}
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
                {!users?.length && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No users found</div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Disabled users are blocked from new authenticated sessions until reactivated by an admin.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Campaign Oversight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campaign", "Channels", "Status", "Contacts", "Sent", "Responses", "Scheduled", "Showed", "Response %"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(campaigns?.campaigns ?? []).map((c) => {
                      const responseRate = c.sentCount ? Math.round(((c.responseCount ?? 0) / c.sentCount) * 100) : 0;
                      const channels: string[] = (() => { try { return JSON.parse(c.channels ?? "[]"); } catch { return []; } })();
                      const statusColors: Record<string, string> = {
                        active: "text-green-400 border-green-500/30",
                        draft: "text-muted-foreground",
                        paused: "text-orange-400 border-orange-500/30",
                        completed: "text-blue-400 border-blue-500/30",
                      };
                      return (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="px-3 py-2 font-medium">{c.name}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 flex-wrap">
                              {channels.map((ch) => (
                                <Badge key={ch} variant="outline" className="text-[10px] capitalize">{ch}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={`text-xs capitalize ${statusColors[c.status] ?? ""}`}>{c.status}</Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{c.totalContacts ?? 0}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.sentCount ?? 0}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.responseCount ?? 0}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.scheduledCount ?? 0}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.showCount ?? 0}</td>
                          <td className="px-3 py-2">
                            <span className={`font-medium ${responseRate >= 30 ? "text-green-400" : responseRate >= 15 ? "text-orange-400" : "text-red-400"}`}>{responseRate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!campaigns?.campaigns?.length && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No campaigns found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Activity Logs
                <span className="ml-auto text-xs text-muted-foreground font-normal">{logs?.length ?? 0} entries</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => exportAuditMutation.mutate({ days: 7, format: "csv" })}
                  disabled={exportAuditMutation.isPending}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export 7d CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => exportAuditMutation.mutate({ days: 30, format: "json" })}
                  disabled={exportAuditMutation.isPending}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export 30d JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {(logs ?? []).map((log) => {
                  const actionColors: Record<string, string> = {
                    created: "bg-green-500",
                    updated: "bg-blue-500",
                    deleted: "bg-red-500",
                    role_updated: "bg-purple-500",
                    config_updated: "bg-orange-500",
                    verified: "bg-emerald-500",
                    called: "bg-indigo-500",
                    sent: "bg-cyan-500",
                  };
                  const dotColor = actionColors[log.action] ?? "bg-primary";
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium capitalize">
                          <span className="text-foreground">{log.action.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground"> · {log.entityType}</span>
                        </p>
                        {log.description && <p className="text-xs text-muted-foreground truncate">{log.description}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                {!logs?.length && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No activity logs yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Integration readiness
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {integrationReadiness?.readyCount ?? 0}/{integrationReadiness?.totalCount ?? 0} ready
                </span>
              </CardTitle>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Live env readiness based on configured providers and runtime dependencies.
                </p>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => refetchReadiness()} disabled={readinessRefreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${readinessRefreshing ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Readiness score</div>
                  <div className="text-lg font-semibold">{integrationReadiness?.readinessScore ?? 0}%</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2 md:col-span-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Blockers</div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    {integrationReadiness?.blockers?.length ? integrationReadiness.blockers.join(" • ") : "No blockers detected"}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Check",
                        "Status",
                        "Details",
                      ].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(integrationReadiness?.checks ?? []).map((check) => (
                      <tr key={check.key} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="px-3 py-2 text-sm font-medium">{check.label}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-xs ${check.ready ? "text-green-300 border-green-500/40 bg-green-500/10" : "text-red-300 border-red-500/40 bg-red-500/10"}`}>
                            {check.ready ? "Ready" : "Missing"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{check.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice pipeline traces (DB-backed) */}
        <TabsContent value="voice-metrics" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" /> Voice pipeline traces
                <span className="ml-auto text-xs text-muted-foreground font-normal">{voiceMetrics?.length ?? 0} rows</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Latency phases from the live engine (SignalWire → Deepgram → Grok → Cartesia). Requires the{" "}
                <code className="text-[10px]">voice_metric_events</code> table and{" "}
                <code className="text-[10px]">VOICE_METRICS_PERSIST</code> not set to{" "}
                <code className="text-[10px]">false</code>.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                  { label: "STT→TTS samples", value: voiceLatency?.count ?? 0 },
                  { label: "p50 (ms)", value: voiceLatency?.p50 ?? "—" },
                  { label: "p95 (ms)", value: voiceLatency?.p95 ?? "—" },
                  { label: "avg (ms)", value: voiceLatency?.avg ?? "—" },
                ].map((cell) => (
                  <div key={cell.label} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{cell.label}</div>
                    <div className="text-lg font-semibold tabular-nums">{cell.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Demo line", value: demoConfig?.enabled ? "Enabled" : "Disabled" },
                  { label: "Demo mode", value: demoConfig?.mode ?? "unknown" },
                  { label: "Public number", value: demoConfig?.formattedPhoneNumber ?? "not set" },
                  { label: "Dial-in ready", value: demoConfig?.telHref ? "Yes" : "No" },
                ].map((cell) => (
                  <div key={cell.label} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{cell.label}</div>
                    <div className="text-sm font-semibold break-all">{cell.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2 mb-4 flex items-start gap-2">
                <Phone className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Public demo configuration is surfaced here so admins can confirm the website test path is actually live before traffic hits the landing page.
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Percentiles use persisted <code className="text-[10px]">latency_stt_final_to_tts_first</code> rows (after calls produce audio).
              </p>
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-[1]">
                    <tr className="border-b border-border">
                      {["Time", "Phase", "+ms", "Session", "Call", "Extra"].map((h) => (
                        <th key={h} className="text-left px-2 py-2 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(voiceMetrics ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 align-top">
                        <td className="px-2 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                          {row.createdAt
                            ? (row.createdAt instanceof Date
                                ? row.createdAt
                                : new Date(row.createdAt as string)
                              ).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px]">{row.phase}</td>
                        <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{row.msSinceCallStart ?? "—"}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] max-w-[140px] truncate" title={row.sessionId ?? ""}>
                          {row.sessionId ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px] max-w-[120px] truncate" title={row.callId ?? ""}>
                          {row.callId ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-muted-foreground max-w-md break-all">
                          {row.extra != null ? JSON.stringify(row.extra) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!voiceMetrics?.length && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No trace rows yet (or table not migrated)</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Config Tab — fully editable, saves to DB */}
        <TabsContent value="config" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(configByCategory).map(([category, items]) => {
              const Icon = CATEGORY_ICONS[category] ?? Settings;
              return (
                <Card key={category} className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" /> {CATEGORY_LABELS[category] ?? category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map(({ key, label }) => {
                        const currentValue = configMap[key] ?? "";
                        const isEditing = editingKey === key;
                        return (
                          <div key={key} className="flex items-center justify-between gap-2">
                            <Label className="text-xs text-muted-foreground flex-shrink-0 w-40">{label}</Label>
                            {isEditing ? (
                              <div className="flex items-center gap-1 flex-1">
                                <Input
                                  className="h-7 text-xs bg-secondary border-border flex-1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setConfigMutation.mutate({ key, value: editValue, category });
                                    if (e.key === "Escape") setEditingKey(null);
                                  }}
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:text-green-300"
                                  onClick={() => setConfigMutation.mutate({ key, value: editValue, category })}>
                                  <Save className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                                  onClick={() => setEditingKey(null)}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className={`text-xs font-medium ${getStatusColor(currentValue)}`}>
                                  {currentValue.replace(/_/g, " ")}
                                </span>
                                {(savedConfig ?? []).find((c) => c.key === key) && (
                                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                )}
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setEditingKey(key); setEditValue(currentValue); }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-400" /> Values with a green checkmark are saved to the database. Click the pencil icon to edit any setting.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
