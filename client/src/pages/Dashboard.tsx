import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Megaphone,
  MessageSquare,
  Phone,
  TrendingUp,
  Users,
  Zap,
  Activity,
  Calendar,
} from "lucide-react";

const mockTrendData = [
  { day: "Mon", responses: 12, scheduled: 8, showed: 6 },
  { day: "Tue", responses: 18, scheduled: 14, showed: 11 },
  { day: "Wed", responses: 15, scheduled: 10, showed: 8 },
  { day: "Thu", responses: 24, scheduled: 18, showed: 15 },
  { day: "Fri", responses: 28, scheduled: 22, showed: 19 },
  { day: "Sat", responses: 10, scheduled: 7, showed: 5 },
  { day: "Sun", responses: 8, scheduled: 5, showed: 4 },
];

const channelData = [
  { name: "Voice", value: 38, color: "#6366f1" },
  { name: "SMS", value: 28, color: "#22c55e" },
  { name: "Email", value: 22, color: "#f59e0b" },
  { name: "Social", value: 12, color: "#a855f7" },
];

export default function Dashboard() {
  const { data: metrics, isLoading } = trpc.analytics.globalMetrics.useQuery();
  const { data: campaignsData } = trpc.campaigns.list.useQuery({ limit: 5 });
  const { data: activityLogs } = trpc.admin.activityLogs.useQuery({ limit: 8 });
  const { data: apptStats } = trpc.appointments.stats.useQuery();
  const { data: upcomingAppts } = trpc.appointments.list.useQuery({ upcoming: true });
  const { data: onboardingData } = trpc.onboarding.list.useQuery();

  const metricCards = [
    {
      label: "Avg Response Rate",
      value: isLoading ? "—" : `${metrics?.responseRate ?? 0}%`,
      change: "+5.2%",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      icon: MessageSquare,
      desc: "vs last 30 days",
    },
    {
      label: "Avg Schedule Rate",
      value: isLoading ? "—" : `${metrics?.scheduleRate ?? 0}%`,
      change: "+3.1%",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      icon: TrendingUp,
      desc: "of all responses",
    },
    {
      label: "Avg Show Rate",
      value: isLoading ? "—" : `${metrics?.showRate ?? 0}%`,
      change: "+1.8%",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      icon: Users,
      desc: "appointment attendance",
    },
    {
      label: "Increase In Sales",
      value: isLoading ? "—" : `${metrics?.salesIncrease ?? 0}%`,
      change: "+12.4%",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      icon: BarChart3,
      desc: "vs baseline period",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Onboarding setup prompt for new users */}
      {!onboardingData?.length && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <Zap className="size-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Welcome! Complete your setup to go live</p>
              <p className="text-xs text-muted-foreground mt-0.5">Set up your AI voice, choose your industry, and import your first leads.</p>
            </div>
            <Link href="/onboarding">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
                Start Setup →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 24/7 AI Assistant activation prompt */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
        <span className="text-primary font-medium">24/7 AI Assistant</span>
        <span className="text-muted-foreground hidden sm:inline">· Activate to answer every inbound call automatically</span>
        <Link href="/settings#billing" className="ml-auto text-xs px-3 py-1 rounded-md font-medium flex-shrink-0"
          style={{ backgroundColor: "rgba(29,111,244,0.15)", color: "#60a5fa", border: "1px solid rgba(29,111,244,0.3)" }}>
          Activate from $149/mo →
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your outbound engine performance at a glance</p>
        </div>
        <div className="flex gap-3">
          <Link href="/campaigns">
            <Button variant="outline" size="sm">
              <Megaphone className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </Link>
          <Link href="/leads">
            <Button size="sm">
              <Users className="w-4 h-4 mr-2" />
              Add Leads
            </Button>
          </Link>
        </div>
      </div>

      {/* Appointments Quick Stats */}
      {apptStats && (apptStats.total > 0 || (upcomingAppts?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Appointments", value: apptStats.total, color: "text-blue-400", href: "/appointments" },
            { label: "Upcoming", value: apptStats.upcoming, color: "text-green-400", href: "/appointments" },
            { label: "Showed Up", value: apptStats.showed, color: "text-purple-400", href: "/appointments" },
            { label: "Show Rate", value: `${apptStats.showRate}%`, color: "text-orange-400", href: "/appointments" },
          ].map(({ label, value, color, href }) => (
            <Link key={label} href={href}>
              <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer text-center">
                <Calendar className={`w-4 h-4 mx-auto mb-2 ${color}`} />
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 4 Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map(({ label, value, change, color, bgColor, icon: Icon, desc }) => (
          <Card key={label} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10 text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  {change}
                </Badge>
              </div>
              <div className={`text-3xl font-black ${color} mb-1`}>{value}</div>
              <div className="text-sm font-medium text-foreground mb-0.5">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: metrics?.totalLeads ?? 0, icon: Users, color: "text-blue-400" },
          { label: "Active Campaigns", value: metrics?.totalCampaigns ?? 0, icon: Megaphone, color: "text-green-400" },
          { label: "Messages Sent", value: metrics?.totalMessages ?? 0, icon: MessageSquare, color: "text-orange-400" },
          { label: "Revenue Generated", value: `$${((metrics?.totalRevenue ?? 0) / 1000).toFixed(1)}K`, icon: TrendingUp, color: "text-purple-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
              <div>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Weekly Outreach Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockTrendData}>
                <defs>
                  <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.012 260)" />
                <XAxis dataKey="day" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.11 0.012 260)", border: "1px solid oklch(0.2 0.012 260)", borderRadius: "8px", color: "oklch(0.96 0.005 260)" }} />
                <Area type="monotone" dataKey="responses" stroke="#6366f1" fill="url(#colorResponses)" strokeWidth={2} name="Responses" />
                <Area type="monotone" dataKey="scheduled" stroke="#22c55e" fill="url(#colorScheduled)" strokeWidth={2} name="Scheduled" />
                <Area type="monotone" dataKey="showed" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Showed" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-400 inline-block" /> Responses</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400 inline-block" /> Scheduled</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block" /> Showed</span>
            </div>
          </CardContent>
        </Card>

        {/* Channel breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Channel Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {channelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.11 0.012 260)", border: "1px solid oklch(0.2 0.012 260)", borderRadius: "8px", color: "oklch(0.96 0.005 260)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {channelData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent campaigns */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Campaigns</CardTitle>
          <Link href="/campaigns">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!campaignsData?.campaigns?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No campaigns yet.</p>
              <Link href="/campaigns">
                <Button size="sm" className="mt-3">Create First Campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {campaignsData.campaigns.map((c) => {
                const channels: string[] = (() => {
                  try {
                    const raw = c.channels ?? "[]";
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [raw];
                  } catch { return c.channels ? [c.channels] : []; }
                })();
                const statusColors: Record<string, string> = { active: "apex-badge-active", draft: "apex-badge-draft", paused: "apex-badge-paused", completed: "text-blue-400 bg-blue-500/10 border-blue-500/30", archived: "text-gray-400 bg-gray-500/10 border-gray-500/30" };
                const responseRate = c.sentCount && c.sentCount > 0 ? Math.round(((c.responseCount ?? 0) / c.sentCount) * 100) : 0;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Megaphone className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{channels.join(", ")} · {c.totalContacts ?? 0} contacts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-semibold">{responseRate}%</p>
                          <p className="text-xs text-muted-foreground">response</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[c.status] ?? "text-gray-400"}`}>{c.status}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
