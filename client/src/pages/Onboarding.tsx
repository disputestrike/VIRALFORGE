import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Mic,
  Phone,
  Rocket,
  Settings2,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const LANGUAGES = [
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["it", "Italian"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["ru", "Russian"],
  ["zh", "Chinese"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
] as const;

const STEP_KEYS = ["profile", "voice", "routing", "number", "launch"] as const;

function stepIndex(step?: string) {
  if (step === "voice") return 1;
  if (step === "routing") return 2;
  if (step === "number") return 3;
  if (step === "launch") return 4;
  return 0;
}

export default function Onboarding() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: setup } = trpc.settings.setupStatus.useQuery();
  const { data: voices } = trpc.settings.voiceProfiles.useQuery();
  const { data: phoneNumbers } = trpc.settings.listPhoneNumbers.useQuery();
  const { data: calendarStatus } = trpc.settings.calendarStatus.useQuery();
  const { data: messagingStatus } = trpc.settings.messagingStatus.useQuery();
  const { data: crmList } = trpc.crm.list.useQuery();
  const { data: kbList } = trpc.knowledgeBase.list.useQuery();

  const [step, setStep] = useState(0);
  const [areaCode, setAreaCode] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [language, setLanguage] = useState("en");
  const [voiceId, setVoiceId] = useState("cartesia-sarah-sales");
  const [assistantName, setAssistantName] = useState("Alex");
  const [tonePreset, setTonePreset] = useState("warm, concise, competent");
  const [pace, setPace] = useState("balanced");
  const [interruptionSensitivity, setInterruptionSensitivity] = useState("balanced");
  const [pronunciationHintsText, setPronunciationHintsText] = useState("");
  const [transferNumber, setTransferNumber] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [domainContext, setDomainContext] = useState("");
  const [keyPhrases, setKeyPhrases] = useState("");
  const [restrictionNotes, setRestrictionNotes] = useState("");

  useEffect(() => {
    if (!settings) return;
    const runtime = (settings as any).voiceRuntimeProfile ?? {};
    setBusinessName((settings as any).businessName || "");
    setIndustry((settings as any).primaryIndustryLabel || "");
    setLanguage((settings as any).language || "en");
    setVoiceId((settings as any).voiceProfileId || "cartesia-sarah-sales");
    setAssistantName(runtime.assistantName || "Alex");
    setTonePreset(runtime.tonePreset || "warm, concise, competent");
    setPace(runtime.pace || "balanced");
    setInterruptionSensitivity(runtime.interruptionSensitivity || "balanced");
    setPronunciationHintsText((settings as any).pronunciationHintsText || "");
    setTransferNumber((settings as any).transferNumber || "");
    setBookingUrl((settings as any).gcalBookingUrl || "");
    setDomainContext((settings as any).voiceIndustryContext || "");
    setKeyPhrases((settings as any).voiceKeyPhrases || "");
    setRestrictionNotes((settings as any).voiceRestrictionNotes || "");
  }, [settings]);

  useEffect(() => {
    if (setup) setStep(stepIndex(setup.recommendedNextStep));
  }, [setup?.recommendedNextStep]);

  const saveMutation = trpc.settings.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.settings.get.invalidate(),
        utils.settings.setupStatus.invalidate(),
      ]);
      toast.success("Workspace settings saved");
    },
    onError: (error) => toast.error(error.message),
  });

  const provisionMutation = trpc.onboarding.provisionNumber.useMutation({
    onSuccess: async (data) => {
      await Promise.all([
        utils.settings.listPhoneNumbers.invalidate(),
        utils.settings.setupStatus.invalidate(),
      ]);
      toast.success(
        data.reusedExisting
          ? `Using existing number ${data.formattedNumber}`
          : `Number ready: ${data.formattedNumber}`
      );
    },
    onError: (error) => toast.error(error.message),
  });

  const progress = useMemo(() => {
    if (!setup) return 0;
    const done = Object.values(setup.steps).filter(Boolean).length;
    return Math.round((done / Object.keys(setup.steps).length) * 100);
  }, [setup]);

  const activePhone =
    phoneNumbers?.find((row) => row.isActive && row.isPrimary) ??
    phoneNumbers?.find((row) => row.isActive) ??
    null;
  const connectedCrmCount = useMemo(
    () => (crmList ?? []).filter((row: any) => row.status === "connected").length,
    [crmList]
  );

  async function save(next?: number) {
    await saveMutation.mutateAsync({
      businessName: businessName.trim() || undefined,
      primaryIndustryLabel: industry.trim() || null,
      language: language as any,
      voiceProfileId: voiceId,
      transferNumber: transferNumber.trim() || undefined,
      gcalBookingUrl: bookingUrl.trim() || undefined,
      voiceIndustryContext: domainContext.trim() || null,
      voiceKeyPhrases: keyPhrases.trim() || null,
      voiceRestrictionNotes: restrictionNotes.trim() || null,
      voiceRuntimeProfile: {
        assistantName: assistantName.trim() || "Alex",
        tonePreset: tonePreset.trim() || "warm, concise, competent",
        pace: pace as any,
        interruptionSensitivity: interruptionSensitivity as any,
        pronunciationHintsText: pronunciationHintsText.trim() || null,
      },
    });
    if (typeof next === "number") setStep(next);
  }

  const stepCards = [
    { label: "Business", icon: Settings2, done: Boolean(setup?.steps.profile) },
    { label: "Voice", icon: Mic, done: Boolean(setup?.steps.voice) },
    { label: "Routing", icon: Brain, done: Boolean(setup?.steps.routing) },
    { label: "Number", icon: Phone, done: Boolean(setup?.steps.number) },
    { label: "Launch", icon: Rocket, done: Boolean(setup?.steps.launch) },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workspace Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set the voice, routing, and number your customers will hear.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
          {setup?.needsSetup ? "Setup in progress" : "Ready to launch"}
        </Badge>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {stepCards.map((item, index) => (
              <button
                key={item.label}
                onClick={() => setStep(index)}
                className={`rounded-xl border px-3 py-3 text-left ${
                  step === index
                    ? "border-primary bg-primary/10"
                    : item.done
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-secondary/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold">Step {index + 1}</span>
                </div>
                <p className="text-sm font-medium">{item.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {step === 0 && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Business profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Business name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Primary industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Solar installation" className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Conversation language</Label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void save(1)} disabled={saveMutation.isPending}>Save & continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Voice identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(voices || []).map((voice: any) => (
                <button key={voice.id} onClick={() => setVoiceId(voice.id)} className={`rounded-xl border p-3 text-left ${voiceId === voice.id ? "border-primary bg-primary/10" : "border-border bg-secondary/20"}`}>
                  <p className="font-semibold text-sm">{voice.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{voice.description || voice.recommendedFor}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Assistant name</Label>
                <Input value={assistantName} onChange={(e) => setAssistantName(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Tone preset</Label>
                <Input value={tonePreset} onChange={(e) => setTonePreset(e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Pace</Label>
                <select value={pace} onChange={(e) => setPace(e.target.value)} className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                  <option value="relaxed">Relaxed</option>
                  <option value="balanced">Balanced</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Interrupt handling</Label>
                <select value={interruptionSensitivity} onChange={(e) => setInterruptionSensitivity(e.target.value)} className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                  <option value="aggressive">Fast yield</option>
                  <option value="balanced">Balanced</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Pronunciation hints</Label>
                <Textarea value={pronunciationHintsText} onChange={(e) => setPronunciationHintsText(e.target.value)} className="bg-secondary border-border min-h-[44px]" placeholder={"Tesla\nDaikin\nNet metering"} />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => void save(2)} disabled={saveMutation.isPending}>Save & continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Routing and business context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Transfer number</Label>
                <Input value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Booking link</Label>
                <Input value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://calendar.google.com/..." className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Business context</Label>
              <Textarea value={domainContext} onChange={(e) => setDomainContext(e.target.value)} className="bg-secondary border-border min-h-[110px]" placeholder="What callers ask, how qualification works, and what a booked appointment means." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Key phrases</Label>
                <Textarea value={keyPhrases} onChange={(e) => setKeyPhrases(e.target.value)} className="bg-secondary border-border min-h-[90px]" />
              </div>
              <div className="space-y-1.5">
                <Label>Restrictions / compliance</Label>
                <Textarea value={restrictionNotes} onChange={(e) => setRestrictionNotes(e.target.value)} className="bg-secondary border-border min-h-[90px]" />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => void save(3)} disabled={saveMutation.isPending}>Save & continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Dedicated phone number</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {activePhone ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-emerald-300">Live number ready</p>
                <p className="text-xl font-black mt-1">{activePhone.phoneNumber}</p>
                <p className="text-xs text-muted-foreground mt-2">Inbound voice and SMS already route to this workspace.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <p className="text-sm font-semibold">Claim your AI number</p>
                <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-3">
                  <div className="space-y-1.5">
                    <Label>Preferred area code</Label>
                    <Input value={areaCode} onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="305" className="bg-secondary border-border" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => provisionMutation.mutate({ areaCode: areaCode || undefined, industry: industry || undefined })} disabled={provisionMutation.isPending}>
                      {provisionMutation.isPending ? "Provisioning..." : "Get my number"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} disabled={!activePhone}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Launch checklist</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Business</p>
                <p className="mt-2 text-sm font-semibold">{businessName || "Missing"}</p>
                <p className="text-xs text-muted-foreground mt-1">{industry || "Add industry context"}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Voice</p>
                <p className="mt-2 text-sm font-semibold">{assistantName} • {voiceId}</p>
                <p className="text-xs text-muted-foreground mt-1">{tonePreset}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Knowledge</p>
                <p className="mt-2 text-sm font-semibold">{kbList?.length ?? 0} source{(kbList?.length ?? 0) === 1 ? "" : "s"}</p>
                <p className="text-xs text-muted-foreground mt-1">Add grounded content before full production use.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Calendar</p>
                <p className="mt-2 text-sm font-semibold">
                  {calendarStatus?.connected ? "Connected" : "Not connected"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calendarStatus?.connected
                    ? "Voice bookings can create live calendar events."
                    : "Connect Google Calendar so booked calls land on the calendar automatically."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CRM</p>
                <p className="mt-2 text-sm font-semibold">
                  {connectedCrmCount > 0
                    ? `${connectedCrmCount} connection${connectedCrmCount === 1 ? "" : "s"} live`
                    : "Not connected"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {connectedCrmCount > 0
                    ? "Qualified and booked leads can sync into your connected CRM."
                    : "Connect HubSpot, Salesforce, or Pipedrive before production handoff."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">SMS readiness</p>
                <p className="mt-2 text-sm font-semibold">
                  {messagingStatus?.headline || "Checking..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {messagingStatus?.detail ||
                    "Voice and messaging readiness show up here once a number is active."}
                </p>
              </div>
            </div>
            {messagingStatus?.recommendedAction ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">SMS next step:</span>{" "}
                {messagingStatus.recommendedAction}
              </div>
            ) : null}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              Launch is strongest when voice, number, and knowledge are all configured together. You can keep tuning the advanced controls in Settings after going live.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/knowledge-base"><Button variant="outline">Open knowledge base</Button></Link>
              <Link href="/settings"><Button variant="outline">Open settings</Button></Link>
              <Button onClick={() => navigate("/dashboard")} disabled={Boolean(setup?.needsSetup)}>
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {setup?.needsSetup ? "Recommended next step:" : "Workspace status:"} <span className="font-semibold text-foreground">{setup?.recommendedNextStep || "launch"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {STEP_KEYS.map((key) => (
              <span key={key} className="flex items-center gap-1">
                {setup?.steps[key] ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="w-4 h-4 rounded-full border border-border inline-block" />}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
