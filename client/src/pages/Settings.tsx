import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Phone,
  Globe,
  Building2,
  Mic,
  CheckCircle2,
  Save,
  Loader2,
  BookOpen,
  Link2,
  Webhook,
  Gauge,
  Plus,
  Trash2,
  ShieldBan,
  ArrowUpRight,
  Cloud,
  GitBranch,
  Brain,
  Ticket,
  Mail,
  Smartphone,
  Share2,
  MessageCircle,
  Radio,
  CreditCard,
  Split,
} from "lucide-react";
import { toast } from "sonner";
import {
  ENTERPRISE_PLAN,
  PLATFORM_ADD_ONS,
  SELF_SERVE_PLANS,
  formatPlanLabel,
} from "@/lib/pricing";

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" }, { code: "de", name: "German (Deutsch)" },
  { code: "pt", name: "Portuguese (Português)" }, { code: "it", name: "Italian (Italiano)" },
  { code: "nl", name: "Dutch (Nederlands)" }, { code: "pl", name: "Polish (Polski)" },
  { code: "ru", name: "Russian (Русский)" }, { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" }, { code: "ko", name: "Korean (한국어)" },
];

const STYLE_COLORS: Record<string, string> = {
  warm: "#34d399", professional: "#60a5fa", neutral: "#94a3b8",
  confident: "#f59e0b", friendly: "#c084fc", authoritative: "#f87171",
  premium: "#fbbf24", direct: "#fb923c",
};

const SCORE_FIELDS = [
  "email",
  "phone",
  "company",
  "industry",
  "title",
  "linkedinUrl",
  "website",
  "firstName",
  "lastName",
] as const;

type ScoreOp = "present" | "contains" | "eq";

type ScoreRow = { field: string; op: ScoreOp; value: string; points: number };

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: userSettings } = trpc.settings.get.useQuery();
  const { data: voiceProfiles } = trpc.settings.voiceProfiles.useQuery();

  const [transferNumber, setTransferNumber] = useState("");
  const [language, setLanguage] = useState("en");
  const [agencyName, setAgencyName] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("cartesia-sarah-sales");
  const [saving, setSaving] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [primaryIndustryLabel, setPrimaryIndustryLabel] = useState("");
  const [voiceIndustryContext, setVoiceIndustryContext] = useState("");
  const [voiceKeyPhrases, setVoiceKeyPhrases] = useState("");
  const [voiceRestrictionNotes, setVoiceRestrictionNotes] = useState("");

  useEffect(() => {
    if (userSettings) {
      setTransferNumber((userSettings as any).transferNumber || "");
      setLanguage((userSettings as any).language || "en");
      setAgencyName((userSettings as any).agencyName || "");
      setSelectedVoice((userSettings as any).voiceProfileId || "cartesia-sarah-sales");
      setPrimaryIndustryLabel((userSettings as any).primaryIndustryLabel || "");
      setVoiceIndustryContext((userSettings as any).voiceIndustryContext || "");
      setVoiceKeyPhrases((userSettings as any).voiceKeyPhrases || "");
      setVoiceRestrictionNotes((userSettings as any).voiceRestrictionNotes || "");
    }
  }, [userSettings]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.get.invalidate(); toast.success("Settings saved"); setSaving(false); },
    onError: (e: any) => { toast.error(e.message); setSaving(false); },
  });

  const voiceMutation = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.get.invalidate(); toast.success('Voice saved'); setSavingVoice(false); },
    onError: (e: any) => { toast.error(e.message); setSavingVoice(false); },
  });
  const voicePreviewMutation = trpc.settings.voicePreview.useMutation();

  const { data: kbList, isLoading: kbLoading } = trpc.knowledgeBase.list.useQuery();
  const kbCreate = trpc.knowledgeBase.create.useMutation({
    onSuccess: () => { utils.knowledgeBase.list.invalidate(); toast.success("Knowledge base created"); },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const kbAddSite = trpc.knowledgeBase.addWebsiteSource.useMutation({
    onSuccess: (_d, vars) => {
      utils.knowledgeBase.list.invalidate();
      utils.knowledgeBase.listSources.invalidate({ knowledgeBaseId: vars.knowledgeBaseId });
      utils.knowledgeBase.stats.invalidate({ knowledgeBaseId: vars.knowledgeBaseId });
      toast.success("Crawling and embedding started — status updates below.");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const kbReprocess = trpc.knowledgeBase.reprocessSource.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      void utils.knowledgeBase.listSources.invalidate();
      void utils.knowledgeBase.stats.invalidate();
      toast.success("Source re-queued");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const kbPdfUrlMut = trpc.knowledgeBase.addPdfUrlSource.useMutation({
    onSuccess: (_d, vars) => {
      utils.knowledgeBase.list.invalidate();
      utils.knowledgeBase.listSources.invalidate({ knowledgeBaseId: vars.knowledgeBaseId });
      utils.knowledgeBase.stats.invalidate({ knowledgeBaseId: vars.knowledgeBaseId });
      toast.success("PDF URL queued for ingestion");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const kbTxtUrlMut = trpc.knowledgeBase.addTextUrlSource.useMutation({
    onSuccess: (_d, vars) => {
      utils.knowledgeBase.list.invalidate();
      utils.knowledgeBase.listSources.invalidate({ knowledgeBaseId: vars.knowledgeBaseId });
      utils.knowledgeBase.stats.invalidate({ knowledgeBaseId: vars.knowledgeBaseId });
      toast.success("Text URL queued");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const [kbName, setKbName] = useState("");
  const [kbWebsite, setKbWebsite] = useState("https://");
  const [pdfUrlStr, setPdfUrlStr] = useState("https://");
  const [txtUrlStr, setTxtUrlStr] = useState("https://");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
  const [kbSearchQ, setKbSearchQ] = useState("");
  const [kbSearchActive, setKbSearchActive] = useState("");

  const { data: kbSources, isLoading: kbSourcesLoading } = trpc.knowledgeBase.listSources.useQuery(
    { knowledgeBaseId: selectedKbId! },
    {
      enabled: !!selectedKbId,
      refetchInterval: (q) => {
        const rows = q.state.data as Array<{ status: string }> | undefined;
        return rows?.some((s) => s.status === "pending" || s.status === "processing") ? 4000 : false;
      },
    }
  );
  const { data: kbStats } = trpc.knowledgeBase.stats.useQuery(
    { knowledgeBaseId: selectedKbId! },
    {
      enabled: !!selectedKbId,
      refetchInterval: (q) => {
        const d = q.state.data as { pending?: number } | undefined;
        return (d?.pending ?? 0) > 0 ? 4000 : false;
      },
    }
  );
  const { data: kbSearchHit } = trpc.knowledgeBase.search.useQuery(
    { query: kbSearchActive, knowledgeBaseId: selectedKbId ?? undefined },
    { enabled: kbSearchActive.length >= 2 }
  );

  const { data: zapierRow } = trpc.zapier.get.useQuery();
  const [zapierUrl, setZapierUrl] = useState("");
  const [zapierEvents, setZapierEvents] = useState("");
  useEffect(() => {
    if (zapierRow) {
      setZapierUrl(zapierRow.targetUrl ?? "");
      setZapierEvents(zapierRow.events ?? "");
    }
  }, [zapierRow]);

  const zapierSave = trpc.zapier.save.useMutation({
    onSuccess: () => {
      utils.zapier.get.invalidate();
      toast.success("Zapier webhook saved");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const zapierTest = trpc.zapier.test.useMutation({
    onSuccess: (r) => toast.success(`Test POST returned HTTP ${r.status}`),
    onError: (e: { message?: string }) => toast.error(e.message ?? "Test failed"),
  });

  const { data: scoringList } = trpc.leadScoring.list.useQuery();
  const [scoreRuleId, setScoreRuleId] = useState<number | undefined>(undefined);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([
    { field: "email", op: "present", value: "", points: 10 },
  ]);
  useEffect(() => {
    const def = scoringList?.find((r: { isDefault?: boolean }) => r.isDefault);
    if (!def?.rules || !Array.isArray(def.rules)) return;
    const parsed = (def.rules as unknown[]).map((row: unknown) => {
      const o = row as Record<string, unknown>;
      return {
        field: String(o.field ?? "email"),
        op: (o.op === "contains" || o.op === "eq" ? o.op : "present") as ScoreOp,
        value: typeof o.value === "string" ? o.value : "",
        points: typeof o.points === "number" ? o.points : 0,
      };
    });
    if (parsed.length) {
      setScoreRuleId(def.id);
      setScoreRows(parsed);
    }
  }, [scoringList]);

  const leadScoringUpsert = trpc.leadScoring.upsert.useMutation({
    onSuccess: (data: { insertId?: number }) => {
      utils.leadScoring.list.invalidate();
      if (typeof data?.insertId === "number") setScoreRuleId(data.insertId);
      toast.success("Lead scoring rules saved");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });

  const { data: blockedList } = trpc.phoneBlocklist.list.useQuery();
  const [blockPhoneInput, setBlockPhoneInput] = useState("");
  const blockAddMut = trpc.phoneBlocklist.add.useMutation({
    onSuccess: () => {
      utils.phoneBlocklist.list.invalidate();
      setBlockPhoneInput("");
      toast.success("Number blocked");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const blockRemoveMut = trpc.phoneBlocklist.remove.useMutation({
    onSuccess: () => utils.phoneBlocklist.list.invalidate(),
  });

  const { data: escList } = trpc.escalationRules.list.useQuery();
  const [escName, setEscName] = useState("");
  const [escKeyword, setEscKeyword] = useState("");
  const [escTransfer, setEscTransfer] = useState("");
  const escUpsertMut = trpc.escalationRules.upsert.useMutation({
    onSuccess: () => {
      utils.escalationRules.list.invalidate();
      setEscName("");
      setEscKeyword("");
      setEscTransfer("");
      toast.success("Escalation rule added");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const escRemoveMut = trpc.escalationRules.remove.useMutation({
    onSuccess: () => utils.escalationRules.list.invalidate(),
  });

  const { data: crmList } = trpc.crm.list.useQuery();
  const crmStart = trpc.crm.startConnect.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const crmDisconnect = trpc.crm.disconnect.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate();
      toast.success("CRM disconnected");
    },
  });

  const [abTestName, setAbTestName] = useState("voice_prompt");
  const [abVariantKey, setAbVariantKey] = useState("");
  const [abWeight, setAbWeight] = useState("50");
  const [abPromptSuffix, setAbPromptSuffix] = useState("");
  const [abPromptOverride, setAbPromptOverride] = useState("");
  const [abPreviewCallId, setAbPreviewCallId] = useState("");
  const [abPreviewResult, setAbPreviewResult] = useState<string | null>(null);

  const abTestNameTrim = abTestName.trim() || "voice_prompt";
  const { data: abVariants } = trpc.abTesting.list.useQuery({
    testName: abTestName.trim() ? abTestNameTrim : undefined,
  });
  const { data: abSummary } = trpc.abTesting.summary.useQuery({ testName: abTestNameTrim });
  const abCreate = trpc.abTesting.create.useMutation({
    onSuccess: () => {
      utils.abTesting.list.invalidate();
      utils.abTesting.summary.invalidate();
      setAbVariantKey("");
      setAbPromptSuffix("");
      setAbPromptOverride("");
      toast.success("Variant saved — live calls will log [AB] Variant selected");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const abDelete = trpc.abTesting.delete.useMutation({
    onSuccess: () => {
      utils.abTesting.list.invalidate();
      utils.abTesting.summary.invalidate();
      toast.success("Variant deactivated");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });

  const { data: wfList } = trpc.workflows.list.useQuery();
  const [wfName, setWfName] = useState("");
  const wfUpsert = trpc.workflows.upsert.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      setWfName("");
      toast.success("Workflow saved");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const wfDelete = trpc.workflows.remove.useMutation({
    onSuccess: () => utils.workflows.list.invalidate(),
  });

  const { data: memList } = trpc.memory.list.useQuery();
  const [memContent, setMemContent] = useState("");
  const [memLeadId, setMemLeadId] = useState("");
  const memAdd = trpc.memory.add.useMutation({
    onSuccess: () => {
      utils.memory.list.invalidate();
      setMemContent("");
      setMemLeadId("");
      toast.success("Memory added");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });

  const { data: ticketList } = trpc.tickets.list.useQuery();
  const [tkSubject, setTkSubject] = useState("");
  const [tkBody, setTkBody] = useState("");
  const [tkLeadId, setTkLeadId] = useState("");
  const tkCreate = trpc.tickets.create.useMutation({
    onSuccess: () => {
      utils.tickets.list.invalidate();
      setTkSubject("");
      setTkBody("");
      setTkLeadId("");
      toast.success("Ticket created");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const tkStatus = trpc.tickets.setStatus.useMutation({
    onSuccess: () => utils.tickets.list.invalidate(),
  });

  const { data: seqList } = trpc.emailSequences.list.useQuery();
  const [seqName, setSeqName] = useState("");
  const [seqTrigger, setSeqTrigger] = useState("lead.created");
  const [seqBody, setSeqBody] = useState("Hi {{firstName}}, …");
  const seqUpsert = trpc.emailSequences.upsert.useMutation({
    onSuccess: () => {
      utils.emailSequences.list.invalidate();
      setSeqName("");
      toast.success("Sequence saved");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const seqDelete = trpc.emailSequences.remove.useMutation({
    onSuccess: () => utils.emailSequences.list.invalidate(),
  });

  const { data: mobileList } = trpc.mobile.list.useQuery();
  const [mobPlatform, setMobPlatform] = useState<"ios" | "android">("ios");
  const [mobDeviceKey, setMobDeviceKey] = useState("");
  const [mobDisplay, setMobDisplay] = useState("");
  const [mobPush, setMobPush] = useState("");
  const [mobVer, setMobVer] = useState("");
  const mobReg = trpc.mobile.register.useMutation({
    onSuccess: () => {
      utils.mobile.list.invalidate();
      toast.success("Device registered");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const mobRemove = trpc.mobile.remove.useMutation({
    onSuccess: () => utils.mobile.list.invalidate(),
  });

  const { data: socialList } = trpc.social.list.useQuery();
  const socialStart = trpc.social.startConnect.useMutation({
    onSuccess: () => {
      utils.social.list.invalidate();
      toast.success("Social connection queued — OAuth coming soon");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const socialDisconnect = trpc.social.disconnect.useMutation({
    onSuccess: () => {
      utils.social.list.invalidate();
      toast.success("Disconnected");
    },
  });

  const { data: wcList } = trpc.webchat.list.useQuery();
  const [wcName, setWcName] = useState("");
  const [wcWelcome, setWcWelcome] = useState("Hi! How can we help?");
  const [wcOrigins, setWcOrigins] = useState("");
  const wcCreate = trpc.webchat.create.useMutation({
    onSuccess: () => {
      utils.webchat.list.invalidate();
      setWcName("");
      toast.success("Webchat widget created");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });
  const wcUpdate = trpc.webchat.update.useMutation({
    onSuccess: () => utils.webchat.list.invalidate(),
  });
  const wcRemove = trpc.webchat.remove.useMutation({
    onSuccess: () => utils.webchat.list.invalidate(),
  });

  const { data: rcsRow } = trpc.rcs.get.useQuery();
  const [rcsBrand, setRcsBrand] = useState("");
  const [rcsAgent, setRcsAgent] = useState("");
  useEffect(() => {
    if (rcsRow) {
      setRcsBrand(rcsRow.brandName ?? "");
      setRcsAgent(rcsRow.agentId ?? "");
    }
  }, [rcsRow]);
  const rcsUpsert = trpc.rcs.upsert.useMutation({
    onSuccess: () => {
      utils.rcs.get.invalidate();
      toast.success("RCS registration saved");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });

  const handleSave = () => {
    setSaving(true);
    updateMutation.mutate({
      transferNumber: transferNumber || undefined,
      language: language as any,
      agencyName: agencyName || undefined,
      primaryIndustryLabel: primaryIndustryLabel.trim() ? primaryIndustryLabel.trim() : null,
      voiceIndustryContext: voiceIndustryContext.trim() ? voiceIndustryContext.trim() : null,
      voiceKeyPhrases: voiceKeyPhrases.trim() ? voiceKeyPhrases.trim() : null,
      voiceRestrictionNotes: voiceRestrictionNotes.trim() ? voiceRestrictionNotes.trim() : null,
    });
  };

  const handleVoiceSave = () => {
    setSavingVoice(true);
    voiceMutation.mutate({ voiceProfileId: selectedVoice });
  };

  const { data: phoneNumbers, isLoading: phoneNumsLoading } = trpc.settings.listPhoneNumbers.useQuery();
  const phoneActiveMut = trpc.settings.setPhoneNumberActive.useMutation({
    onSuccess: () => {
      utils.settings.listPhoneNumbers.invalidate();
      toast.success("Phone number updated");
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Error"),
  });

  const { data: billingStatus } = trpc.saas.billing.status.useQuery();
  const checkoutMut = trpc.saas.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Checkout failed"),
  });
  const portalMut = trpc.saas.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Portal failed"),
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your AI assistant behavior</p>
      </div>

      {/* ── DEDICATED PHONE NUMBERS — Part 1 #1 ─────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Dedicated phone numbers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Numbers purchased during onboarding are stored here for inbound voice and SMS routing. Inbound calls and texts to these lines resolve your tenant via the number&apos;s owner.
          </p>
          {phoneNumsLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (phoneNumbers?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">
              No dedicated numbers yet. Complete the onboarding step to provision a phone line, or your account may use a legacy pool.
            </p>
          ) : (
            <ul className="space-y-2">
              {(phoneNumbers ?? []).map((row: { id: number; phoneNumber: string; friendlyName?: string | null; isActive: boolean; isPrimary: boolean; industry?: string | null }) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-mono">{row.phoneNumber}</span>
                    {row.isPrimary ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">Primary</span>
                    ) : null}
                    {row.friendlyName ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{row.friendlyName}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={row.isActive ? "secondary" : "default"}
                    disabled={phoneActiveMut.isPending}
                    onClick={() =>
                      phoneActiveMut.mutate({ id: row.id, isActive: !row.isActive })
                    }
                  >
                    {row.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── BILLING & PLAN ───────────────────── */}
      <Card id="billing" className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Billing & Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a plan to unlock AI voice calls, campaigns, and all features. 7-day free trial on all plans.
          </p>

          {/* Current plan status */}
          {billingStatus && typeof billingStatus === "object" && "stripeConfigured" in billingStatus && (
            <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Current plan:</span> <span className="font-semibold">{formatPlanLabel(String(billingStatus.plan ?? "Free Trial"))}</span></p>
              {billingStatus.subscriptionStatus && billingStatus.subscriptionStatus !== "none" && (
                <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{billingStatus.subscriptionStatus}</span></p>
              )}
            </div>
          )}

          {/* Plan cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SELF_SERVE_PLANS.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-4 text-center">
                <p className="font-bold" style={{ color: p.accentColor }}>{p.name}</p>
                <p className="text-2xl font-black mt-1">${p.price}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">{p.minutes.toLocaleString()} min/mo · {p.numbers} number{p.numbers > 1 ? "s" : ""} · {p.industriesIncluded}</p>
                <p className="text-xs text-muted-foreground mt-2">{p.summary}</p>
                <Button
                  type="button" size="sm" className="w-full mt-3"
                  style={{ backgroundColor: p.accentColor }}
                  disabled={checkoutMut.isPending}
                  onClick={() => checkoutMut.mutate({ tier: p.checkoutTier })}
                >
                  {checkoutMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Subscribe"}
                </Button>
              </div>
            ))}
            <div className="rounded-xl border border-border p-4 text-center">
              <p className="font-bold" style={{ color: ENTERPRISE_PLAN.accentColor }}>{ENTERPRISE_PLAN.name}</p>
              <p className="text-2xl font-black mt-1">{ENTERPRISE_PLAN.priceLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">{ENTERPRISE_PLAN.minutes} minutes · {ENTERPRISE_PLAN.numbers} numbers · {ENTERPRISE_PLAN.industriesIncluded}</p>
              <p className="text-xs text-muted-foreground mt-2">{ENTERPRISE_PLAN.summary}</p>
              <Button type="button" size="sm" variant="outline" className="w-full mt-3">
                Contact sales
              </Button>
            </div>
          </div>

          {billingStatus?.stripeCustomerId && (
            <Button type="button" size="sm" variant="outline"
              disabled={portalMut.isPending}
              onClick={() => portalMut.mutate()}
            >
              Manage billing & invoices
            </Button>
          )}

          {/* Industry Packs Add-on */}
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-semibold mb-2">Platform add-ons</p>
            <p className="text-xs text-muted-foreground mb-3">
              Keep one platform, then add capacity, new industries, or enterprise rollout help only when you need it.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLATFORM_ADD_ONS.map((item) => (
                <div key={item.name} className="flex items-start justify-between gap-3 rounded-lg border border-border p-2.5 text-xs">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="text-emerald-400 text-[10px] whitespace-nowrap">{item.priceLabel}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Growth unlocks outbound campaigns; Scale adds more numbers and all industry packs.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── KNOWLEDGE BASE (website + docs) — Part 1 #2 ───────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Knowledge base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Required training sources: <strong>website</strong> (we also read og:title, description, logo, theme-color for branding),{" "}
            <strong>PDF</strong> by URL or file upload, and <strong>plain-text</strong> by URL. Text is chunked and embedded when your workspace has embedding configured; chunks and branding feed live voice calls.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <Label className="text-xs">New knowledge base name</Label>
              <Input
                placeholder="e.g. Main site"
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!kbName.trim() || kbCreate.isPending}
              onClick={() => kbCreate.mutate({ name: kbName.trim() })}
              style={{ backgroundColor: "#1d6ff4" }}
            >
              {kbCreate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
            </Button>
          </div>
          {kbLoading ? (
            <p className="text-xs text-muted-foreground">Loading knowledge bases…</p>
          ) : (kbList?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">No knowledge bases yet. Create one, then add a website URL.</p>
          ) : (
            <div className="space-y-3">
              <Label className="text-xs">Active knowledge base</Label>
              <select
                className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
                value={selectedKbId ?? ""}
                onChange={(e) => setSelectedKbId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select…</option>
                {(kbList ?? []).map((k: { id: number; name: string }) => (
                  <option key={k.id} value={k.id}>
                    {k.name} (ID {k.id})
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Website to crawl
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={kbWebsite}
                    onChange={(e) => setKbWebsite(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!selectedKbId || kbAddSite.isPending}
                  onClick={() => {
                    if (!selectedKbId) return;
                    try {
                      new URL(kbWebsite);
                    } catch {
                      toast.error("Enter a valid URL");
                      return;
                    }
                    kbAddSite.mutate({ knowledgeBaseId: selectedKbId, url: kbWebsite.trim() });
                  }}
                >
                  {kbAddSite.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add website"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <Label className="text-xs">PDF document URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/brochure.pdf"
                    value={pdfUrlStr}
                    onChange={(e) => setPdfUrlStr(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!selectedKbId || kbPdfUrlMut.isPending}
                  onClick={() => {
                    if (!selectedKbId) return;
                    try {
                      new URL(pdfUrlStr);
                    } catch {
                      toast.error("Enter a valid PDF URL");
                      return;
                    }
                    kbPdfUrlMut.mutate({ knowledgeBaseId: selectedKbId, url: pdfUrlStr.trim() });
                  }}
                >
                  {kbPdfUrlMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add PDF URL"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <Label className="text-xs">Plain text URL (.txt / raw)</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/faq.txt"
                    value={txtUrlStr}
                    onChange={(e) => setTxtUrlStr(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!selectedKbId || kbTxtUrlMut.isPending}
                  onClick={() => {
                    if (!selectedKbId) return;
                    try {
                      new URL(txtUrlStr);
                    } catch {
                      toast.error("Enter a valid URL");
                      return;
                    }
                    kbTxtUrlMut.mutate({ knowledgeBaseId: selectedKbId, url: txtUrlStr.trim() });
                  }}
                >
                  {kbTxtUrlMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add text URL"}
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Upload PDF from disk</Label>
                <Input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={!selectedKbId || pdfUploading}
                  className="bg-secondary border-border text-sm"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedKbId) return;
                    setPdfUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append("document", file);
                      fd.append("knowledgeBaseId", String(selectedKbId));
                      const res = await fetch("/api/knowledge-base/upload", {
                        method: "POST",
                        body: fd,
                        credentials: "include",
                      });
                      const j = (await res.json().catch(() => ({}))) as { error?: string };
                      if (!res.ok) throw new Error(j.error || "Upload failed");
                      toast.success("PDF ingested and embedded");
                      await utils.knowledgeBase.list.invalidate();
                      await utils.knowledgeBase.listSources.invalidate({ knowledgeBaseId: selectedKbId });
                      await utils.knowledgeBase.stats.invalidate({ knowledgeBaseId: selectedKbId });
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : "Upload failed");
                    } finally {
                      setPdfUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                {pdfUploading ? <p className="text-[11px] text-muted-foreground">Processing PDF…</p> : null}
              </div>
              {selectedKbId != null && kbStats != null && (
                <p className="text-xs text-muted-foreground">
                  Status: <span className="font-mono">{kbStats.kbStatus}</span> · Chunks stored:{" "}
                  <span className="font-mono">{kbStats.chunks}</span> · Sources:{" "}
                  <span className="font-mono">{kbStats.sources}</span>
                  {kbStats.pending > 0 ? " · Processing…" : null}
                </p>
              )}
              {selectedKbId != null &&
                kbStats != null &&
                (kbStats as { brandProfile?: string | null }).brandProfile && (
                  <div className="rounded-lg border border-border p-3 bg-secondary/30 space-y-2">
                    <Label className="text-xs text-primary">Brand extracted from website</Label>
                    {(() => {
                      try {
                        const b = JSON.parse(
                          (kbStats as { brandProfile: string }).brandProfile
                        ) as Record<string, string | undefined>;
                        return (
                          <div className="text-[11px] text-muted-foreground space-y-1">
                            {b.title ? (
                              <p>
                                <span className="text-foreground/90 font-medium">Title:</span> {b.title}
                              </p>
                            ) : null}
                            {b.description ? (
                              <p>
                                <span className="text-foreground/90 font-medium">Description:</span>{" "}
                                {b.description.slice(0, 400)}
                                {b.description.length > 400 ? "…" : ""}
                              </p>
                            ) : null}
                            {b.primaryColor ? (
                              <p className="flex items-center gap-2">
                                <span className="text-foreground/90 font-medium">Theme:</span>
                                <span
                                  className="inline-block w-5 h-5 rounded border border-border"
                                  style={{ backgroundColor: b.primaryColor }}
                                />
                                {b.primaryColor}
                              </p>
                            ) : null}
                            {b.logoUrl ? (
                              <p className="truncate">
                                <span className="text-foreground/90 font-medium">Logo:</span>{" "}
                                <a href={b.logoUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                                  {b.logoUrl}
                                </a>
                              </p>
                            ) : null}
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
              {selectedKbId != null && (
                <div className="space-y-2 rounded-lg border border-border p-3 bg-secondary/40">
                  <Label className="text-xs">Test semantic search (same index as voice)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="flex-1 min-w-[160px] bg-secondary border-border text-sm"
                      placeholder="Ask about your site…"
                      value={kbSearchQ}
                      onChange={(e) => setKbSearchQ(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={kbSearchQ.trim().length < 2}
                      onClick={() => setKbSearchActive(kbSearchQ.trim())}
                    >
                      Search
                    </Button>
                  </div>
                  {kbSearchActive.length >= 2 && kbSearchHit && kbSearchHit.length > 0 && (
                    <ul className="text-[11px] text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                      {kbSearchHit.map((h: { content: string; score: number }, i: number) => (
                        <li key={i} className="border-b border-border/50 pb-1">
                          <span className="text-primary/80">{(h.score * 100).toFixed(1)}%</span> — {h.content.slice(0, 220)}
                          {h.content.length > 220 ? "…" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {kbSearchActive.length >= 2 && kbSearchHit && kbSearchHit.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No chunks yet — finish training or widen your query.</p>
                  )}
                </div>
              )}
              {selectedKbId != null && (
                <div className="space-y-1">
                  <Label className="text-xs">Sources</Label>
                  {kbSourcesLoading ? (
                    <p className="text-xs text-muted-foreground">Loading sources…</p>
                  ) : !kbSources?.length ? (
                    <p className="text-xs text-muted-foreground">No sources yet.</p>
                  ) : (
                    <ul className="text-xs space-y-1">
                      {kbSources.map(
                        (s: {
                          id: number;
                          sourceUrl: string | null;
                          status: string;
                          errorMessage: string | null;
                        }) => (
                          <li key={s.id} className="flex flex-wrap items-center gap-2 justify-between border-b border-border/40 pb-1">
                            <span className="font-mono truncate max-w-[min(100%,280px)]">{s.sourceUrl ?? "—"}</span>
                            <span className="text-muted-foreground">{s.status}</span>
                            {s.status === "failed" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px]"
                                onClick={() => kbReprocess.mutate({ sourceId: s.id })}
                              >
                                Retry
                              </Button>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                  {kbSources?.some((s: { status: string }) => s.status === "failed") && (
                    <p className="text-[11px] text-red-400">
                      {kbSources.find((s: { status: string }) => s.status === "failed")?.errorMessage ?? "Ingest failed"}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ZAPIER (catch hook URL) — Part 1 #9 ───────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            Zapier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste your Zapier catch hook URL. ApexAI POSTs <span className="font-mono">call.completed</span> and{" "}
            <span className="font-mono">lead.created</span> to this URL when you save it; use “Send test” to verify.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook URL</Label>
            <Input
              type="url"
              placeholder="https://hooks.zapier.com/hooks/catch/…"
              value={zapierUrl}
              onChange={(e) => setZapierUrl(e.target.value)}
              className="bg-secondary border-border font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Events filter (optional, comma-separated)</Label>
            <p className="text-[11px] text-muted-foreground">
              Leave blank to receive all. Emitted today: <span className="font-mono">call.completed</span>,{" "}
              <span className="font-mono">lead.created</span>.
            </p>
            <Input
              placeholder="call.completed, lead.created"
              value={zapierEvents}
              onChange={(e) => setZapierEvents(e.target.value)}
              className="bg-secondary border-border text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!zapierUrl.trim() || zapierSave.isPending}
              onClick={() => {
                try {
                  new URL(zapierUrl.trim());
                } catch {
                  toast.error("Enter a valid URL");
                  return;
                }
                zapierSave.mutate({
                  targetUrl: zapierUrl.trim(),
                  events: zapierEvents.trim() || undefined,
                  isActive: true,
                });
              }}
              style={{ backgroundColor: "#1d6ff4" }}
            >
              {zapierSave.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save webhook"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!zapierUrl.trim() || zapierTest.isPending}
              onClick={() => zapierTest.mutate()}
            >
              {zapierTest.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── LEAD SCORING RULES — Part 1 #5 ─────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Lead scoring (bonus)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Rules marked as default add bonus points on top of the built-in score when you create a lead. Cap is 100; segment stays hot / warm / cold from the total.
          </p>
          <div className="space-y-2">
            {scoreRows.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-end p-2 rounded-lg bg-secondary/40 border border-border/60">
                <div className="space-y-1 min-w-[120px]">
                  <Label className="text-[10px] uppercase text-muted-foreground">Field</Label>
                  <select
                    className="w-full px-2 py-1.5 rounded text-xs bg-secondary border border-border"
                    value={row.field}
                    onChange={(e) => {
                      const next = [...scoreRows];
                      next[i] = { ...next[i]!, field: e.target.value };
                      setScoreRows(next);
                    }}
                  >
                    {SCORE_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 min-w-[100px]">
                  <Label className="text-[10px] uppercase text-muted-foreground">Match</Label>
                  <select
                    className="w-full px-2 py-1.5 rounded text-xs bg-secondary border border-border"
                    value={row.op}
                    onChange={(e) => {
                      const next = [...scoreRows];
                      next[i] = { ...next[i]!, op: e.target.value as ScoreOp };
                      setScoreRows(next);
                    }}
                  >
                    <option value="present">Has value</option>
                    <option value="contains">Contains</option>
                    <option value="eq">Equals</option>
                  </select>
                </div>
                {(row.op === "contains" || row.op === "eq") && (
                  <div className="space-y-1 flex-1 min-w-[120px]">
                    <Label className="text-[10px] uppercase text-muted-foreground">Value</Label>
                    <Input
                      className="h-8 text-xs bg-secondary border-border"
                      value={row.value}
                      onChange={(e) => {
                        const next = [...scoreRows];
                        next[i] = { ...next[i]!, value: e.target.value };
                        setScoreRows(next);
                      }}
                    />
                  </div>
                )}
                <div className="space-y-1 w-20">
                  <Label className="text-[10px] uppercase text-muted-foreground">Pts</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs bg-secondary border-border"
                    value={row.points}
                    onChange={(e) => {
                      const next = [...scoreRows];
                      next[i] = { ...next[i]!, points: Number(e.target.value) || 0 };
                      setScoreRows(next);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setScoreRows(scoreRows.filter((_, j) => j !== i))}
                  disabled={scoreRows.length <= 1}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={() =>
                setScoreRows([...scoreRows, { field: "phone", op: "present", value: "", points: 10 }])
              }
            >
              <Plus className="w-3 h-3 mr-1" /> Add rule
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={leadScoringUpsert.isPending}
            onClick={() => {
              for (const r of scoreRows) {
                if ((r.op === "contains" || r.op === "eq") && !r.value.trim()) {
                  toast.error(`Rule on "${r.field}" needs a value for ${r.op}`);
                  return;
                }
              }
              const payload = scoreRows.map(({ field, op, value, points }) => ({
                field,
                op,
                ...(op === "present" ? {} : { value: value.trim() }),
                points,
              }));
              leadScoringUpsert.mutate({
                id: scoreRuleId,
                name: "Default",
                rules: payload,
                isDefault: true,
              });
            }}
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {leadScoringUpsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save scoring rules"}
          </Button>
        </CardContent>
      </Card>

      {/* ── BLOCKED NUMBERS — Part 1 #7 ─────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldBan className="w-4 h-4 text-primary" />
            Blocked callers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Inbound calls from these numbers get a busy signal. Applies to calls to your ApexAI line (tenant-scoped). Toll-free solicitors are also rejected globally.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <Label className="text-xs">Phone to block</Label>
              <Input
                placeholder="+1 555 000 0000"
                value={blockPhoneInput}
                onChange={(e) => setBlockPhoneInput(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={blockAddMut.isPending}
              onClick={() => blockAddMut.mutate({ phone: blockPhoneInput.trim() })}
              style={{ backgroundColor: "#1d6ff4" }}
            >
              {blockAddMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Block"}
            </Button>
          </div>
          {!blockedList?.length ? (
            <p className="text-xs text-muted-foreground">No numbers blocked.</p>
          ) : (
            <ul className="space-y-1.5">
              {blockedList.map((b: { id: number; phoneE164: string; note: string | null }) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-secondary/50"
                >
                  <span className="font-mono text-xs">{b.phoneE164}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => blockRemoveMut.mutate({ id: b.id })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── ESCALATION RULES — Part 1 #8 ────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-primary" />
            Escalation (keyword → transfer)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When the caller&apos;s speech contains a keyword (case-insensitive), the live call transfers immediately. Leave transfer blank to use your Live Transfer Number below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Rule name</Label>
              <Input
                placeholder="e.g. Ask for manager"
                value={escName}
                onChange={(e) => setEscName(e.target.value)}
                className="bg-secondary border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keyword in speech</Label>
              <Input
                placeholder="e.g. speak to a human"
                value={escKeyword}
                onChange={(e) => setEscKeyword(e.target.value)}
                className="bg-secondary border-border text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Transfer to (optional)</Label>
              <Input
                placeholder="Leave empty = use Live Transfer Number"
                value={escTransfer}
                onChange={(e) => setEscTransfer(e.target.value)}
                className="bg-secondary border-border text-sm"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={escUpsertMut.isPending || !escName.trim() || !escKeyword.trim()}
            onClick={() =>
              escUpsertMut.mutate({
                name: escName.trim(),
                keyword: escKeyword.trim(),
                transferNumber: escTransfer.trim() || undefined,
                isActive: true,
              })
            }
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {escUpsertMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add rule"}
          </Button>
          {!escList?.length ? (
            <p className="text-xs text-muted-foreground">No escalation rules yet.</p>
          ) : (
            <ul className="space-y-2">
              {escList.map(
                (r: {
                  id: number;
                  name: string;
                  keyword: string;
                  transferNumber: string | null;
                  isActive: boolean;
                }) => (
                  <li
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded-lg bg-secondary/50 text-xs"
                  >
                    <div>
                      <span className="font-medium text-foreground">{r.name}</span>
                      <span className="text-muted-foreground"> — “{r.keyword}”</span>
                      {r.transferNumber ? (
                        <span className="block font-mono text-[10px] mt-0.5">→ {r.transferNumber}</span>
                      ) : (
                        <span className="block text-muted-foreground mt-0.5">→ default transfer #</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0"
                      onClick={() => escRemoveMut.mutate({ id: r.id })}
                    >
                      Delete
                    </Button>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── CRM INTEGRATIONS — Part 1 #10 ───────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            CRM connections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            HubSpot, Salesforce, and Pipedrive: OAuth opens in a new tab after the connection stub is created. Set{" "}
            <code className="text-xs bg-secondary px-1 rounded">PIPEDRIVE_CLIENT_ID</code>,{" "}
            <code className="text-xs bg-secondary px-1 rounded">PIPEDRIVE_CLIENT_SECRET</code> on the server for Pipedrive.
            Push leads from the Leads page (cloud menu).
          </p>
          <div className="space-y-2">
            {(["salesforce", "hubspot", "pipedrive"] as const).map((p) => {
              const row = crmList?.find((c: { provider: string }) => c.provider === p);
              const label = p.charAt(0).toUpperCase() + p.slice(1);
              return (
                <div
                  key={p}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-secondary/40 border border-border/60"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    {row && (
                      <span className="text-[11px] text-muted-foreground">
                        {row.status}
                        {row.displayName ? ` · ${row.displayName}` : ""}
                      </span>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={crmStart.isPending}
                      onClick={async () => {
                        try {
                          await crmStart.mutateAsync({ provider: p });
                          const auth = await utils.crm.getAuthUrl.fetch({ provider: p });
                          if (auth.configured && auth.url) {
                            window.open(auth.url, "_blank", "noopener,noreferrer");
                            toast.success(`Complete ${label} sign-in in the new tab`);
                          } else if (p === "pipedrive" && !auth.configured) {
                            toast.message("Pipedrive OAuth is not configured (set PIPEDRIVE_CLIENT_ID / SECRET).");
                          } else {
                            toast.error(
                              `${label} OAuth is not configured on the server (set client id/secret env vars).`
                            );
                          }
                        } catch (e) {
                          toast.error((e as Error).message ?? "CRM error");
                        }
                      }}
                      style={{ backgroundColor: "#1d6ff4" }}
                    >
                      {crmStart.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Connect"}
                    </Button>
                    {row && row.status !== "disconnected" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={crmDisconnect.isPending}
                        onClick={() => crmDisconnect.mutate({ provider: p })}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── VOICE PROMPT A/B — engine + abTesting router ─────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Split className="w-4 h-4 text-primary" />
            Voice prompt A/B testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Traffic splits by hash(callId): weights should sum to ~100 per test name. Override replaces the full system
            prompt; suffix appends to the default prompt. The realtime engine selects a variant when the call starts.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Test name</Label>
            <Input
              placeholder="voice_prompt"
              value={abTestName}
              onChange={(e) => setAbTestName(e.target.value)}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>
          {!abVariants?.length ? (
            <p className="text-xs text-muted-foreground">No active variants for this filter.</p>
          ) : (
            <ul className="space-y-2">
              {abVariants.map(
                (v: {
                  id: number;
                  testName: string;
                  variantKey: string;
                  weight: number;
                  promptSuffix: string | null;
                  promptOverride: string | null;
                }) => (
                  <li
                    key={v.id}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/50 text-xs border border-border/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-medium">{v.variantKey}</span>
                        <span className="text-muted-foreground"> · weight {v.weight}</span>
                        <span className="text-muted-foreground"> · {v.testName}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0"
                        disabled={abDelete.isPending}
                        onClick={() => abDelete.mutate({ id: v.id })}
                      >
                        Deactivate
                      </Button>
                    </div>
                    {(v.promptOverride || v.promptSuffix) && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 font-mono">
                        {v.promptOverride ? `override: ${v.promptOverride.slice(0, 120)}…` : `suffix: ${(v.promptSuffix ?? "").slice(0, 120)}…`}
                      </p>
                    )}
                  </li>
                )
              )}
            </ul>
          )}
          {abSummary && abSummary.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-1">
              <p className="text-xs font-medium text-foreground">Results (all variants for test)</p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                {abSummary.map(
                  (s: {
                    variantKey: string;
                    total: number;
                    converted: number;
                    conversionRate: number;
                    avgDurationSeconds: number;
                  }) => (
                    <li key={s.variantKey}>
                      <span className="font-medium text-foreground">{s.variantKey}</span>: {s.total} calls ·{" "}
                      {s.conversionRate}% converted · ~{s.avgDurationSeconds}s avg
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">New variant key</Label>
            <Input
              placeholder="e.g. control, variant_warm"
              value={abVariantKey}
              onChange={(e) => setAbVariantKey(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Weight (0–100)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={abWeight}
              onChange={(e) => setAbWeight(e.target.value)}
              className="bg-secondary border-border w-28"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Prompt suffix (optional)</Label>
            <textarea
              className="w-full min-h-[72px] px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
              placeholder="Appended after the default tenant + policy prompt…"
              value={abPromptSuffix}
              onChange={(e) => setAbPromptSuffix(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Full prompt override (optional — wins over suffix)</Label>
            <textarea
              className="w-full min-h-[72px] px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
              placeholder="Rare: replaces entire system prompt for this variant"
              value={abPromptOverride}
              onChange={(e) => setAbPromptOverride(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!abVariantKey.trim() || abCreate.isPending}
            onClick={() => {
              const w = Math.min(100, Math.max(0, parseInt(abWeight, 10) || 0));
              abCreate.mutate({
                testName: abTestNameTrim,
                variantKey: abVariantKey.trim(),
                weight: w,
                promptSuffix: abPromptSuffix.trim() || undefined,
                promptOverride: abPromptOverride.trim() || undefined,
              });
            }}
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {abCreate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save variant"}
          </Button>
          <div className="pt-2 border-t border-border/60 space-y-2">
            <Label className="text-xs">Preview assignment for call ID</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="e.g. CAxxxxxxxx signalwire call sid"
                value={abPreviewCallId}
                onChange={(e) => setAbPreviewCallId(e.target.value)}
                className="bg-secondary border-border flex-1 min-w-[200px] font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!abPreviewCallId.trim()) {
                    toast.error("Enter a call ID");
                    return;
                  }
                  try {
                    const r = await utils.abTesting.selectVariant.fetch({
                      callId: abPreviewCallId.trim(),
                      testName: abTestNameTrim,
                    });
                    setAbPreviewResult(
                      r
                        ? `${r.variantKey} (variant id ${r.variantId})`
                        : "No variant — default prompt (no active rows or weights)"
                    );
                  } catch (e) {
                    setAbPreviewResult(null);
                    toast.error((e as Error).message ?? "Preview failed");
                  }
                }}
              >
                Preview
              </Button>
            </div>
            {abPreviewResult !== null && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Assignment:</span> {abPreviewResult}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── WORKFLOWS — Part 1 #11 (execution TBD) ───────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            Workflow builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Store draft graph definitions (JSON). Execution engine hooks in later.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <Label className="text-xs">New workflow name</Label>
              <Input
                placeholder="e.g. After-hours"
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!wfName.trim() || wfUpsert.isPending}
              onClick={() =>
                wfUpsert.mutate({
                  name: wfName.trim(),
                  definition: { version: 1, nodes: [], edges: [] },
                  isActive: true,
                })
              }
              style={{ backgroundColor: "#1d6ff4" }}
            >
              {wfUpsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create draft"}
            </Button>
          </div>
          {!wfList?.length ? (
            <p className="text-xs text-muted-foreground">No workflows yet.</p>
          ) : (
            <ul className="space-y-2">
              {wfList.map((w: { id: number; name: string; isActive: boolean }) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50 text-xs"
                >
                  <span>
                    <span className="font-medium">{w.name}</span>
                    <span className="text-muted-foreground"> · {w.isActive ? "active" : "off"}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => wfDelete.mutate({ id: w.id })}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── CUSTOMER MEMORY — Part 1 #12 ────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Customer memory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Short snippets for RAG / context. Optional lead ID must be one of your leads.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Lead ID (optional)</Label>
            <Input
              type="number"
              placeholder="e.g. 42"
              value={memLeadId}
              onChange={(e) => setMemLeadId(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
              placeholder="Prefers morning calls, decision-maker is Sarah…"
              value={memContent}
              onChange={(e) => setMemContent(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!memContent.trim() || memAdd.isPending}
            onClick={() =>
              memAdd.mutate({
                content: memContent.trim(),
                leadId: memLeadId.trim() ? Number(memLeadId) : undefined,
                source: "manual",
              })
            }
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {memAdd.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add memory"}
          </Button>
          {!memList?.length ? (
            <p className="text-xs text-muted-foreground">No memories yet.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {memList.map((m: { id: number; content: string; leadId: number | null }) => (
                <li key={m.id} className="text-xs p-2 rounded bg-secondary/40 border border-border/60">
                  {m.leadId != null && <span className="font-mono text-[10px] text-muted-foreground">lead {m.leadId} · </span>}
                  {m.content}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── SUPPORT TICKETS — Part 1 #14 ────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" />
            Support tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Track issues from calls or manual entry. CRM sync optional later.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Subject</Label>
              <Input
                value={tkSubject}
                onChange={(e) => setTkSubject(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Body</Label>
              <textarea
                className="w-full min-h-[72px] px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
                value={tkBody}
                onChange={(e) => setTkBody(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lead ID (optional)</Label>
              <Input
                type="number"
                value={tkLeadId}
                onChange={(e) => setTkLeadId(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!tkSubject.trim() || !tkBody.trim() || tkCreate.isPending}
            onClick={() =>
              tkCreate.mutate({
                subject: tkSubject.trim(),
                body: tkBody.trim(),
                leadId: tkLeadId.trim() ? Number(tkLeadId) : undefined,
              })
            }
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {tkCreate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create ticket"}
          </Button>
          {!ticketList?.length ? (
            <p className="text-xs text-muted-foreground">No tickets yet.</p>
          ) : (
            <ul className="space-y-2">
              {ticketList.map(
                (t: {
                  id: number;
                  subject: string;
                  status: "open" | "in_progress" | "closed";
                }) => (
                  <li
                    key={t.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded-lg bg-secondary/50 text-xs"
                  >
                    <div>
                      <span className="font-medium">{t.subject}</span>
                      <span className="text-muted-foreground ml-2">({t.status})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(["open", "in_progress", "closed"] as const).map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant={t.status === s ? "default" : "outline"}
                          className="h-7 text-[10px]"
                          disabled={tkStatus.isPending || t.status === s}
                          onClick={() => tkStatus.mutate({ id: t.id, status: s })}
                        >
                          {s.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── EMAIL SEQUENCES — Part 1 #17 ───────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set up automatic follow-up emails. When a new lead comes in or an appointment is booked, ApexAI sends the email for you. Use placeholders like <span className="font-semibold text-foreground">{"{{firstName}}"}</span> and <span className="font-semibold text-foreground">{"{{company}}"}</span> to personalize.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Email subject line</Label>
              <Input
                value={seqName}
                onChange={(e) => setSeqName(e.target.value)}
                className="bg-secondary border-border"
                placeholder="e.g. Thanks for your interest, {{firstName}}!"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Send when</Label>
              <select
                value={seqTrigger}
                onChange={(e) => setSeqTrigger(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm bg-secondary border border-border"
              >
                <option value="lead.created">New lead comes in</option>
                <option value="appointment.booked">Appointment is booked</option>
                <option value="call.completed">After a call ends</option>
                <option value="manual">Manual send only</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Email body</Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
                value={seqBody}
                onChange={(e) => setSeqBody(e.target.value)}
                placeholder={"Hi {{firstName}},\n\nThanks for reaching out! We'd love to help you with your project.\n\nBest regards,\nYour Team"}
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!seqName.trim() || !seqTrigger.trim() || !seqBody.trim() || seqUpsert.isPending}
            onClick={() =>
              seqUpsert.mutate({
                name: seqName.trim(),
                triggerEvent: seqTrigger.trim(),
                bodyTemplate: seqBody,
                isActive: true,
              })
            }
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {seqUpsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save sequence"}
          </Button>
          {!seqList?.length ? (
            <p className="text-xs text-muted-foreground">No sequences yet.</p>
          ) : (
            <ul className="space-y-2">
              {seqList.map(
                (s: { id: number; name: string; triggerEvent: string; isActive: boolean }) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50 text-xs"
                  >
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground font-mono ml-2">{s.triggerEvent}</span>
                      <span className="text-muted-foreground ml-2">{s.isActive ? "on" : "off"}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => seqDelete.mutate({ id: s.id })}
                    >
                      Delete
                    </Button>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── MOBILE APP DEVICES — Part 1 #15 ─────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            Mobile app devices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Register iOS/Android installs (stable <span className="font-mono">deviceKey</span> from the app). Push delivery hooks in later.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Platform</Label>
              <select
                className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
                value={mobPlatform}
                onChange={(e) => setMobPlatform(e.target.value as "ios" | "android")}
              >
                <option value="ios">iOS</option>
                <option value="android">Android</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Device key (8+ chars)</Label>
              <Input
                className="bg-secondary border-border font-mono text-xs"
                placeholder="from Keychain / Keystore"
                value={mobDeviceKey}
                onChange={(e) => setMobDeviceKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display name (optional)</Label>
              <Input
                className="bg-secondary border-border"
                value={mobDisplay}
                onChange={(e) => setMobDisplay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">App version (optional)</Label>
              <Input
                className="bg-secondary border-border"
                placeholder="1.0.0"
                value={mobVer}
                onChange={(e) => setMobVer(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Push token (optional)</Label>
              <Input
                className="bg-secondary border-border font-mono text-xs"
                value={mobPush}
                onChange={(e) => setMobPush(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const bytes = new Uint8Array(16);
                crypto.getRandomValues(bytes);
                setMobDeviceKey(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
              }}
            >
              Generate test key
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={mobDeviceKey.trim().length < 8 || mobReg.isPending}
              onClick={() =>
                mobReg.mutate({
                  platform: mobPlatform,
                  deviceKey: mobDeviceKey.trim(),
                  displayName: mobDisplay.trim() || undefined,
                  pushToken: mobPush.trim() || undefined,
                  appVersion: mobVer.trim() || undefined,
                })
              }
              style={{ backgroundColor: "#1d6ff4" }}
            >
              {mobReg.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Register device"}
            </Button>
          </div>
          {!mobileList?.length ? (
            <p className="text-xs text-muted-foreground">No devices registered.</p>
          ) : (
            <ul className="space-y-2">
              {mobileList.map(
                (d: {
                  id: number;
                  platform: string;
                  deviceKey: string;
                  displayName: string | null;
                  lastSeenAt: Date | string;
                }) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50 text-xs"
                  >
                    <div>
                      <span className="font-medium uppercase">{d.platform}</span>
                      {d.displayName ? (
                        <span className="text-muted-foreground"> · {d.displayName}</span>
                      ) : null}
                      <span className="block font-mono text-[10px] text-muted-foreground truncate max-w-[280px] mt-0.5">
                        {d.deviceKey}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        last seen {new Date(d.lastSeenAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => mobRemove.mutate({ id: d.id })}
                    >
                      Revoke
                    </Button>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── SOCIAL — Part 1 #16 ────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Social channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Register LinkedIn, Meta, Instagram, or X. OAuth and posting workers are on the roadmap.
          </p>
          <div className="space-y-2">
            {(["linkedin", "facebook", "instagram", "x"] as const).map((p) => {
              const row = socialList?.find((c: { provider: string }) => c.provider === p);
              const label = p === "x" ? "X" : p.charAt(0).toUpperCase() + p.slice(1);
              return (
                <div
                  key={p}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-secondary/40 border border-border/60"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    {row && (
                      <span className="text-[11px] text-muted-foreground">
                        {row.status}
                        {row.displayName ? ` · ${row.displayName}` : ""}
                      </span>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={socialStart.isPending}
                      onClick={() => socialStart.mutate({ provider: p })}
                      style={{ backgroundColor: "#1d6ff4" }}
                    >
                      {socialStart.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Register"}
                    </Button>
                    {row && row.status !== "disconnected" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={socialDisconnect.isPending}
                        onClick={() => socialDisconnect.mutate({ provider: p })}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── WEBCHAT — Part 1 #19 ─────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Webchat widgets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create embed keys for site widgets. Public chat API and script host ship next.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Widget name</Label>
              <Input
                value={wcName}
                onChange={(e) => setWcName(e.target.value)}
                className="bg-secondary border-border"
                placeholder="e.g. Main site"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Welcome message</Label>
              <Input
                value={wcWelcome}
                onChange={(e) => setWcWelcome(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Allowed origins (optional)</Label>
              <Input
                value={wcOrigins}
                onChange={(e) => setWcOrigins(e.target.value)}
                className="bg-secondary border-border font-mono text-xs"
                placeholder="https://yoursite.com, https://www.yoursite.com"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!wcName.trim() || wcCreate.isPending}
            onClick={() =>
              wcCreate.mutate({
                name: wcName.trim(),
                welcomeMessage: wcWelcome.trim() || undefined,
                allowedOrigins: wcOrigins.trim() || undefined,
              })
            }
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {wcCreate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create widget"}
          </Button>
          {!wcList?.length ? (
            <p className="text-xs text-muted-foreground">No widgets yet.</p>
          ) : (
            <ul className="space-y-3">
              {wcList.map(
                (w: {
                  id: number;
                  name: string;
                  publicKey: string;
                  isActive: boolean;
                  welcomeMessage: string | null;
                }) => (
                  <li
                    key={w.id}
                    className="p-3 rounded-lg bg-secondary/50 border border-border/60 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{w.name}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() =>
                            wcUpdate.mutate({ id: w.id, isActive: !w.isActive })
                          }
                        >
                          {w.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => wcRemove.mutate({ id: w.id })}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground break-all font-mono">
                      publicKey: {w.publicKey}
                    </p>
                    <p className="text-[10px] text-muted-foreground break-all">
                      GET{" "}
                      <span className="font-mono">
                        {typeof window !== "undefined" ? window.location.origin : ""}
                        /api/public/webchat/config?key={w.publicKey.slice(0, 12)}…
                      </span>
                    </p>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── RCS — Part 1 #18 ─────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            RCS messaging
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Brand and agent IDs for verified RCS (carrier / Google Jibe). Sending pipeline is not live yet.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Brand name</Label>
            <Input
              value={rcsBrand}
              onChange={(e) => setRcsBrand(e.target.value)}
              className="bg-secondary border-border"
              placeholder="Your business name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Agent ID (optional)</Label>
            <Input
              value={rcsAgent}
              onChange={(e) => setRcsAgent(e.target.value)}
              className="bg-secondary border-border font-mono text-xs"
            />
          </div>
          {rcsRow && (
            <p className="text-[11px] text-muted-foreground">
              Status: <span className="font-medium text-foreground">{rcsRow.status}</span>
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!rcsBrand.trim() || rcsUpsert.isPending}
            onClick={() =>
              rcsUpsert.mutate({
                brandName: rcsBrand.trim(),
                agentId: rcsAgent.trim() || undefined,
                status: "draft",
              })
            }
            style={{ backgroundColor: "#1d6ff4" }}
          >
            {rcsUpsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save RCS profile"}
          </Button>
        </CardContent>
      </Card>

      {/* ── VOICE SELECTOR ──────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            AI Voice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose the voice profile your AI uses on every live call. Previews use the same backend voice profile that powers production calls.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(voiceProfiles || []).map((v: any) => {
              const isSelected = selectedVoice === v.id;
              const styleColor = STYLE_COLORS[v.style] || "#94a3b8";
              return (
                <div key={v.id}
                  className="p-3 rounded-xl text-left transition-all border cursor-pointer"
                  onClick={() => setSelectedVoice(v.id)}
                  style={{
                    backgroundColor: isSelected ? "rgba(29,111,244,0.1)" : "hsl(var(--secondary))",
                    borderColor: isSelected ? "#1d6ff4" : "hsl(var(--border))",
                  }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm">{v.label}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const btn = e.currentTarget;
                          btn.textContent = "⏳";
                          voicePreviewMutation.mutate({ voiceId: v.id }, {
                            onSuccess: (data: any) => {
                              const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
                              audio.play();
                              btn.textContent = "▶ Preview";
                            },
                            onError: () => { btn.textContent = "▶ Preview"; toast.error("Preview failed"); },
                          });
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-medium"
                      >
                        ▶ Preview
                      </button>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded capitalize"
                      style={{ backgroundColor: `${styleColor}20`, color: styleColor }}>
                      {v.style}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 capitalize">
                      {v.useCase}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{v.presentation}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span
                      className={`text-xs font-medium ${v.telephonyOptimized ? "text-green-400" : "text-yellow-400"}`}
                    >
                      {v.telephonyOptimized ? "Phone-optimized" : "Studio"}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {v.latencyProfile || "fast"}
                    </span>
                  </div>
                  {v.description && (
                    <p className="mt-2 text-xs text-zinc-300">{v.description}</p>
                  )}
                  {v.recommendedFor && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      <span className="text-foreground/90 font-medium">Best for:</span> {v.recommendedFor}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-xs text-muted-foreground">
            Premium voice systems win on testing, not guesswork. Preview two or three voices against the same intro, pricing answer, and objection-handling scenario before locking one in.
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleVoiceSave} disabled={savingVoice || selectedVoice === (userSettings as any)?.voiceProfileId}
              style={{ backgroundColor: "#1d6ff4" }} size="sm">
              {savingVoice ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Saving...</> : <><Save className="w-3 h-3 mr-1.5" />Save Voice</>}
            </Button>
            {selectedVoice === (userSettings as any)?.voiceProfileId && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" /> Currently active
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── VOICE DOMAIN (any industry) ───────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Voice AI — your industry & domain
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Apex adapts to <strong>any</strong> vertical — not only preset industries. Curated packs apply when the label matches
            (solar, HVAC, etc.); otherwise the universal pack plus your notes below shapes the agent. Saved with{" "}
            <span className="text-foreground font-medium">Save Settings</span> at the bottom.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Primary industry label (optional)</Label>
            <Input
              value={primaryIndustryLabel}
              onChange={(e) => setPrimaryIndustryLabel(e.target.value)}
              className="bg-secondary border-border"
              placeholder="e.g. Commercial refrigeration, Dental lab, Boutique retail"
            />
            <p className="text-[11px] text-muted-foreground">
              Used to pick domain guidance and vocabulary when lead/campaign industry is generic or empty.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Domain context for the agent (authoritative)</Label>
            <Textarea
              value={voiceIndustryContext}
              onChange={(e) => setVoiceIndustryContext(e.target.value)}
              className="bg-secondary border-border min-h-[100px] text-sm"
              placeholder="What you sell, who calls, typical goals, how appointments work, words to use or avoid..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Key phrases & jargon (comma or newline separated)</Label>
            <Textarea
              value={voiceKeyPhrases}
              onChange={(e) => setVoiceKeyPhrases(e.target.value)}
              className="bg-secondary border-border min-h-[72px] text-sm font-mono text-xs"
              placeholder="SKU-1000, CoolMax, net-30, ADA compliant"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Restrictions & compliance reminders</Label>
            <Textarea
              value={voiceRestrictionNotes}
              onChange={(e) => setVoiceRestrictionNotes(e.target.value)}
              className="bg-secondary border-border min-h-[72px] text-sm"
              placeholder="e.g. Never quote labor rates; licensed tech only for on-site; no HIPAA specifics"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── TRANSFER NUMBER ──────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Live Transfer Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            When a caller asks to speak with a human, the AI says "Let me transfer you now" and routes the call here.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Your transfer phone number</Label>
            <Input type="tel" placeholder="+1 (555) 000-0000" value={transferNumber}
              onChange={e => setTransferNumber(e.target.value)}
              className="bg-secondary border-border" />
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank to disable live transfers. Triggered automatically when caller asks for a human or AI detects frustration.
          </p>
        </CardContent>
      </Card>

      {/* ── LANGUAGE ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Conversation Language
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The AI will conduct all conversations in this language.
          </p>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border">
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </CardContent>
      </Card>

      {/* ── AGENCY ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Agency Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Agency name</Label>
            <Input placeholder="Your Agency LLC" value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              className="bg-secondary border-border" />
          </div>
        </CardContent>
      </Card>

      {/* ── ACCOUNT INFO ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: "Name", value: (userSettings as any)?.name || "—" },
              { label: "Email", value: (userSettings as any)?.email || "—" },
              { label: "Plan", value: (userSettings as any)?.plan || "Trial" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium capitalize">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1d6ff4" }}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
