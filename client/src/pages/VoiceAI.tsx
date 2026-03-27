import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bot, Building2, Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock,
  FileText, Mic, Phone, PhoneCall, PhoneOff, Sparkles, User, XCircle, MapPin,
  Target, MessageSquare, Lightbulb, Hash
} from "lucide-react";
import { Streamdown } from "streamdown";

const outcomeColors: Record<string, string> = {
  scheduled: "text-green-400 bg-green-500/10 border-green-500/30",
  interested: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  callback: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  not_interested: "text-red-400 bg-red-500/10 border-red-500/30",
  voicemail: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

const sentimentIcons: Record<string, React.ReactNode> = {
  positive: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  negative: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  neutral: <Clock className="w-3.5 h-3.5 text-gray-400" />,
};

type ScriptForm = {
  industry: string;
  goal: string;
  companyName: string;
  callerName: string;
  stateOrCity: string;
  phoneNumber: string;
  productDescription: string;
  valuePropositions: string;
  tone: string;
  callObjective: "appointment" | "qualification" | "follow-up" | "re-engagement";
  objectionStyle: "soft" | "direct" | "empathetic" | "data-driven";
};

const defaultScriptForm: ScriptForm = {
  industry: "",
  goal: "",
  companyName: "",
  callerName: "",
  stateOrCity: "",
  phoneNumber: "",
  productDescription: "",
  valuePropositions: "",
  tone: "professional",
  callObjective: "appointment",
  objectionStyle: "empathetic",
};

export default function VoiceAI() {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [script, setScript] = useState("");
  const [showScriptGen, setShowScriptGen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scriptForm, setScriptForm] = useState<ScriptForm>(defaultScriptForm);
  const [showTranscript, setShowTranscript] = useState<string | null>(null);

  const { data: leadsData } = trpc.leads.list.useQuery({ limit: 100 });
  const { data: recordings } = trpc.messages.getCallRecordings.useQuery({});
  const utils = trpc.useUtils();

  const callMutation = trpc.voiceAI.initiateCall.useMutation({
    onSuccess: (d) => {
      utils.messages.getCallRecordings.invalidate();
      toast.success(`Call completed: ${d.outcome}${d.scheduled ? " — Appointment scheduled!" : ""}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const scriptMutation = trpc.voiceAI.generateScript.useMutation({
    onSuccess: (d) => {
      setScript(d.script);
      setShowScriptGen(false);
      toast.success("Script generated — fully personalized with your company details");
    },
    onError: (e) => {
      if (e.message.includes("BUILT_IN_FORGE_API_KEY")) {
        toast.error("AI not configured — add BUILT_IN_FORGE_API_KEY to Railway Variables");
      } else {
        toast.error(e.message);
      }
    },
  });

  const leads = leadsData?.leads ?? [];
  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const stats = {
    total: recordings?.length ?? 0,
    scheduled: recordings?.filter((r) => r.scheduledAppointment).length ?? 0,
    positive: recordings?.filter((r) => r.sentiment === "positive").length ?? 0,
    avgDuration: recordings?.length
      ? Math.round((recordings.reduce((a, r) => a + (r.duration ?? 0), 0) / recordings.length) / 60)
      : 0,
  };

  const sf = scriptForm;
  const setSF = (key: keyof ScriptForm, val: string) =>
    setScriptForm((f) => ({ ...f, [key]: val }));

  const canGenerate = sf.industry.trim() && sf.companyName.trim() && sf.callerName.trim();

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice AI Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">Human-sounding AI calls with conversation intelligence</p>
        </div>
        <Button onClick={() => setShowScriptGen(true)}>
          <Sparkles className="w-4 h-4 mr-2" /> Generate Script
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Calls", value: stats.total, icon: Phone, color: "text-blue-400" },
          { label: "Appointments Set", value: stats.scheduled, icon: Calendar, color: "text-green-400" },
          { label: "Positive Sentiment", value: stats.positive, icon: CheckCircle2, color: "text-orange-400" },
          { label: "Avg Duration (min)", value: stats.avgDuration, icon: Clock, color: "text-purple-400" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Initiate Call */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-primary" /> Initiate AI Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Lead</Label>
              <Select value={selectedLeadId?.toString() ?? ""} onValueChange={(v) => setSelectedLeadId(parseInt(v))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Choose a lead to call..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {l.firstName} {l.lastName} {l.company ? `· ${l.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLead && (
              <div className="p-3 rounded-lg bg-secondary/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {selectedLead.firstName[0]}{selectedLead.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedLead.title ?? ""} {selectedLead.company ? `@ ${selectedLead.company}` : ""}
                    </p>
                  </div>
                </div>
                {selectedLead.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />{selectedLead.phone}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Call Script</Label>
                {!script && (
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowScriptGen(true)}
                  >
                    + Generate with AI
                  </button>
                )}
              </div>
              <Textarea
                className="bg-secondary border-border resize-none text-xs"
                rows={5}
                placeholder="Generate a script above, or paste your own. Leave blank to use AI default."
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
              {script && (
                <button
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setScript("")}
                >
                  Clear script
                </button>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!selectedLeadId || callMutation.isPending}
              onClick={() => callMutation.mutate({ leadId: selectedLeadId!, script: script || undefined })}
            >
              {callMutation.isPending ? (
                <><Mic className="w-4 h-4 mr-2 animate-pulse" /> AI Calling...</>
              ) : (
                <><PhoneCall className="w-4 h-4 mr-2" /> Start AI Call</>
              )}
            </Button>

            {callMutation.data && (
              <div className={`p-3 rounded-lg border text-sm ${callMutation.data.scheduled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>
                <div className="font-semibold mb-1">
                  {callMutation.data.scheduled ? "✓ Appointment Scheduled!" : `Outcome: ${callMutation.data.outcome}`}
                </div>
                <div className="text-xs">
                  Duration: {Math.floor((callMutation.data?.duration || 0) / 60)}m {(callMutation.data?.duration || 0) % 60}s
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="mt-2 text-xs h-6 px-2"
                  onClick={() => setShowTranscript(callMutation.data?.transcript || '')}
                >
                  View Transcript
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Features */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" /> AI Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { title: "Human-Sounding Voice", desc: "Natural conversation patterns with real-time adaptation to responses" },
                { title: "Personalized Scripts", desc: "Scripts use your company name, caller name, and location — no generic placeholders" },
                { title: "Objection Handling", desc: "Trained on thousands of sales calls to handle common industry-specific objections" },
                { title: "Appointment Setting", desc: "Automatically schedules appointments and sends confirmations" },
                { title: "Sentiment Analysis", desc: "Real-time analysis of prospect interest and engagement level" },
                { title: "Call Recording & Transcription", desc: "Full recordings with searchable AI-generated transcripts" },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3 p-3 rounded-lg bg-secondary/50">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Recordings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Call Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          {!recordings?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <PhoneOff className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No calls yet. Initiate your first AI call above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recordings.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Lead #{r.leadId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.calledAt!).toLocaleString()} · {Math.floor((r.duration ?? 0) / 60)}m {(r.duration ?? 0) % 60}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.sentiment && sentimentIcons[r.sentiment]}
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${outcomeColors[r.outcome ?? ""] ?? "text-gray-400 bg-gray-500/10 border-gray-500/30"}`}>
                      {r.outcome}
                    </span>
                    {r.transcript && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowTranscript(r.transcript!)}
                      >
                        Transcript
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Script Generator Dialog ─────────────────────────────────────────── */}
      <Dialog open={showScriptGen} onOpenChange={setShowScriptGen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Script Generator
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Fill in your details below. The AI will generate a fully personalized script — no generic placeholders.
            </p>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* ── Core Identity ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Your Company Identity
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Name <span className="text-red-400">*</span></Label>
                  <Input
                    className="bg-secondary border-border"
                    placeholder="e.g. SunPower Solutions"
                    value={sf.companyName}
                    onChange={(e) => setSF("companyName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">AI Caller Name <span className="text-red-400">*</span></Label>
                  <Input
                    className="bg-secondary border-border"
                    placeholder="e.g. Alex, Sarah, Jordan"
                    value={sf.callerName}
                    onChange={(e) => setSF("callerName", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">The name the AI will use when introducing itself</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> State / City / Area</Label>
                  <Input
                    className="bg-secondary border-border"
                    placeholder="e.g. Texas, Miami, the Southeast"
                    value={sf.stateOrCity}
                    onChange={(e) => setSF("stateOrCity", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Hash className="w-3 h-3" /> Caller Phone Number</Label>
                  <Input
                    className="bg-secondary border-border"
                    placeholder="e.g. +1 (555) 123-4567"
                    value={sf.phoneNumber}
                    onChange={(e) => setSF("phoneNumber", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Shown in script for callback references</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Campaign Context ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Campaign Context
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Industry <span className="text-red-400">*</span></Label>
                  <Select value={sf.industry} onValueChange={(v) => setSF("industry", v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select industry..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Solar", "Roofing", "HVAC", "Real Estate", "Insurance", "Financial Services",
                        "Home Improvement", "Pest Control", "Landscaping", "Other"].map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Call Objective</Label>
                  <Select value={sf.callObjective} onValueChange={(v) => setSF("callObjective", v as ScriptForm["callObjective"])}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appointment">Book an Appointment</SelectItem>
                      <SelectItem value="qualification">Qualify the Lead</SelectItem>
                      <SelectItem value="follow-up">Follow Up</SelectItem>
                      <SelectItem value="re-engagement">Re-engage Cold Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tone</Label>
                  <Select value={sf.tone} onValueChange={(v) => setSF("tone", v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly and conversational">Friendly & Conversational</SelectItem>
                      <SelectItem value="urgent and direct">Urgent & Direct</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="warm and empathetic">Warm & Empathetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Objection Handling Style</Label>
                  <Select value={sf.objectionStyle} onValueChange={(v) => setSF("objectionStyle", v as ScriptForm["objectionStyle"])}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empathetic">Empathetic (acknowledge then redirect)</SelectItem>
                      <SelectItem value="soft">Soft (gentle, low pressure)</SelectItem>
                      <SelectItem value="direct">Direct (confident, assertive)</SelectItem>
                      <SelectItem value="data-driven">Data-Driven (facts and numbers)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Product Details ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Product / Service Details
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">What do you sell? (brief description)</Label>
                  <Textarea
                    className="bg-secondary border-border resize-none text-xs"
                    rows={2}
                    placeholder="e.g. We install residential solar panels with $0 upfront cost and guaranteed savings from day one."
                    value={sf.productDescription}
                    onChange={(e) => setSF("productDescription", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Key Value Propositions</Label>
                  <Textarea
                    className="bg-secondary border-border resize-none text-xs"
                    rows={2}
                    placeholder="e.g. No upfront cost, save $150/month on electricity, 25-year warranty, local installer..."
                    value={sf.valuePropositions}
                    onChange={(e) => setSF("valuePropositions", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Advanced / Goal ── */}
            <div>
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Advanced: Custom Goal / Instructions
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Custom Goal or Additional Instructions</Label>
                  <Textarea
                    className="bg-secondary border-border resize-none text-xs"
                    rows={3}
                    placeholder="Any specific instructions, custom goal, or things the AI should mention or avoid..."
                    value={sf.goal}
                    onChange={(e) => setSF("goal", e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Required fields notice */}
            {!canGenerate && (
              <p className="text-xs text-yellow-500/80 flex items-center gap-1.5">
                <span>⚠</span> Company Name, AI Caller Name, and Industry are required to generate a personalized script.
              </p>
            )}

            <Button
              className="w-full"
              disabled={!canGenerate || scriptMutation.isPending}
              onClick={() => scriptMutation.mutate({
                industry: sf.industry,
                goal: sf.goal || `Book an appointment for ${sf.companyName}`,
                tone: sf.tone,
                companyName: sf.companyName,
                callerName: sf.callerName,
                stateOrCity: sf.stateOrCity || undefined,
                phoneNumber: sf.phoneNumber || undefined,
                productDescription: sf.productDescription || undefined,
                valuePropositions: sf.valuePropositions || undefined,
                callObjective: sf.callObjective,
                objectionStyle: sf.objectionStyle,
              })}
            >
              {scriptMutation.isPending ? (
                <><Sparkles className="w-4 h-4 mr-2 animate-pulse" /> Generating Personalized Script...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate Script</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transcript Dialog */}
      <Dialog open={!!showTranscript} onOpenChange={() => setShowTranscript(null)}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Transcript</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {showTranscript && <Streamdown>{showTranscript}</Streamdown>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
