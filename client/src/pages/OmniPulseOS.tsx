import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OmniPulseRun, OmniPulseRunInput } from "../../../server/_core/omnipulse/engine";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Brain,
  CheckCircle2,
  CreditCard,
  Database,
  Film,
  Gauge,
  Globe2,
  Play,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";

const platformOptions = ["YouTube", "TikTok", "Instagram/Reels", "Pinterest", "X", "LinkedIn", "Telegram", "Reddit"];
const languageOptions = ["en-US", "es-MX", "pt-BR", "fr-FR", "hi-IN", "ar", "sw", "yo-NG"];

const statusTone = {
  pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  review: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  block: "bg-rose-50 text-rose-700 border-rose-200",
};

const publishTone = {
  direct_ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  direct_private: "bg-violet-50 text-violet-700 border-violet-200",
  manual_export: "bg-amber-50 text-amber-700 border-amber-200",
  blocked: "bg-rose-50 text-rose-700 border-rose-200",
};

function pct(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function SectionTitle({ icon: Icon, title, kicker }: { icon: typeof Brain; title: string; kicker?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-700">
          <Icon className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          {kicker && <p className="text-xs text-slate-500">{kicker}</p>}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Brain }) {
  return (
    <Card className="border-fuchsia-100 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#9B0AE8,#BC12BD,#ED3782)] text-white">
            <Icon className="size-4" />
          </div>
          <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700">live</Badge>
        </div>
        <p className="text-2xl font-black tracking-normal text-slate-950">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function OmniPulseOS() {
  const { data: overview, isLoading } = trpc.omnipulse.overview.useQuery();
  const runMutation = trpc.omnipulse.run.useMutation();
  const [runResult, setRunResult] = useState<OmniPulseRun | null>(null);
  const [topic, setTopic] = useState("Launch OmniPulse Network with FactQuest, QuickFix, RankIt, LoopLab, PulseWorld, and a 45-minute documentary deep dive");
  const [objective, setObjective] = useState("Create original compliant media, package platforms, track Six Sigma gates, and prepare SaaS monetization through PayPal");
  const [outputProfile, setOutputProfile] = useState<OmniPulseRunInput["outputProfile"]>("network-launch");
  const [targetMinutes, setTargetMinutes] = useState(12);
  const [budgetCeilingUsd, setBudgetCeilingUsd] = useState(75);
  const [riskTolerance, setRiskTolerance] = useState<OmniPulseRunInput["riskTolerance"]>("balanced");
  const [platforms, setPlatforms] = useState(["YouTube", "TikTok", "Instagram/Reels", "Pinterest"]);
  const [languages, setLanguages] = useState(["en-US"]);

  const run = runResult ?? overview?.latestRun ?? null;

  const policySummary = useMemo(() => {
    if (!run) return { pass: 0, warning: 0, review: 0, block: 0 };
    return run.policyEvents.reduce(
      (acc, event) => ({ ...acc, [event.status]: acc[event.status] + 1 }),
      { pass: 0, warning: 0, review: 0, block: 0 },
    );
  }, [run]);

  const packageSummary = useMemo(() => {
    if (!run) return { direct: 0, manual: 0, blocked: 0 };
    return run.platformPackages.reduce(
      (acc, pkg) => ({
        direct: acc.direct + (pkg.publishMode === "direct_private" || pkg.publishMode === "direct_ready" ? 1 : 0),
        manual: acc.manual + (pkg.publishMode === "manual_export" ? 1 : 0),
        blocked: acc.blocked + (pkg.publishMode === "blocked" ? 1 : 0),
      }),
      { direct: 0, manual: 0, blocked: 0 },
    );
  }, [run]);

  const handleToggle = (value: string, current: string[], setter: (next: string[]) => void) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const executeRun = () => {
    runMutation.mutate(
      {
        topic,
        objective,
        outputProfile,
        targetMinutes,
        platforms,
        languages,
        riskTolerance,
        budgetCeilingUsd,
      },
      {
        onSuccess: setRunResult,
      },
    );
  };

  if (isLoading || !run || !overview) {
    return (
      <div className="min-h-screen bg-white p-6 text-slate-950">
        <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent" />
            <p className="text-sm text-slate-500">Loading OmniPulse OS...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9ff] p-4 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-xl border border-fuchsia-100 bg-white shadow-sm">
          <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700">ViralForge OS / OmniPulse Network</Badge>
              <div>
                <h1 className="text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">One AI media engine</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  TrendScout, BriefForge, Scriptor, AssetGen, Renderer, PolicyOS, PulsePost, SignalLoop, ModelMesh, QuotaBroker, SaaS billing, and Documentary Engine are running as one governed production loop.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Content items in run" value={String(run.contentItems.length)} icon={Workflow} />
                <MiniMetric label="Platform packages" value={String(run.platformPackages.length)} icon={RadioTower} />
                <MiniMetric label="Estimated run cost" value={`$${run.financialModel.estimatedRunCostUsd}`} icon={CreditCard} />
              </div>
            </div>
            <div className="rounded-xl bg-[linear-gradient(135deg,#9B0AE8_0%,#BC12BD_45%,#ED3782_100%)] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Operating decision</p>
                  <h2 className="mt-1 text-2xl font-black tracking-normal">{run.operatingDecision.scaleDecision.toUpperCase()}</h2>
                </div>
                <Gauge className="size-9 text-white/85" />
              </div>
              <p className="mt-4 text-sm leading-6 text-white/85">{run.operatingDecision.nextBestAction}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/15 p-3">
                  <p className="text-white/70">Human queue</p>
                  <p className="font-bold">{run.operatingDecision.requiresHumanExceptionQueue ? "Required" : "Clear"}</p>
                </div>
                <div className="rounded-lg bg-white/15 p-3">
                  <p className="text-white/70">Publish state</p>
                  <p className="font-bold">{run.operatingDecision.readyToPublish ? "Ready" : "Gated"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Card className="border-fuchsia-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="size-4 text-fuchsia-700" />
                Engine Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Topic</span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-fuchsia-100 bg-white p-3 text-sm text-slate-900 outline-none ring-fuchsia-200 focus:ring-2"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Objective</span>
                <textarea
                  className="min-h-20 w-full rounded-lg border border-fuchsia-100 bg-white p-3 text-sm text-slate-900 outline-none ring-fuchsia-200 focus:ring-2"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["network-launch", "daily-shorts", "documentary-deep-dive"] as const).map((profile) => (
                  <button
                    key={profile}
                    type="button"
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${outputProfile === profile ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 text-slate-600 hover:border-fuchsia-200"}`}
                    onClick={() => setOutputProfile(profile)}
                  >
                    {profile.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Minutes</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={targetMinutes}
                    onChange={(event) => setTargetMinutes(Number(event.target.value))}
                    className="w-full rounded-lg border border-fuchsia-100 bg-white px-3 py-2 text-sm outline-none ring-fuchsia-200 focus:ring-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Budget</span>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={budgetCeilingUsd}
                    onChange={(event) => setBudgetCeilingUsd(Number(event.target.value))}
                    className="w-full rounded-lg border border-fuchsia-100 bg-white px-3 py-2 text-sm outline-none ring-fuchsia-200 focus:ring-2"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["strict", "balanced", "aggressive"] as const).map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${riskTolerance === risk ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 text-slate-600 hover:border-fuchsia-200"}`}
                    onClick={() => setRiskTolerance(risk)}
                  >
                    {risk}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${platforms.includes(platform) ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 text-slate-600"}`}
                      onClick={() => handleToggle(platform, platforms, setPlatforms)}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {languageOptions.map((language) => (
                    <button
                      key={language}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${languages.includes(language) ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 text-slate-600"}`}
                      onClick={() => handleToggle(language, languages, setLanguages)}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full bg-[linear-gradient(135deg,#9B0AE8,#BC12BD,#ED3782)] text-white hover:opacity-95"
                disabled={runMutation.isPending}
                onClick={executeRun}
              >
                <Play className="mr-2 size-4" />
                {runMutation.isPending ? "Running engine..." : "Run One Engine"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-fuchsia-100 bg-white shadow-sm">
              <CardHeader>
                <SectionTitle icon={Brain} title="Engine Modules" kicker="Single governed loop" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {run.modules.map((module) => (
                    <div key={module.code} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{module.name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{module.role}</p>
                        </div>
                        <Badge className={module.status === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                          {module.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="border-fuchsia-100 bg-white shadow-sm">
                <CardHeader>
                  <SectionTitle icon={ShieldCheck} title="PolicyOS" kicker={`${policySummary.pass} pass, ${policySummary.warning} warning, ${policySummary.review} review`} />
                </CardHeader>
                <CardContent className="space-y-3">
                  {run.policyEvents.map((event) => (
                    <div key={event.ruleCode} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{event.module}</p>
                        <Badge className={statusTone[event.status]}>{event.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">{event.ruleCode}</p>
                      <p className="mt-2 text-sm leading-5 text-slate-600">{event.message}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-fuchsia-100 bg-white shadow-sm">
                <CardHeader>
                  <SectionTitle icon={Gauge} title="Six Sigma QAQC" kicker="DMAIC/DMADV gates" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {run.qaGates.map((gate) => (
                    <div key={gate.name} className="rounded-lg border border-slate-100 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-950">{gate.name}</p>
                        <Badge className={statusTone[gate.status]}>{gate.status}</Badge>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[linear-gradient(135deg,#9B0AE8,#BC12BD,#ED3782)]" style={{ width: pct(gate.score) }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{gate.ctq}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card className="border-fuchsia-100 bg-white shadow-sm xl:col-span-2">
            <CardHeader>
              <SectionTitle icon={Film} title="Content And Documentary Queue" kicker={run.selectedPillar.name} />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {run.contentItems.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.format} / {item.renderPath}</p>
                      </div>
                      <Badge className={statusTone[item.policyStatus]}>{item.policyStatus}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>${item.estimatedCostUsd}</span>
                      <span>{item.targetPlatformPackages.length} packages</span>
                    </div>
                  </div>
                ))}
              </div>
              {run.documentary.enabled && (
                <div className="mt-4 rounded-xl border border-fuchsia-100 bg-fuchsia-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{run.documentary.title}</p>
                      <p className="text-xs text-slate-600">{run.documentary.chapters.length} chapters / {run.documentary.cutdownCandidates} cutdowns</p>
                    </div>
                    <Badge className="border-fuchsia-200 bg-white text-fuchsia-700">{run.documentary.targetMinutes} min</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {run.documentary.chapters.slice(0, 4).map((chapter) => (
                      <div key={chapter.id} className="rounded-lg bg-white p-3 text-xs text-slate-600">
                        <p className="font-semibold text-slate-950">{chapter.title}</p>
                        <p className="mt-1">{chapter.claimCount} claims / {chapter.renderPath}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-fuchsia-100 bg-white shadow-sm">
            <CardHeader>
              <SectionTitle icon={CreditCard} title="SaaS And Finance" kicker={run.financialModel.planReadiness} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Seed budget</p>
                  <p className="text-lg font-black text-slate-950">${run.financialModel.monthlySeedBudgetUsd}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Cost/min</p>
                  <p className="text-lg font-black text-slate-950">${run.financialModel.costPerFinishedMinuteUsd}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">Revenue layers</p>
                <div className="flex flex-wrap gap-2">
                  {run.financialModel.revenueLayers.map((layer) => (
                    <Badge key={layer} className="border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700">{layer}</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <CreditCard className="size-4 text-fuchsia-700" />
                  <p className="text-sm font-semibold text-slate-950">PayPal billing</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {run.financialModel.payPal.products.map((plan) => (
                    <Badge key={plan} className="bg-white text-slate-700 ring-1 ring-slate-200">{plan}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card className="border-fuchsia-100 bg-white shadow-sm">
            <CardHeader>
              <SectionTitle icon={RadioTower} title="PulsePost Packages" kicker={`${packageSummary.direct} direct, ${packageSummary.manual} manual`} />
            </CardHeader>
            <CardContent className="space-y-2">
              {run.platformPackages.slice(0, 10).map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{pkg.platform}</p>
                    <p className="text-xs text-slate-500">{pkg.schedulePolicy}</p>
                  </div>
                  <Badge className={publishTone[pkg.publishMode]}>{pkg.publishMode}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-fuchsia-100 bg-white shadow-sm">
            <CardHeader>
              <SectionTitle icon={Database} title="Connectors" kicker="Capability registry" />
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.connectors.map((connector) => (
                <div key={connector.platform} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">{connector.platform}</p>
                    <Badge className="bg-slate-50 text-slate-700">{connector.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{connector.fallback}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-fuchsia-100 bg-white shadow-sm">
            <CardHeader>
              <SectionTitle icon={Globe2} title="Channel Factory" kicker="Launch templates" />
            </CardHeader>
            <CardContent className="space-y-2">
              {run.channelPlan.map((channel) => (
                <div key={channel.code} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">{channel.name}</p>
                    <Badge className={statusTone[channel.riskLevel]}>{channel.riskLevel}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{channel.audience}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    <span>{channel.cadence}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card className="border-fuchsia-100 bg-white shadow-sm">
            <CardHeader>
              <SectionTitle icon={Activity} title="SignalLoop" kicker="Reward-aware optimization" />
            </CardHeader>
            <CardContent className="space-y-3">
              {run.trendSignals.map((signal) => (
                <div key={signal} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <BadgeCheck className="mt-0.5 size-4 flex-none text-fuchsia-700" />
                  <span>{signal}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-fuchsia-100 bg-white shadow-sm">
            <CardHeader>
              <SectionTitle icon={BarChart3} title="Provider And CTQ Matrix" kicker="ModelMesh plus Six Sigma" />
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {overview.providers.map((provider) => (
                <div key={provider.category} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-sm font-semibold text-slate-950">{provider.category}</p>
                  <p className="mt-1 text-xs text-slate-500">{provider.primary}</p>
                </div>
              ))}
              <div className="rounded-lg border border-fuchsia-100 bg-fuchsia-50 p-3 md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {overview.sixSigmaCtqs.map((ctq) => (
                    <Badge key={ctq} className="bg-white text-fuchsia-700 ring-1 ring-fuchsia-100">{ctq}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
