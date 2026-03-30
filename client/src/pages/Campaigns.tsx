import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Archive, BarChart3, Bot, Calendar, Calendar as CalendarIcon, CheckCircle2, Mail, Megaphone,
  MessageSquare, Pause, Phone, Play, Plus, RefreshCw, Share2, Target,
  Trash2, UserPlus, Users, Zap
} from "lucide-react";

const channelIcons: Record<string, React.ReactNode> = {
  voice: <Phone className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  social: <Share2 className="w-3.5 h-3.5" />,
};

const channelColors: Record<string, string> = {
  voice: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  sms: "text-green-400 bg-green-500/10 border-green-500/30",
  email: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  social: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-green-400 bg-green-500/10 border-green-500/30" },
  draft: { label: "Draft", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  paused: { label: "Paused", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  completed: { label: "Completed", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  archived: { label: "Archived", color: "text-gray-400 bg-gray-500/10 border-gray-500/30" },
};

const CHANNELS = ["voice", "sms", "email", "social"] as const;
const GOALS = ["appointments", "demos", "sales", "awareness", "follow_up"] as const;
const INDUSTRIES = ["Roofing", "Solar", "HVAC", "Real Estate", "Insurance", "Financial Services", "Healthcare", "Legal", "Home Services", "B2B SaaS", "Other"];

export default function Campaigns() {
  const [showCreate, setShowCreate] = useState(false);
  const [showAddContact, setShowAddContact] = useState<number | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    name: "", description: "", goal: "appointments" as typeof GOALS[number],
    industry: "", dailyLimit: "50", startDate: "", endDate: "",
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.campaigns.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: leadsData } = trpc.leads.list.useQuery({ limit: 500 });

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      setShowCreate(false);
      setSelectedChannels([]);
      setForm({ name: "", description: "", goal: "appointments", industry: "", dailyLimit: "50", startDate: "", endDate: "" });
      toast.success("Campaign created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const launchMutation = trpc.campaigns.launch.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign launched!"); },
    onError: (e) => toast.error(e.message),
  });

  const pauseMutation = trpc.campaigns.pause.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign paused"); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.campaigns.update.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const addContactMutation = trpc.campaigns.addContact.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); setShowAddContact(null); toast.success("Lead added to campaign"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const campaigns = data?.campaigns ?? [];
  const leads = leadsData?.leads ?? [];

  const stats = {
    total: data?.total ?? 0,
    active: campaigns.filter((c) => c.status === "active").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">{stats.total} campaigns · Multi-channel outreach automation</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active", count: stats.active, color: "text-green-400", icon: <Zap className="w-4 h-4 text-green-400" /> },
          { label: "Draft", count: stats.draft, color: "text-yellow-400", icon: <Target className="w-4 h-4 text-yellow-400" /> },
          { label: "Paused", count: stats.paused, color: "text-orange-400", icon: <Pause className="w-4 h-4 text-orange-400" /> },
          { label: "Completed", count: stats.completed, color: "text-blue-400", icon: <CheckCircle2 className="w-4 h-4 text-blue-400" /> },
        ].map(({ label, count, color, icon }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                {icon}
              </div>
              <div className={`text-2xl font-bold ${color}`}>{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs + Campaign List */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
          <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16">
              <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No campaigns yet. Create your first campaign.</p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Campaign
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((c) => {
                const channels: string[] = (() => {
                  try { return JSON.parse(c.channels as string); } catch { return []; }
                })();
                const responseRate = c.sentCount && c.sentCount > 0
                  ? Math.round(((c.responseCount ?? 0) / c.sentCount) * 100) : 0;
                const scheduleRate = c.responseCount && c.responseCount > 0
                  ? Math.round(((c.scheduledCount ?? 0) / c.responseCount) * 100) : 0;
                const cfg = statusConfig[c.status ?? "draft"] ?? statusConfig.draft;

                return (
                  <Card key={c.id} className="bg-card border-border hover:border-border/80 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm">{c.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            {c.industry && <Badge variant="outline" className="text-xs border-border">{c.industry}</Badge>}
                            {c.goal && <Badge variant="outline" className="text-xs border-border capitalize">{c.goal.replace("_", " ")}</Badge>}
                          </div>
                          {c.description && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{c.description}</p>
                          )}

                          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            {channels.map((ch) => (
                              <span key={ch} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${channelColors[ch] ?? ""}`}>
                                {channelIcons[ch]}
                                <span className="capitalize">{ch}</span>
                              </span>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-muted-foreground">Contacts</p>
                              <p className="text-sm font-bold">{c.totalContacts ?? 0}</p>
                            </div>
                            <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-muted-foreground">Sent</p>
                              <p className="text-sm font-bold">{c.sentCount ?? 0}</p>
                            </div>
                            <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-muted-foreground">Response Rate</p>
                              <p className="text-sm font-bold text-green-400">{responseRate}%</p>
                            </div>
                            <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-muted-foreground">Schedule Rate</p>
                              <p className="text-sm font-bold text-blue-400">{scheduleRate}%</p>
                            </div>
                          </div>

                          {(c.startDate || c.endDate) && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {c.startDate && <span>Started {new Date(c.startDate).toLocaleDateString()}</span>}
                              {c.endDate && <span>· Ends {new Date(c.endDate).toLocaleDateString()}</span>}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          {(c.status === "draft" || c.status === "paused") && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => launchMutation.mutate({ id: c.id })}
                              disabled={launchMutation.isPending}>
                              <Play className="w-3 h-3 mr-1" />
                              {c.status === "paused" ? "Resume" : "Launch"}
                            </Button>
                          )}
                          {c.status === "active" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => pauseMutation.mutate({ id: c.id })}
                              disabled={pauseMutation.isPending}>
                              <Pause className="w-3 h-3 mr-1" /> Pause
                            </Button>
                          )}
                          {(c.status === "active" || c.status === "paused") && (
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => updateMutation.mutate({ id: c.id, status: "completed" })}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => setShowAddContact(c.id)}>
                            <UserPlus className="w-3 h-3 mr-1" /> Add Lead
                          </Button>
                          <Link href={`/campaigns/${c.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs w-full">
                              <BarChart3 className="w-3 h-3 mr-1" /> Details
                            </Button>
                          </Link>
                          {c.status === "completed" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                              onClick={() => updateMutation.mutate({ id: c.id, status: "archived" })}>
                              <Archive className="w-3 h-3 mr-1" /> Archive
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate({ id: c.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign Name *</Label>
              <Input className="bg-secondary border-border" placeholder="e.g. Solar Q1 Outreach" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea className="bg-secondary border-border resize-none" rows={2} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Goal</Label>
                <Select value={form.goal} onValueChange={(v) => setForm((f) => ({ ...f, goal: v as typeof GOALS[number] }))}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Channels * (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map((ch) => (
                  <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      selectedChannels.includes(ch)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                    }`}>
                    {channelIcons[ch]}
                    <span className="capitalize">{ch}</span>
                    {selectedChannels.includes(ch) && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" style={{ overflow: "visible" }}>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                  Start Date
                </Label>
                <Input
                  className="bg-secondary border-border cursor-pointer w-full"
                  type="date"
                  value={form.startDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  style={{ colorScheme: "dark" }}
                />
                {form.startDate && (
                  <p className="text-xs text-primary">
                    {new Date(form.startDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                  End Date
                </Label>
                <Input
                  className="bg-secondary border-border cursor-pointer w-full"
                  type="date"
                  value={form.endDate}
                  min={form.startDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  style={{ colorScheme: "dark" }}
                />
                {form.endDate && form.startDate && (
                  <p className="text-xs text-muted-foreground">
                    {Math.max(1, Math.ceil((new Date(form.endDate + "T12:00:00").getTime() - new Date(form.startDate + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24)))} day campaign
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Daily Contact Limit</Label>
              <Input className="bg-secondary border-border" type="number" value={form.dailyLimit}
                onChange={(e) => setForm((f) => ({ ...f, dailyLimit: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Max contacts to reach per day across all channels</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!form.name || selectedChannels.length === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: form.name,
                description: form.description || undefined,
                channels: selectedChannels as any,
                goal: form.goal,
                industry: form.industry || undefined,
                dailyLimit: parseInt(form.dailyLimit) || 50,
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
              })}
            >
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead to Campaign Dialog */}
      <Dialog open={showAddContact !== null} onOpenChange={() => setShowAddContact(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Lead to Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Select a lead to add to this campaign. They will receive outreach via the campaign's configured channels.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Select Lead</Label>
              <Select onValueChange={(v) => {
                if (showAddContact !== null) {
                  addContactMutation.mutate({ campaignId: showAddContact, leadId: parseInt(v) });
                }
              }}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Choose a lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {l.firstName} {l.lastName}{l.company ? ` — ${l.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addContactMutation.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> Adding lead...
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContact(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
