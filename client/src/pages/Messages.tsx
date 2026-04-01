import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Mail, MessageSquare, Send, Users, CheckCheck, Clock, AlertCircle,
  Sparkles, Eye, RefreshCw, Globe
} from "lucide-react";

const channelIcons: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="w-3.5 h-3.5 text-green-400" />,
  email: <Mail className="w-3.5 h-3.5 text-blue-400" />,
  voice: <span className="text-purple-400 text-xs">📞</span>,
  social: <Globe className="w-3.5 h-3.5 text-orange-400" />,
};

const statusColors: Record<string, string> = {
  sent: "text-blue-400",
  delivered: "text-green-400",
  read: "text-purple-400",
  replied: "text-yellow-400",
  failed: "text-red-400",
  pending: "text-gray-400",
  bounced: "text-red-400",
  queued: "text-gray-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  sent: <Send className="w-3 h-3" />,
  delivered: <CheckCheck className="w-3 h-3" />,
  read: <Eye className="w-3 h-3" />,
  replied: <RefreshCw className="w-3 h-3" />,
  failed: <AlertCircle className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
};

export default function Messages() {
  const [channelFilter, setChannelFilter] = useState("all");
  const [showSend, setShowSend] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [aiComposing, setAiComposing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [sendForm, setSendForm] = useState({
    leadId: "",
    channel: "sms" as "sms" | "email" | "social",
    subject: "",
    body: "",
    templateId: "",
  });
  const [bulkForm, setBulkForm] = useState({
    campaignId: "",
    channel: "sms" as "sms" | "email" | "social",
    subject: "",
    body: "",
    templateId: "",
  });

  const utils = trpc.useUtils();
  const { data: msgsData, isLoading, refetch } = trpc.messages.list.useQuery({
    channel: channelFilter !== "all" ? channelFilter : undefined,
    limit: 100,
  });
  const { data: leadsData } = trpc.leads.list.useQuery({ limit: 200 });
  const { data: campaignsData } = trpc.campaigns.list.useQuery({});
  const { data: templatesData } = trpc.templates.list.useQuery(undefined);

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.messages.list.invalidate();
      setShowSend(false);
      setSendForm({ leadId: "", channel: "sms", subject: "", body: "", templateId: "" });
      toast.success("Message sent successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkSendMutation = trpc.messages.bulkSend.useMutation({
    onSuccess: (d) => {
      utils.messages.list.invalidate();
      setShowBulk(false);
      setBulkForm({ campaignId: "", channel: "sms", subject: "", body: "", templateId: "" });
      toast.success(`Bulk send complete: ${d.sent} messages sent`);
    },
    onError: (e) => toast.error(e.message),
  });

  const aiComposeMutation = trpc.messages.aiCompose.useMutation({
    onSuccess: (d) => {
      setSendForm((f) => ({ ...f, body: d.body, subject: d.subject || f.subject }));
      setAiComposing(false);
      setAiPrompt("");
      toast.success("AI composed your message");
    },
    onError: (e) => toast.error(e.message),
  });

  const msgs = msgsData ?? [];
  const leads = leadsData?.leads ?? [];
  const campaigns = campaignsData?.campaigns ?? [];
  const templates = templatesData ?? [];

  const total = msgs.length;
  const delivered = msgs.filter((m) => ["delivered", "read", "replied"].includes(m.status ?? "")).length;
  const replied = msgs.filter((m) => m.status === "replied").length;
  const failed = msgs.filter((m) => m.status === "failed").length;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const replyRate = delivered > 0 ? Math.round((replied / delivered) * 100) : 0;

  const filteredMsgs = msgs.filter((m) => {
    if (activeTab === "all") return true;
    if (activeTab === "replied") return m.status === "replied";
    if (activeTab === "failed") return m.status === "failed";
    return m.channel === activeTab;
  });

  function applyTemplate(templateId: string, target: "send" | "bulk") {
    const t = templates.find((t) => t.id === parseInt(templateId));
    if (!t) return;
    if (target === "send") {
      setSendForm((f) => ({ ...f, body: t.body, subject: t.subject || f.subject, channel: t.channel as any, templateId }));
    } else {
      setBulkForm((f) => ({ ...f, body: t.body, subject: t.subject || f.subject, channel: t.channel as any, templateId }));
    }
    toast.success(`Template "${t.name}" applied`);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">SMS, Email & Social outreach — send, track, and manage all conversations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBulk(true)}>
            <Users className="w-4 h-4 mr-2" /> Bulk Send
          </Button>
          <Button size="sm" onClick={() => setShowSend(true)}>
            <Send className="w-4 h-4 mr-2" /> Send Message
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: total, icon: <Send className="w-4 h-4 text-primary" />, color: "text-foreground" },
          { label: "Delivered", value: delivered, icon: <CheckCheck className="w-4 h-4 text-green-400" />, color: "text-green-400" },
          { label: "Replied", value: replied, icon: <RefreshCw className="w-4 h-4 text-yellow-400" />, color: "text-yellow-400" },
          { label: "Failed", value: failed, icon: <AlertCircle className="w-4 h-4 text-red-400" />, color: "text-red-400" },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                {icon}
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Delivery Rate</p>
              <p className="text-xl font-bold text-green-400">{deliveryRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCheck className="w-5 h-5 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Reply Rate</p>
              <p className="text-xl font-bold text-yellow-400">{replyRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-semibold">Message History</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="bg-secondary border-border w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-4 pb-2">
              <TabsList className="bg-secondary h-8">
                <TabsTrigger value="all" className="text-xs h-6">All</TabsTrigger>
                <TabsTrigger value="sms" className="text-xs h-6">SMS</TabsTrigger>
                <TabsTrigger value="email" className="text-xs h-6">Email</TabsTrigger>
                <TabsTrigger value="social" className="text-xs h-6">Social</TabsTrigger>
                <TabsTrigger value="replied" className="text-xs h-6">Replied</TabsTrigger>
                <TabsTrigger value="failed" className="text-xs h-6">Failed</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading messages...</div>
              ) : filteredMsgs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No messages yet.</p>
                  <Button size="sm" className="mt-3" onClick={() => setShowSend(true)}>Send your first message</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Channel</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Lead</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Message</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Sent</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Campaign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMsgs.map((m) => {
                        const lead = leads.find((l) => l.id === m.leadId);
                        const campaign = campaigns.find((c) => c.id === m.campaignId);
                        return (
                          <tr key={m.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {channelIcons[m.channel]}
                                <span className="text-xs capitalize">{m.channel}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-medium">
                                {lead ? `${lead.firstName} ${lead.lastName}` : `Lead #${m.leadId}`}
                              </span>
                              {lead?.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {m.subject ? <><span className="font-medium text-foreground">{m.subject}:</span>{" "}</> : ""}
                                {m.body}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`flex items-center gap-1 text-xs font-medium ${statusColors[m.status ?? "pending"]}`}>
                                {statusIcons[m.status ?? "pending"]}
                                <span className="capitalize">{m.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                              {m.sentAt ? new Date(m.sentAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {campaign ? (
                                <Badge variant="outline" className="text-xs border-border">{campaign.name}</Badge>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Send Single Message Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Template Picker */}
            {templates.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Use a Template</p>
                <Select value={sendForm.templateId || undefined} onValueChange={(v) => applyTemplate(v, "send")}>
                  <SelectTrigger className="bg-secondary border-border text-xs h-8 w-full min-w-0">
                    <SelectValue placeholder="Pick a template to auto-fill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                        [{t.channel.toUpperCase()}] {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* AI Compose */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <p className="text-xs font-medium text-primary flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Compose
              </p>
              {aiComposing ? (
                <div className="flex gap-2">
                  <Input
                    className="bg-secondary border-border text-xs h-8"
                    placeholder='e.g. "Follow up on solar quote, friendly tone"'
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <Button size="sm" className="h-8 text-xs"
                    disabled={!aiPrompt || aiComposeMutation.isPending}
                    onClick={() => aiComposeMutation.mutate({
                      channel: sendForm.channel,
                      prompt: aiPrompt,
                      industry: leads.find((l) => l.id === parseInt(sendForm.leadId))?.industry || undefined,
                    })}>
                    {aiComposeMutation.isPending ? "..." : "Go"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAiComposing(false)}>Cancel</Button>
                </div>
              ) : (
                <button className="text-xs text-primary hover:underline" onClick={() => setAiComposing(true)}>
                  + Compose with AI
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Lead *</Label>
              <Select value={sendForm.leadId} onValueChange={(v) => setSendForm((f) => ({ ...f, leadId: v }))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select lead..." />
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

            <div className="space-y-1.5">
              <Label className="text-xs">Channel *</Label>
              <Select value={sendForm.channel} onValueChange={(v) => setSendForm((f) => ({ ...f, channel: v as any }))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sendForm.channel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Subject *</Label>
                <Input className="bg-secondary border-border" value={sendForm.subject} onChange={(e) => setSendForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Message Body *</Label>
              <Textarea
                className="bg-secondary border-border resize-none"
                rows={4}
                value={sendForm.body}
                onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Type your message or use AI Compose above..."
              />
              {sendForm.channel === "sms" && (
                <p className="text-xs text-muted-foreground">{sendForm.body.length}/160 characters</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button
              disabled={!sendForm.leadId || !sendForm.body || (sendForm.channel === "email" && !sendForm.subject) || sendMutation.isPending}
              onClick={() => sendMutation.mutate({
                leadId: parseInt(sendForm.leadId),
                channel: sendForm.channel,
                subject: sendForm.subject || undefined,
                body: sendForm.body,
                templateId: sendForm.templateId ? parseInt(sendForm.templateId) : undefined,
              })}
            >
              {sendMutation.isPending ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Bulk Send to Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
              This sends a personalized message to every contact assigned to the selected campaign.
            </div>

            {templates.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Use a Template</p>
                <Select value={bulkForm.templateId || undefined} onValueChange={(v) => applyTemplate(v, "bulk")}>
                  <SelectTrigger className="bg-secondary border-border text-xs h-8 w-full min-w-0">
                    <SelectValue placeholder="Pick a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                        [{t.channel.toUpperCase()}] {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Campaign *</Label>
              <Select value={bulkForm.campaignId || undefined} onValueChange={(v) => setBulkForm((f) => ({ ...f, campaignId: v }))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} ({c.totalContacts ?? 0} contacts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Channel *</Label>
              <Select value={bulkForm.channel} onValueChange={(v) => setBulkForm((f) => ({ ...f, channel: v as any }))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkForm.channel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Subject *</Label>
                <Input className="bg-secondary border-border" value={bulkForm.subject} onChange={(e) => setBulkForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Message Body *</Label>
              <Textarea
                className="bg-secondary border-border resize-none"
                rows={4}
                value={bulkForm.body}
                onChange={(e) => setBulkForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Use {{firstName}}, {{lastName}}, {{company}} for personalization..."
              />
              <p className="text-xs text-muted-foreground">
                Personalization tokens: <code className="bg-secondary px-1 rounded">{"{{firstName}}"}</code>{" "}
                <code className="bg-secondary px-1 rounded">{"{{company}}"}</code>{" "}
                <code className="bg-secondary px-1 rounded">{"{{industry}}"}</code>
              </p>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
            <Button
              disabled={!bulkForm.campaignId || !bulkForm.body || (bulkForm.channel === "email" && !bulkForm.subject) || bulkSendMutation.isPending}
              onClick={() => bulkSendMutation.mutate({
                campaignId: parseInt(bulkForm.campaignId),
                channel: bulkForm.channel,
                subject: bulkForm.subject || undefined,
                body: bulkForm.body,
                templateId: bulkForm.templateId ? parseInt(bulkForm.templateId) : undefined,
              })}
            >
              {bulkSendMutation.isPending ? "Sending..." : <><Users className="w-4 h-4 mr-2" /> Send to All Contacts</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
