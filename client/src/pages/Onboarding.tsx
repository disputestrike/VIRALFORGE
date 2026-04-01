import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, MessageSquare, Phone, Plus, Rocket, Settings, Target, Users, Zap } from "lucide-react";

const SETUP_PHASES = [
  {
    phase: 1, title: "Account Setup", duration: "Day 1", icon: Settings,
    steps: ["Connect your CRM or upload lead list", "Configure AI voice settings and persona", "Set up SMS and email integrations", "Define your ideal customer profile"],
  },
  {
    phase: 2, title: "Campaign Configuration", duration: "Days 2-3", icon: Zap,
    steps: ["Build your first outreach campaign", "Select channels (Voice, SMS, Email, Social)", "Set daily contact limits and schedules", "Review and approve AI scripts"],
  },
  {
    phase: 3, title: "Launch & Monitor", duration: "Days 4-7", icon: Rocket,
    steps: ["Launch first campaign with 50 test contacts", "Monitor response rates and call quality", "Review AI conversation recordings", "Adjust scripts based on early results"],
  },
  {
    phase: 4, title: "Optimization", duration: "Days 8-30", icon: Target,
    steps: ["A/B test different scripts and channels", "Scale to full contact list", "Implement follow-up sequences", "Track ROI and conversion metrics"],
  },
];

const SUPPORT_TIMELINE = [
  { day: "Day 1", title: "Expert Onboarding Call", desc: "1-on-1 session with your dedicated success manager to configure everything", icon: Phone },
  { day: "Day 3", title: "Campaign Review", desc: "We review your first campaign setup and make optimization recommendations", icon: Settings },
  { day: "Day 7", title: "First Week Check-in", desc: "Review early results, adjust targeting and scripts based on real data", icon: MessageSquare },
  { day: "Day 14", title: "Performance Analysis", desc: "Deep dive into response rates, show rates, and conversion data", icon: Target },
  { day: "Day 21", title: "Scale Strategy", desc: "Plan your expansion — more leads, more campaigns, more channels", icon: Users },
  { day: "Day 30", title: "30-Day Results Review", desc: "Full ROI analysis and roadmap for the next 90 days", icon: Zap },
];

const ALL_STEPS = ["account_setup", "industry_select", "phone_provision", "campaign_config", "lead_import", "template_setup", "test_campaign", "go_live"];
const STEP_LABELS: Record<string, string> = {
  account_setup: "Account Setup",
  industry_select: "Choose Your Industry",
  phone_provision: "Get Your AI Phone Number",
  campaign_config: "Campaign Configuration",
  lead_import: "Lead Import",
  template_setup: "Template Setup",
  test_campaign: "Test Campaign",
  go_live: "Go Live — 24/7 AI Active",
};

const INDUSTRIES = ["Solar", "Roofing", "HVAC", "Real Estate", "Insurance", "Financial Services", "Healthcare", "Legal", "Home Services", "B2B SaaS", "Other"];

export default function Onboarding() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ clientName: "", industry: "", specialistName: "", notes: "" });

  const utils = trpc.useUtils();
  const { data: onboardings } = trpc.onboarding.list.useQuery();
  const createMutation = trpc.onboarding.create.useMutation({
    onSuccess: () => { utils.onboarding.list.invalidate(); setShowCreate(false); setForm({ clientName: "", industry: "", specialistName: "", notes: "" }); toast.success("Onboarding record created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStepMutation = trpc.onboarding.updateStep.useMutation({ onSuccess: () => utils.onboarding.list.invalidate() });
  const provisionNumberMutation = trpc.onboarding.provisionNumber.useMutation({
    onSuccess: (data) => {
      toast.success(`Your AI phone number is ready: ${data.formattedNumber}`);
      utils.onboarding.list.invalidate();
    },
    onError: (e) => toast.error(`Could not provision number: ${e.message}`),
  });
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");

  const records = onboardings ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-muted-foreground text-sm mt-1">Expert setup, 30-day support, and optimization milestones</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Onboarding
        </Button>
      </div>

      {/* Active Onboardings */}
      {records.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Active Onboardings</h2>
          {records.map((record) => {
            const completedSteps: string[] = (() => { try { const p = JSON.parse(record.completedSteps ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; } })();
            const progress = Math.round((completedSteps.length / ALL_STEPS.length) * 100);
            const daysLeft = record.supportEndDate ? Math.max(0, Math.ceil((new Date(record.supportEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
            return (
              <Card key={record.id} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{record.clientName}</h3>
                      {record.industry && <p className="text-xs text-muted-foreground">{record.industry}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {daysLeft} days of support left
                      </div>
                      <Badge variant="outline" className={`text-xs capitalize ${record.status === "completed" ? "text-green-400 border-green-500/30" : record.status === "in_progress" ? "text-blue-400 border-blue-500/30" : "text-gray-400 border-gray-500/30"}`}>
                        {record.status?.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Setup Progress</span>
                    <span className="text-xs font-semibold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5 mb-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {ALL_STEPS.map((step) => {
                      const done = completedSteps.includes(step);
                      return (
                        <button
                          key={step}
                          onClick={() => updateStepMutation.mutate({ id: record.id, step, completed: !done })}
                          className={`flex items-center gap-1.5 p-2 rounded-lg text-xs text-left transition-all border ${done ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-secondary border-border text-muted-foreground hover:border-primary/30"}`}
                        >
                          {done ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                          <span className="leading-tight">{STEP_LABELS[step]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Industry Selection Panel */}
                  {!completedSteps.includes("industry_select") && (
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-3">
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                        Choose Your Primary Industry
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {["Solar", "HVAC", "Roofing", "Insurance", "Real Estate", "Home Services", "Financial Services", "Healthcare", "B2B SaaS", "Legal", "Automotive", "Other"].map((ind) => (
                          <button
                            key={ind}
                            onClick={() => setSelectedIndustry(ind)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${selectedIndustry === ind ? "bg-primary text-white border-primary" : "bg-secondary border-border text-muted-foreground hover:border-primary/40"}`}
                          >
                            {ind}
                          </button>
                        ))}
                      </div>
                      {selectedIndustry && (
                        <button
                          onClick={() => {
                            updateStepMutation.mutate({ id: record.id, step: "industry_select", completed: true });
                          }}
                          className="w-full py-2 rounded-lg text-sm font-medium bg-primary text-white"
                        >
                          Confirm: {selectedIndustry} ✓
                        </button>
                      )}
                    </div>
                  )}

                  {/* Phone Number Provisioning Panel */}
                  {completedSteps.includes("industry_select") && !completedSteps.includes("phone_provision") && (
                    <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 mb-3">
                      <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                        Get Your AI Phone Number
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">We'll automatically buy a dedicated number for your AI assistant. Included in your plan.</p>
                      {provisionedNumber ? (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-green-400">{provisionedNumber}</p>
                            <p className="text-xs text-muted-foreground">Your AI assistant is live on this number 24/7</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Area code (optional, e.g. 305)"
                              maxLength={3}
                              className="flex-1 px-3 py-2 rounded-lg text-xs bg-secondary border border-border"
                              id={`areacode-${record.id}`}
                            />
                            <button
                              onClick={async () => {
                                const areaCodeEl = document.getElementById(`areacode-${record.id}`) as HTMLInputElement;
                                const areaCode = areaCodeEl?.value?.trim() || undefined;
                                const result = await provisionNumberMutation.mutateAsync({ areaCode, industry: selectedIndustry || record.industry || undefined });
                                setProvisionedNumber(result.formattedNumber);
                                updateStepMutation.mutate({ id: record.id, step: "phone_provision", completed: true });
                              }}
                              disabled={provisionNumberMutation.isPending}
                              className="px-4 py-2 rounded-lg text-xs font-medium bg-green-600 text-white disabled:opacity-50"
                            >
                              {provisionNumberMutation.isPending ? "Provisioning..." : "Get My Number"}
                            </button>
                          </div>
                          {provisionNumberMutation.error && (
                            <p className="text-xs text-red-400">{provisionNumberMutation.error.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Setup Phases */}
      <div>
        <h2 className="text-base font-semibold mb-3">Setup Roadmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SETUP_PHASES.map(({ phase, title, duration, icon: Icon, steps }) => (
            <Card key={phase} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Phase {phase}</span>
                      <Badge variant="outline" className="text-[10px]">{duration}</Badge>
                    </div>
                    <p className="font-semibold text-sm">{title}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary/50 flex-shrink-0 mt-0.5" />
                      {step}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 30-Day Support Timeline */}
      <div>
        <h2 className="text-base font-semibold mb-3">30-Day Expert Support Timeline</h2>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {SUPPORT_TIMELINE.map(({ day, title, desc, icon: Icon }, i) => (
              <div key={i} className="flex gap-4 pl-12 relative">
                <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5">{day}</Badge>
                    <p className="text-sm font-semibold">{title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Start New Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Client Name *</Label>
              <Input className="bg-secondary border-border" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Industry</Label>
              <Select value={form.industry || undefined} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Specialist Name</Label>
              <Input className="bg-secondary border-border" placeholder="Assigned success manager" value={form.specialistName} onChange={(e) => setForm((f) => ({ ...f, specialistName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="bg-secondary border-border resize-none" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!form.clientName || createMutation.isPending}
              onClick={() => createMutation.mutate({ clientName: form.clientName, industry: form.industry || undefined, specialistName: form.specialistName || undefined, notes: form.notes || undefined })}
            >
              {createMutation.isPending ? "Creating..." : "Start Onboarding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
