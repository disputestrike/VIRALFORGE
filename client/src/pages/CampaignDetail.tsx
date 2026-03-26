import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Mail, MessageSquare, Pause, Phone, Play, Share2, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CampaignDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");

  const { data: campaign, isLoading } = trpc.campaigns.get.useQuery({ id });
  const { data: funnelData } = trpc.analytics.campaignFunnel.useQuery({ campaignId: id });
  const { data: contacts } = trpc.campaigns.getContacts.useQuery({ campaignId: id });
  const { data: messages } = trpc.messages.list.useQuery({ campaignId: id, limit: 10 });
  const utils = trpc.useUtils();
  const launchMutation = trpc.campaigns.launch.useMutation({ onSuccess: () => utils.campaigns.get.invalidate({ id }) });
  const pauseMutation = trpc.campaigns.pause.useMutation({ onSuccess: () => utils.campaigns.get.invalidate({ id }) });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!campaign) return <div className="p-6 text-muted-foreground">Campaign not found</div>;

  const channels: string[] = (() => { try { const r = campaign.channels ?? "[]"; const p = JSON.parse(r); return Array.isArray(p) ? p : [r]; } catch { return campaign.channels ? [campaign.channels] : []; } })();
  const channelIcons: Record<string, React.ReactNode> = { voice: <Phone className="w-3.5 h-3.5" />, sms: <MessageSquare className="w-3.5 h-3.5" />, email: <Mail className="w-3.5 h-3.5" />, social: <Share2 className="w-3.5 h-3.5" /> };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant="outline" className={`capitalize ${campaign.status === "active" ? "text-green-400 border-green-500/30" : campaign.status === "paused" ? "text-yellow-400 border-yellow-500/30" : "text-gray-400 border-gray-500/30"}`}>{campaign.status}</Badge>
          </div>
          {campaign.description && <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>}
        </div>
        <div className="flex gap-2">
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button size="sm" onClick={() => launchMutation.mutate({ id })}>
              <Play className="w-4 h-4 mr-1" /> Launch
            </Button>
          )}
          {campaign.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate({ id })}>
              <Pause className="w-4 h-4 mr-1" /> Pause
            </Button>
          )}
        </div>
      </div>

      {/* Channels & Info */}
      <div className="flex gap-2 flex-wrap">
        {channels.map((ch) => (
          <span key={ch} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border bg-secondary text-muted-foreground font-medium">
            {channelIcons[ch]} {ch}
          </span>
        ))}
        {campaign.industry && <Badge variant="outline" className="text-xs">{campaign.industry}</Badge>}
        <Badge variant="outline" className="text-xs capitalize">{campaign.goal?.replace("_", " ")}</Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contacts", value: campaign.totalContacts ?? 0, color: "text-blue-400" },
          { label: "Messages Sent", value: campaign.sentCount ?? 0, color: "text-green-400" },
          { label: "Responses", value: campaign.responseCount ?? 0, color: "text-orange-400" },
          { label: "Appointments", value: campaign.scheduledCount ?? 0, color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      {funnelData && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData.funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.012 260)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="stage" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: "oklch(0.11 0.012 260)", border: "1px solid oklch(0.2 0.012 260)", borderRadius: "8px", color: "oklch(0.96 0.005 260)" }} formatter={(v: number) => [`${v}%`, "Rate"]} />
                <Bar dataKey="rate" fill="oklch(0.62 0.22 255)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 text-sm text-muted-foreground text-center">
              ROI: <span className="text-green-400 font-semibold">{funnelData.roi}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent messages */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {!messages?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No messages sent yet.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">{m.channel}</span>
                    <span className="text-muted-foreground truncate max-w-xs">{m.body}</span>
                  </div>
                  <span className={`text-xs ${m.status === "delivered" ? "text-green-400" : m.status === "failed" ? "text-red-400" : "text-muted-foreground"}`}>{m.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
