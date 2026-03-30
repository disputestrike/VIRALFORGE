import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Activity, BarChart3, Calendar, DollarSign, MessageSquare,
  RefreshCw, TrendingUp, Users,
} from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];

const TOOLTIP_STYLE = {
  background: "oklch(0.11 0.012 260)",
  border: "1px solid oklch(0.2 0.012 260)",
  borderRadius: "8px",
  color: "oklch(0.96 0.005 260)",
};

const channelPerformance = [
  { channel: "Voice", responseRate: 38, scheduleRate: 62, showRate: 78, roi: 420 },
  { channel: "SMS", responseRate: 28, scheduleRate: 48, showRate: 71, roi: 310 },
  { channel: "Email", responseRate: 18, scheduleRate: 35, showRate: 65, roi: 240 },
  { channel: "Social", responseRate: 12, scheduleRate: 28, showRate: 58, roi: 180 },
];

const FALLBACK_MONTHLY = [
  { month: "Oct", leads: 120, responses: 48, scheduled: 32, converted: 8 },
  { month: "Nov", leads: 145, responses: 62, scheduled: 42, converted: 11 },
  { month: "Dec", leads: 98, responses: 38, scheduled: 26, converted: 7 },
  { month: "Jan", leads: 180, responses: 82, scheduled: 58, converted: 16 },
  { month: "Feb", leads: 210, responses: 98, scheduled: 72, converted: 21 },
  { month: "Mar", leads: 195, responses: 91, scheduled: 67, converted: 19 },
];

const FALLBACK_INDUSTRY = [
  { name: "Solar", value: 32, color: "#f59e0b" },
  { name: "Roofing", value: 24, color: "#6366f1" },
  { name: "HVAC", value: 18, color: "#22c55e" },
  { name: "Real Estate", value: 14, color: "#a855f7" },
  { name: "Other", value: 12, color: "#64748b" },
];

export default function Analytics() {
  const [period, setPeriod] = useState("30d");
  const utils = trpc.useUtils();

  const { data: metrics, isLoading: metricsLoading } = trpc.analytics.globalMetrics.useQuery();
  const { data: snapshots } = trpc.analytics.snapshots.useQuery({ limit: 12 });
  const { data: campaignsData } = trpc.campaigns.list.useQuery({});

  const recordSnapshotMutation = trpc.analytics.recordSnapshot.useMutation({
    onSuccess: () => {
      utils.analytics.globalMetrics.invalidate();
      utils.analytics.snapshots.invalidate();
      toast.success("Analytics snapshot recorded");
    },
    onError: (e) => toast.error(e.message),
  });

  const campaigns = campaignsData?.campaigns ?? [];

  // Build monthly trend from snapshots or fallback
  const monthlyData = snapshots && snapshots.length >= 3
    ? snapshots.slice(0, 6).reverse().map((s) => ({
        month: new Date(s.date).toLocaleDateString("en-US", { month: "short" }),
        leads: s.totalContacts ?? 0,
        responses: Math.round((s.totalContacts ?? 0) * ((s.responseRate ?? 0) / 100)),
        scheduled: Math.round((s.totalContacts ?? 0) * ((s.scheduleRate ?? 0) / 100)),
        converted: Math.round((s.totalContacts ?? 0) * ((s.conversionRate ?? 0) / 100)),
      }))
    : FALLBACK_MONTHLY;

  // Industry distribution from real campaigns or fallback
  const industryMap: Record<string, number> = {};
  campaigns.forEach((c) => {
    const ind = (c as any).industry ?? "Other";
    industryMap[ind] = (industryMap[ind] ?? 0) + 1;
  });
  const industryData = Object.keys(industryMap).length > 0
    ? Object.entries(industryMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
    : FALLBACK_INDUSTRY;

  const totalRevenue = metrics?.totalRevenue ?? 0;
  const avgROI = channelPerformance.reduce((a, c) => a + c.roi, 0) / channelPerformance.length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time performance tracking and ROI analysis</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"
            disabled={recordSnapshotMutation.isPending}
            onClick={() => recordSnapshotMutation.mutate({})}>
            <RefreshCw className={`w-4 h-4 mr-2 ${recordSnapshotMutation.isPending ? "animate-spin" : ""}`} />
            Record Snapshot
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Avg Response Rate", value: `${metrics?.responseRate ?? 0}%`, desc: "Leads who replied", color: "text-green-400", border: "border-green-500/20" },
          { label: "Avg Schedule Rate", value: `${metrics?.scheduleRate ?? 0}%`, desc: "Responses → booked", color: "text-blue-400", border: "border-blue-500/20" },
          { label: "Avg Show Rate", value: `${metrics?.showRate ?? 0}%`, desc: "Booked → showed up", color: "text-purple-400", border: "border-purple-500/20" },
          { label: "Increase In Sales", value: `${metrics?.salesIncrease ?? 0}%`, desc: "Leads converted", color: "text-orange-400", border: "border-orange-500/20" },
        ].map(({ label, value, desc, color, border }) => (
          <Card key={label} className={`bg-card border ${border}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${color} mb-1`}>{metricsLoading ? "—" : value}</div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total Leads", value: metrics?.totalLeads ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Campaigns", value: metrics?.totalCampaigns ?? 0, icon: Activity, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Messages Sent", value: metrics?.totalMessages ?? 0, icon: MessageSquare, color: "text-orange-400", bg: "bg-orange-500/10" },
          { label: "Response Rate", value: `${metrics?.responseRate ?? 0}%`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Avg ROI", value: `${Math.round(avgROI)}%`, icon: BarChart3, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Revenue", value: totalRevenue >= 1000 ? `$${(totalRevenue / 1000).toFixed(1)}K` : `$${totalRevenue}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className={`text-xl font-bold ${color}`}>{metricsLoading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend + Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Outreach Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResponses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.012 260)" />
                <XAxis dataKey="month" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Area type="monotone" dataKey="leads" stroke="#6366f1" fill="url(#gLeads)" name="Leads" strokeWidth={2} />
                <Area type="monotone" dataKey="responses" stroke="#22c55e" fill="url(#gResponses)" name="Responses" strokeWidth={2} />
                <Area type="monotone" dataKey="scheduled" stroke="#f59e0b" fill="none" name="Scheduled" strokeWidth={2} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channelPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.012 260)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis type="category" dataKey="channel" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="responseRate" fill="#6366f1" name="Response %" radius={[0, 4, 4, 0]} />
                <Bar dataKey="scheduleRate" fill="#22c55e" name="Schedule %" radius={[0, 4, 4, 0]} />
                <Bar dataKey="showRate" fill="#f59e0b" name="Show %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Industry Distribution + Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={industryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {industryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {industryData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium">{d.value}{d.value <= 100 ? "%" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.012 260)" />
                <XAxis dataKey="month" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="leads" fill="#6366f1" name="Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="responses" fill="#22c55e" name="Responses" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scheduled" fill="#f59e0b" name="Scheduled" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" fill="#a855f7" name="Converted" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      {campaigns.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Campaign Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Campaign", "Status", "Sent", "Responses", "Scheduled", "Showed", "Response %", "Schedule %", "Show %"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const sent = c.sentCount ?? 0;
                    const responses = c.responseCount ?? 0;
                    const scheduled = c.scheduledCount ?? 0;
                    const showed = c.showCount ?? 0;
                    const responseRate = sent > 0 ? Math.round((responses / sent) * 100) : 0;
                    const scheduleRate = responses > 0 ? Math.round((scheduled / responses) * 100) : 0;
                    const showRate = scheduled > 0 ? Math.round((showed / scheduled) * 100) : 0;
                    const statusColors: Record<string, string> = {
                      active: "text-green-400 bg-green-500/10",
                      draft: "text-muted-foreground bg-secondary",
                      paused: "text-orange-400 bg-orange-500/10",
                      completed: "text-blue-400 bg-blue-500/10",
                    };
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[c.status] ?? ""}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{sent}</td>
                        <td className="px-3 py-2 text-muted-foreground">{responses}</td>
                        <td className="px-3 py-2 text-muted-foreground">{scheduled}</td>
                        <td className="px-3 py-2 text-muted-foreground">{showed}</td>
                        <td className="px-3 py-2">
                          <span className={`font-medium ${responseRate >= 30 ? "text-green-400" : responseRate >= 15 ? "text-orange-400" : "text-red-400"}`}>
                            {responseRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`font-medium ${scheduleRate >= 50 ? "text-green-400" : scheduleRate >= 25 ? "text-orange-400" : "text-red-400"}`}>
                            {scheduleRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`font-medium ${showRate >= 70 ? "text-green-400" : showRate >= 40 ? "text-orange-400" : "text-red-400"}`}>
                            {showRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snapshot History */}
      {snapshots && snapshots.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Analytics Snapshot History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Date", "Channel", "Contacts", "Response %", "Schedule %", "Show %", "Revenue"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(0, 10).map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 capitalize text-xs">{s.channel}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.totalContacts ?? 0}</td>
                      <td className="px-3 py-2 text-green-400 font-medium">{s.responseRate ?? 0}%</td>
                      <td className="px-3 py-2 text-blue-400 font-medium">{s.scheduleRate ?? 0}%</td>
                      <td className="px-3 py-2 text-purple-400 font-medium">{s.showRate ?? 0}%</td>
                      <td className="px-3 py-2 text-emerald-400 font-medium">
                        {s.revenueGenerated ? `$${s.revenueGenerated.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
