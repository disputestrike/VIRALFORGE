import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bot, CheckCircle2, Copy, Edit3, FileText, Info, Mail,
  MessageSquare, Phone, Plus, Share2, Sparkles, Trash2, Variable, Wand2
} from "lucide-react";

const CHANNELS = ["sms", "email", "voice", "social"] as const;
type Channel = typeof CHANNELS[number];

const INDUSTRIES = [
  "Solar", "Roofing", "HVAC", "Real Estate", "Insurance",
  "Financial Services", "Healthcare", "Legal", "Home Services", "B2B SaaS", "Other"
];

const GOALS = [
  "Book a consultation appointment",
  "Qualify the lead for sales",
  "Follow up after no response",
  "Re-engage cold leads",
  "Confirm a scheduled appointment",
  "Introduce company and services",
  "Offer a free estimate or demo",
  "Close a deal",
];

const TONES = ["Professional", "Friendly & Conversational", "Urgent & Direct", "Empathetic", "Bold & Confident", "Casual"];

const PERSONALIZATION_VARS = [
  { token: "{{firstName}}", desc: "Lead's first name" },
  { token: "{{lastName}}", desc: "Lead's last name" },
  { token: "{{company}}", desc: "Lead's company" },
  { token: "{{industry}}", desc: "Lead's industry" },
  { token: "{{city}}", desc: "Lead's city" },
  { token: "{{state}}", desc: "Lead's state" },
  { token: "{{callerName}}", desc: "AI caller's name" },
  { token: "{{companyName}}", desc: "Your company name" },
  { token: "{{appointmentDate}}", desc: "Scheduled appointment date" },
];

const channelIcons: Record<Channel, React.ReactNode> = {
  sms: <MessageSquare className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  voice: <Phone className="w-4 h-4" />,
  social: <Share2 className="w-4 h-4" />,
};

const channelColors: Record<Channel, string> = {
  sms: "text-green-400 bg-green-500/10 border-green-500/30",
  email: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  voice: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  social: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

export default function Templates() {
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showAIGen, setShowAIGen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [showVars, setShowVars] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "", channel: "sms" as Channel, subject: "", body: "",
  });

  const [aiForm, setAiForm] = useState({
    companyName: "", callerName: "", industry: "", goal: "",
    tone: "Professional", channel: "sms" as Channel,
    productDescription: "", keyValueProp: "", targetAudience: "", callToAction: "",
  });
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [saveGenName, setSaveGenName] = useState("");

  const utils = trpc.useUtils();
  const { data: templatesData, isLoading } = trpc.templates.list.useQuery({
    channel: activeChannel !== "all" ? activeChannel : undefined,
  });

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      setShowCreate(false);
      setCreateForm({ name: "", channel: "sms", subject: "", body: "" });
      toast.success("Template created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      setEditTemplate(null);
      toast.success("Template updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => { utils.templates.list.invalidate(); toast.success("Template deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const generateMutation = trpc.templates.generateWithAI.useMutation({
    onSuccess: (data) => {
      const content = data.content ?? "";
      if (aiForm.channel === "email") {
        const subjectMatch = content.match(/subject[:\s]+(.+)/i);
        if (subjectMatch) {
          setGeneratedSubject(subjectMatch[1].trim());
          setGeneratedContent(content.replace(/subject[:\s]+.+\n?/i, "").trim());
        } else {
          setGeneratedContent(content);
        }
      } else {
        setGeneratedContent(content);
      }
      toast.success("Template generated by AI");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveGeneratedMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      setShowAIGen(false);
      setGeneratedContent("");
      setGeneratedSubject("");
      setSaveGenName("");
      toast.success("Template saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const templates = templatesData ?? [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const insertVar = (token: string, target: "body" | "generated") => {
    if (target === "body") setCreateForm((f) => ({ ...f, body: f.body + " " + token }));
    else setGeneratedContent((c) => c + " " + token);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {templates.length} templates · Reusable outreach messages with personalization
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowVars(!showVars)}>
            <Variable className="w-4 h-4 mr-2" /> Variables
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAIGen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> AI Generate
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {showVars && (
        <Card className="bg-secondary/30 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Personalization Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PERSONALIZATION_VARS.map(({ token, desc }) => (
                <div key={token} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                  <div>
                    <code className="text-xs text-primary font-mono">{token}</code>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(token)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all" className="text-xs">All Channels</TabsTrigger>
          {CHANNELS.map((ch) => (
            <TabsTrigger key={ch} value={ch} className="text-xs capitalize">{ch}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeChannel} className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm mb-4">No templates yet.</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => setShowAIGen(true)}>
                  <Sparkles className="w-4 h-4 mr-2" /> AI Generate
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t: any) => {
                const ch = t.channel as Channel;
                const vars: string[] = (() => {
                  try { const p = JSON.parse(t.variables ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
                })();
                return (
                  <Card key={t.id} className="bg-card border-border hover:border-border/80 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg border ${channelColors[ch]}`}>
                            {channelIcons[ch]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{t.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${channelColors[ch]}`}>
                              {ch}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyToClipboard(t.body)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTemplate({ ...t })}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate({ id: t.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {t.subject && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground">Subject</p>
                          <p className="text-sm font-medium">{t.subject}</p>
                        </div>
                      )}

                      <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.body}</p>
                      </div>

                      {vars.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {vars.map((v) => (
                            <code key={v} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{v}</code>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── AI Generator Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAIGen} onOpenChange={setShowAIGen}>
        <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI Template Generator
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign Context</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Channel *</Label>
                  <Select value={aiForm.channel} onValueChange={(v) => setAiForm((f) => ({ ...f, channel: v as Channel }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => <SelectItem key={ch} value={ch} className="capitalize">{ch}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Industry *</Label>
                  <Select value={aiForm.industry || undefined} onValueChange={(v) => setAiForm((f) => ({ ...f, industry: v }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Your Company Name</Label>
                  <Input className="bg-secondary border-border" placeholder="e.g. SunPower Solutions"
                    value={aiForm.companyName} onChange={(e) => setAiForm((f) => ({ ...f, companyName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sender Name</Label>
                  <Input className="bg-secondary border-border" placeholder="e.g. Alex"
                    value={aiForm.callerName} onChange={(e) => setAiForm((f) => ({ ...f, callerName: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Goal *</Label>
                <Select value={aiForm.goal || undefined} onValueChange={(v) => setAiForm((f) => ({ ...f, goal: v }))}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="What should this message achieve?" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tone</Label>
                <Select value={aiForm.tone} onValueChange={(v) => setAiForm((f) => ({ ...f, tone: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Product / Service Description</Label>
                <Textarea className="bg-secondary border-border resize-none" rows={2}
                  placeholder="e.g. We install residential solar panels with $0 upfront cost..."
                  value={aiForm.productDescription}
                  onChange={(e) => setAiForm((f) => ({ ...f, productDescription: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Key Value Proposition</Label>
                <Input className="bg-secondary border-border" placeholder="e.g. Save 40% on electricity, no upfront cost"
                  value={aiForm.keyValueProp} onChange={(e) => setAiForm((f) => ({ ...f, keyValueProp: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Target Audience</Label>
                <Input className="bg-secondary border-border" placeholder="e.g. Homeowners in Texas with high electricity bills"
                  value={aiForm.targetAudience} onChange={(e) => setAiForm((f) => ({ ...f, targetAudience: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Call to Action</Label>
                <Input className="bg-secondary border-border" placeholder="e.g. Schedule a free consultation"
                  value={aiForm.callToAction} onChange={(e) => setAiForm((f) => ({ ...f, callToAction: e.target.value }))} />
              </div>

              <Button className="w-full"
                disabled={!aiForm.industry || !aiForm.goal || generateMutation.isPending}
                onClick={() => generateMutation.mutate({
                  channel: aiForm.channel,
                  industry: aiForm.industry,
                  goal: [
                    aiForm.goal,
                    aiForm.companyName ? `Company: ${aiForm.companyName}` : "",
                    aiForm.callerName ? `Sender name: ${aiForm.callerName}` : "",
                    aiForm.productDescription ? `Product: ${aiForm.productDescription}` : "",
                    aiForm.keyValueProp ? `Value prop: ${aiForm.keyValueProp}` : "",
                    aiForm.targetAudience ? `Audience: ${aiForm.targetAudience}` : "",
                    aiForm.callToAction ? `CTA: ${aiForm.callToAction}` : "",
                  ].filter(Boolean).join(". "),
                  tone: aiForm.tone,
                })}>
                {generateMutation.isPending ? (
                  <><Bot className="w-4 h-4 mr-2 animate-pulse" /> Generating...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" /> Generate Template</>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Template</h3>
              {generatedContent ? (
                <div className="space-y-3">
                  {aiForm.channel === "email" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Subject Line</Label>
                      <Input className="bg-secondary border-border" value={generatedSubject}
                        onChange={(e) => setGeneratedSubject(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Message Body</Label>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(generatedContent)}>
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <Textarea className="bg-secondary border-border resize-none font-mono text-xs" rows={12}
                      value={generatedContent} onChange={(e) => setGeneratedContent(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Quick Insert Variables</Label>
                    <div className="flex flex-wrap gap-1">
                      {PERSONALIZATION_VARS.slice(0, 6).map(({ token }) => (
                        <button key={token} type="button"
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono hover:bg-primary/20 transition-colors"
                          onClick={() => insertVar(token, "generated")}>
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Template Name</Label>
                    <Input className="bg-secondary border-border"
                      placeholder={`${aiForm.industry} ${aiForm.channel} template`}
                      value={saveGenName} onChange={(e) => setSaveGenName(e.target.value)} />
                  </div>
                  <Button className="w-full" disabled={saveGeneratedMutation.isPending}
                    onClick={() => saveGeneratedMutation.mutate({
                      name: saveGenName || `${aiForm.industry} ${aiForm.channel} template`,
                      channel: aiForm.channel,
                      subject: generatedSubject || undefined,
                      body: generatedContent,
                      variables: PERSONALIZATION_VARS.filter(({ token }) => generatedContent.includes(token)).map(({ token }) => token),
                    })}>
                    {saveGeneratedMutation.isPending ? "Saving..." : (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Template</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  <Sparkles className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Fill in the context fields and click</p>
                  <p className="text-sm font-semibold">Generate Template</p>
                  <p className="text-xs mt-2 opacity-60">The AI creates a fully personalized,<br />industry-specific message</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Template Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Template Name *</Label>
              <Input className="bg-secondary border-border" placeholder="e.g. Solar Follow-Up SMS"
                value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Channel *</Label>
              <Select value={createForm.channel} onValueChange={(v) => setCreateForm((f) => ({ ...f, channel: v as Channel }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((ch) => <SelectItem key={ch} value={ch} className="capitalize">{ch}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {createForm.channel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Subject Line</Label>
                <Input className="bg-secondary border-border" placeholder="Email subject..."
                  value={createForm.subject} onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Message Body *</Label>
                <div className="flex flex-wrap gap-1">
                  {["{{firstName}}", "{{company}}", "{{companyName}}"].map((v) => (
                    <button key={v} type="button"
                      className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono hover:bg-primary/20"
                      onClick={() => insertVar(v, "body")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea className="bg-secondary border-border resize-none font-mono text-xs" rows={6}
                placeholder="Hi {{firstName}}, this is {{callerName}} from {{companyName}}..."
                value={createForm.body} onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!createForm.name || !createForm.body || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: createForm.name,
                channel: createForm.channel,
                subject: createForm.subject || undefined,
                body: createForm.body,
                variables: PERSONALIZATION_VARS.filter(({ token }) => createForm.body.includes(token)).map(({ token }) => token),
              })}>
              {createMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Template Name</Label>
                <Input className="bg-secondary border-border" value={editTemplate.name}
                  onChange={(e) => setEditTemplate((t: any) => ({ ...t, name: e.target.value }))} />
              </div>
              {editTemplate.channel === "email" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Line</Label>
                  <Input className="bg-secondary border-border" value={editTemplate.subject ?? ""}
                    onChange={(e) => setEditTemplate((t: any) => ({ ...t, subject: e.target.value }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Message Body</Label>
                <Textarea className="bg-secondary border-border resize-none font-mono text-xs" rows={8}
                  value={editTemplate.body}
                  onChange={(e) => setEditTemplate((t: any) => ({ ...t, body: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button disabled={updateMutation.isPending}
              onClick={() => editTemplate && updateMutation.mutate({
                id: editTemplate.id,
                name: editTemplate.name,
                subject: editTemplate.subject || undefined,
                body: editTemplate.body,
                variables: PERSONALIZATION_VARS.filter(({ token }) => editTemplate.body.includes(token)).map(({ token }) => token),
              })}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
