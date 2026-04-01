import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import DemoCallWidget from "@/components/DemoCallWidget";
import ROICalculator from "@/components/ROICalculator";
import IndustryDemos from "@/components/IndustryDemos";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import LandingFaq from "@/components/marketing/LandingFaq";
import LandingTestimonialCarousel from "@/components/marketing/LandingTestimonialCarousel";
import ApexLogo from "@/components/branding/ApexLogo";
import { landingColors as C } from "@/components/marketing/landingTheme";
import {
  platformCapabilities,
  platformOverview,
  platformPillars,
  pricingInboundBullets,
  pricingOutboundBullets,
  productFeatures,
  scaleWithApexSection,
  solutionsByIndustry,
  trustEnterpriseBullets,
  unifiedCommunicationsSection,
} from "@/components/marketing/siteContent";
import {
  ArrowRight,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  CheckCircle2,
  Zap,
  BarChart3,
  Calendar,
  MessageSquare,
  Shield,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

function publicAsset(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\//, "")}`;
}

const testimonials = [
  { name: "Moises R.", co: "Roofing — Dallas", quote: "200+ appointments, 160 contracts, $2M revenue in two weeks.", before: "5% response rate manually", after: "47% with ApexAI", icon: "🏗️" },
  { name: "Sarah K.", co: "Solar — Arizona", quote: "47% response rate vs 5% manual calling. 90 bookings every month now.", before: "Missing half our inbound calls", after: "Zero missed calls", icon: "☀️" },
  { name: "James T.", co: "HVAC — Florida", quote: "Never miss a call again. 3x revenue in 90 days. Game changer.", before: "Voicemail killing leads", after: "3x revenue in 90 days", icon: "❄️" },
];

const logos = ["Solar Pro", "RoofRight", "HVAC Masters", "InsureNow", "RealEdge", "BuildCo", "SkyLine", "ProServ"];

const tickerItems = [
  "🟢 Sarah K. just booked a solar appointment — Irving TX",
  "🟢 Roofing campaign: 38 bookings booked today",
  "🟢 HVAC lead qualified: $12k job — Phoenix AZ",
  "🟢 Insurance: 147 calls handled this hour",
  "🟢 Real estate: 22 showings scheduled today",
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTicker((n) => n + 1), 4200);
    return () => clearInterval(t);
  }, []);

  const tabs = [
    { label: "Inbound AI", icon: <PhoneIncoming size={14} /> },
    { label: "Outbound AI", icon: <PhoneOutgoing size={14} /> },
    { label: "Booking", icon: <Calendar size={14} /> },
    { label: "Analytics", icon: <BarChart3 size={14} /> },
  ];

  const tabContent = [
    {
      color: C.green,
      headline: "Answer every call. Capture every lead.",
      body: "ApexAI picks up in under a second, qualifies the caller, and books the appointment — without a human ever picking up the phone.",
      points: ["Instant pickup — zero calls to voicemail", "Real-time lead qualification", "Books directly to your calendar", "Auto SMS confirmation sent", "Full transcript and recording"],
      panel: (
        <div className="rounded-2xl border border-white/25 p-7" style={{ backgroundColor: C.bg }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">Live call example</div>
          {[
            { r: "Caller", t: "Do you handle solar companies?" },
            { r: "ApexAI", t: "Absolutely. We handle inbound calls, qualify homeowners, and book installs directly to your calendar. Are you getting a lot of inbound leads right now?" },
            { r: "Caller", t: "Yes, about 50 a day but we miss half of them." },
            { r: "ApexAI", t: "Got it — that is a lot of missed revenue. I can show you exactly how ApexAI handles those calls. Want me to set up a quick demo?" },
          ].map(({ r, t }, i) => (
            <div key={i} className="mb-3 flex gap-2.5">
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  color: r === "ApexAI" ? "#fff" : "#000",
                  backgroundColor: r === "ApexAI" ? C.blue : "rgba(255,255,255,0.15)",
                }}
              >
                {r === "ApexAI" ? "A" : "C"}
              </div>
              <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: r === "ApexAI" ? `${C.blue}18` : "rgba(255,255,255,0.04)" }}>
                <div className="mb-0.5 text-[10px] font-bold" style={{ color: r === "ApexAI" ? C.blue2 : "rgba(255,255,255,0.4)" }}>
                  {r}
                </div>
                <div className="text-[13px] leading-snug" style={{ color: r === "ApexAI" ? C.white : "rgba(255,255,255,0.62)" }}>
                  {t}
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      color: C.blue2,
      headline: "Run outbound campaigns at scale.",
      body: "Upload your lead list and ApexAI calls them all. Qualifies the interested ones, books appointments, and follows up on everyone else automatically.",
      points: ["Upload contacts — calling in minutes", "Handles objections naturally", "Books qualified leads automatically", "SMS and email follow-up built in", "Full campaign analytics dashboard"],
      panel: (
        <div className="rounded-2xl border border-white/25 p-7" style={{ backgroundColor: C.bg }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">Campaign dashboard — live</div>
          {[
            { label: "Campaign", value: "Solar Q1 — Texas", color: C.blue2 },
            { label: "Contacts loaded", value: "2,847", color: C.white },
            { label: "Calls made today", value: "412", color: C.green },
            { label: "Appointments booked", value: "38", color: "#f59e0b" },
            { label: "Conversion rate", value: "9.2%", color: C.green },
            { label: "SMS follow-ups sent", value: "374", color: C.blue3 },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between border-b border-white/20 py-2.5">
              <span className="text-[13px] text-white/40">{label}</span>
              <span className="text-sm font-bold" style={{ color }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      color: "#f59e0b",
      headline: "Appointments booked automatically.",
      body: "No back-and-forth. The AI collects name, phone, and preferred time — confirms it, sends a reminder, and writes it to your calendar.",
      points: ["Name, phone, and time collected", "Instant confirmation SMS sent", "Calendar sync and reminders", "Reduces no-shows by 60%", "CRM updated automatically"],
      panel: (
        <div className="rounded-2xl border border-white/25 p-7" style={{ backgroundColor: C.bg }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">Booking confirmation</div>
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="mb-2 text-xs font-bold text-emerald-400">✓ APPOINTMENT CONFIRMED</div>
            <div className="mb-1 text-[15px] font-semibold text-white">Sarah Johnson — Solar Assessment</div>
            <div className="text-[13px] text-white/60">Tuesday, April 8 at 2:00 PM</div>
            <div className="text-[13px] text-white/60">📱 SMS confirmation sent to (555) 867-5309</div>
          </div>
          <p className="text-[13px] leading-relaxed text-white/45">Booked automatically during inbound call. No human involved. Calendar updated instantly.</p>
        </div>
      ),
    },
    {
      color: "#a78bfa",
      headline: "Full visibility into every conversation.",
      body: "Every call recorded, transcribed, and scored. Know your conversion rate, top objections, and AI performance — turn by turn.",
      points: ["All calls recorded and transcribed", "Lead scoring per call", "Objection pattern tracking", "Per-campaign conversion analytics", "Export to your CRM"],
      panel: (
        <div className="rounded-2xl border border-white/25 p-7" style={{ backgroundColor: C.bg }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">Analytics — today</div>
          {[
            { label: "Calls handled", value: "847", pct: "+23%" },
            { label: "Leads qualified", value: "203", pct: "+31%" },
            { label: "Appointments booked", value: "67", pct: "+18%" },
            { label: "Avg call duration", value: "3m 24s", pct: "stable" },
            { label: "Conversion rate", value: "7.9%", pct: "+2.1%" },
          ].map(({ label, value, pct }) => (
            <div key={label} className="flex items-center justify-between border-b border-white/20 py-2.5">
              <span className="text-[13px] text-white/40">{label}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{value}</span>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-400">{pct}</span>
              </span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div
      className="min-w-0 bg-black pb-24 text-white antialiased md:pb-0"
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      <style>{`
        .show-mobile{display:none!important}
        @media(max-width:768px){
          .show-mobile{display:flex!important}
          .hide-mobile{display:none!important}
          .grid-2{grid-template-columns:1fr!important}
          .grid-3{grid-template-columns:1fr!important}
          .grid-4{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(max-width:900px){.how-works-grid{grid-template-columns:1fr!important;gap:14px!important}.how-works-arrow{display:none!important}}
        @media(max-width:768px){.footer-cols{grid-template-columns:1fr!important;gap:28px!important}}
      `}</style>

      <div className="border-b border-white/25 bg-black px-6 py-2.5 text-center text-sm font-semibold text-white/90">
        {tickerItems[ticker % tickerItems.length]}
      </div>

      <MarketingNav />

      {/* HERO — new shell: dark band, not full-page dark */}
      <section className="relative overflow-hidden border-b border-white/20 bg-black px-6 py-24 text-center text-white md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="pointer-events-none absolute left-1/2 top-[8%] h-[420px] w-[780px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(29,111,244,0.12)_0%,transparent_65%)]" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 flex justify-center sm:mb-8">
            <ApexLogo variant="full" size="lg" imgClassName="rounded-md border border-white/10 px-3 py-1.5" />
          </div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live — production lines answering now
          </div>
          <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-tight md:text-6xl md:leading-[1.05]">
            Inbound and outbound AI voice.
            <span className="block text-blue-400">Unified communications — voice, SMS, email, one ApexAI stack.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-400">
            {platformOverview.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#demo">
              <Button size="lg" className="h-12 gap-2 bg-blue-600 px-8 font-bold text-white hover:bg-blue-500">
                <Phone className="size-5" /> Hear it on your phone
              </Button>
            </a>
            <a href={getLoginUrl()}>
              <Button size="lg" variant="outline" className="h-12 border-zinc-600 bg-transparent px-8 font-semibold text-white hover:bg-white/10">
                Start free trial <ArrowRight className="ml-1 size-4" />
              </Button>
            </a>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 border-t border-white/10 pt-12 sm:grid-cols-4">
            {[
              { value: "< 1s", label: "Typical pickup" },
              { value: "24/7", label: "Inbound coverage" },
              { value: "1 brain", label: "Voice + SMS + email" },
              { value: "8+", label: "Cartesia voices" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-black text-blue-300">{s.value}</div>
                <div className="mt-1 text-xs font-medium text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-y border-white/20 bg-black py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-wider text-zinc-400">Teams running high-intent phone revenue</p>
          <div className="flex flex-wrap justify-center gap-3">
            {logos.map((l) => (
              <span key={l} className="rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200">
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* UNIFIED COMMUNICATIONS — talking points: omnichannel, voice-first, proof */}
      <section id="unified-comms" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">{unifiedCommunicationsSection.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">{unifiedCommunicationsSection.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-300">{unifiedCommunicationsSection.subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {unifiedCommunicationsSection.pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-2xl border border-white/20 bg-white/[0.04] p-8">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{p.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section id="platform" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Platform</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">{platformOverview.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-300">{platformOverview.subtitle}</p>
          </div>

          <div className="mb-16 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.02]">
            <img
              src={publicAsset("marketing/dashboard-analytics.webp")}
              alt="Analytics dashboard — calls, leads, and outcomes"
              className="w-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="mb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformPillars.map((p) => {
              const Icon = p.icon;
              const id = p.href.replace("#", "");
              return (
                <div
                  key={p.href}
                  id={id}
                  className="scroll-mt-28 rounded-2xl border border-white/20 bg-white/5 p-6 transition-shadow hover:border-white/30"
                >
                  {Icon ? (
                    <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
                      <Icon className="size-5" />
                    </div>
                  ) : null}
                  <h3 className="text-lg font-bold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.description}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border border-white/25 bg-black p-6 md:p-10">
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-wider text-blue-400">Interactive — same four modules in the app</p>
            <div className="mb-8 flex flex-wrap justify-center gap-1 rounded-xl border border-white/15 bg-white/5 p-1">
              {tabs.map((tab, i) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeTab === i ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="grid-2 grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: tabContent[activeTab]!.color }}>
                  {tabs[activeTab]!.label}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white md:text-3xl">{tabContent[activeTab]!.headline}</h3>
                <p className="mt-3 text-zinc-400">{tabContent[activeTab]!.body}</p>
                <ul className="mt-6 space-y-2">
                  {tabContent[activeTab]!.points.map((pt) => (
                    <li key={pt} className="flex gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: tabContent[activeTab]!.color }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              {tabContent[activeTab]!.panel}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — ApexAI product + pricing bullets */}
      <section id="features" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">What ApexAI does in your account</h2>
            <p className="mt-4 text-lg text-zinc-300">
              Voice AI capabilities from the product surface, plus the inbound and outbound capabilities listed on pricing — no generic “AI widget” list.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {productFeatures.map((f) => {
              const Icon = f.icon;
              const fid = f.href.replace("#", "");
              return (
                <div key={f.href} id={fid} className="scroll-mt-28 rounded-2xl border border-white/20 bg-white/5 p-6">
                  <div className="flex gap-4">
                    {Icon ? (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
                        <Icon className="size-5" />
                      </div>
                    ) : null}
                    <div>
                      <h3 className="font-bold text-white">{f.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{f.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div id="features-channels" className="scroll-mt-28 mt-10 rounded-2xl border border-white/20 bg-white/5 p-8">
            <h3 className="text-xl font-bold text-white">Channels, campaigns, and ops</h3>
            <p className="mt-2 text-zinc-300">Everything that ships beside the live voice agent — how teams actually run revenue.</p>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Inbound (pricing)</p>
                <ul className="space-y-2">
                  {pricingInboundBullets.map((x) => (
                    <li key={x} className="flex gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Outbound (pricing)</p>
                <ul className="space-y-2">
                  {pricingOutboundBullets.map((x) => (
                    <li key={x} className="flex gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CROSSWALK-aligned capabilities (Settings + core flows) */}
      <section id="capabilities" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Full product surface</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">Everything we ship in the product</h2>
            <p className="mt-4 text-lg text-zinc-300">
              One account ties together voice, SMS, email campaigns, CRM, knowledge, and integrations — so your team does not juggle disconnected tools. Mirrors our integration crosswalk (20 core capabilities).
            </p>
          </div>
          <div className="mb-14 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/15">
              <img
                src={publicAsset("marketing/integrations-display.webp")}
                alt="Integrations and connected tools"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/15">
              <img
                src={publicAsset("marketing/workflow-diagram.webp")}
                alt="Workflow and automation diagram"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {platformCapabilities.map((cap) => (
              <div key={cap.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-sm font-semibold text-white">{cap.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{cap.blurb}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-zinc-500">
            Detailed status: <code className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-400">docs/integration/CROSSWALK.md</code>
          </p>
        </div>
      </section>

      {/* SCALE / OPERATING MODEL — deploy, data-driven, tune */}
      <section id="scale-with-apex" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">{scaleWithApexSection.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">{scaleWithApexSection.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-300">{scaleWithApexSection.subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {scaleWithApexSection.items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-8">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-600/25 text-blue-300">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section id="different" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <div className="mb-4 flex justify-center">
              <ApexLogo variant="mark" size="md" imgClassName="rounded-md border border-white/10 px-3 py-2" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Why ApexAI</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">Legacy IVR vs ApexAI</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-300">
              Menus and voicemail leak revenue. ApexAI holds a real conversation, qualifies intent, and books — on every ring.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/25 bg-black p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Legacy phone tree</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-300">
                <li>Press 1… press 2… callers hang up</li>
                <li>Voicemail when you are busy</li>
                <li>No qualification or follow-up</li>
                <li>Static scripts, no learning loop</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">ApexAI</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-200">
                <li>Natural dialogue — sub-second pickup</li>
                <li>24/7 answers with barge-in and handoff</li>
                <li>Qualifies, books, SMS confirms</li>
                <li>Transcripts, analytics, campaign scale</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">Real-time phone conversation — not a chatbot</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-300">
              Your caller talks naturally. The system listens, decides when they are done speaking, generates a reply, and speaks with a natural voice — while optional actions like calendar and SMS run in the background.
            </p>
          </div>
          <div className="how-works-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: "📞", label: "Caller speaks", sub: "Audio from the phone line is processed continuously.", color: C.blue },
              { icon: "🎤", label: "Speech timing", sub: "Detects when the caller finishes so replies do not talk over them.", color: C.blue2 },
              { icon: "🧠", label: "Intelligent reply", sub: "Tuned for natural sales and support conversations on the phone.", color: "#a78bfa" },
              { icon: "🔊", label: "Natural voice", sub: "Speaks as the answer is ready — minimal awkward silence.", color: C.green },
              { icon: "✅", label: "Actions", sub: "Bookings, CRM updates, and text confirmations when you enable them.", color: "#f59e0b" },
            ].map(({ icon, label, sub, color }, idx) => (
              <div key={label} className="flex min-w-0 items-stretch">
                <div className="flex flex-1 flex-col gap-2 rounded-xl border border-white/20 bg-white/5 p-4 text-center">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-bold" style={{ color }}>
                    {label}
                  </span>
                  <span className="text-[11px] leading-snug text-zinc-400">{sub}</span>
                </div>
                {idx < 4 && <span className="how-works-arrow hidden items-center px-1 text-blue-400 lg:flex">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Live demo</p>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-300">
              No signup. No credit card. We call you so you hear the same experience your leads get on your lines.
            </p>
          </div>
          <div className="rounded-3xl border border-white/25 bg-black p-6 md:p-10">
            <DemoCallWidget />
          </div>
        </div>
      </section>

      {/* SOLUTIONS */}
      <section id="solutions" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div id="inbound" className="h-px scroll-mt-28 overflow-hidden opacity-0" aria-hidden />
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Solutions</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">Industry packs</h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-300">
              Same ApexAI engine — scripts and qualification tuned for how you already sell. Jump to a vertical or play the demos below.
            </p>
          </div>
          <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {solutionsByIndustry.map((s) => {
              const Icon = s.icon;
              const sid = s.href.replace("#", "");
              return (
                <div key={s.href} id={sid} className="scroll-mt-28">
                  <div className="h-full rounded-xl border border-white/20 bg-white/5 p-5 transition-colors hover:border-blue-400/40">
                    <div className="flex items-start gap-3">
                      {Icon ? (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                          <Icon className="size-5" />
                        </div>
                      ) : null}
                      <div>
                        <h3 className="font-bold text-white">{s.title}</h3>
                        <p className="mt-1 text-sm text-zinc-400">{s.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mb-12 grid gap-4 md:grid-cols-2">
            <img
              src={publicAsset("marketing/team-collaboration.webp")}
              alt="Team collaboration on revenue and calls"
              className="h-48 w-full rounded-2xl border border-white/15 object-cover md:h-56"
              loading="lazy"
              decoding="async"
            />
            <img
              src={publicAsset("marketing/growth-chart.webp")}
              alt="Growth and performance chart"
              className="h-48 w-full rounded-2xl border border-white/15 object-cover md:h-56"
              loading="lazy"
              decoding="async"
            />
          </div>
          <IndustryDemos />
        </div>
      </section>

      {/* ROI */}
      <section id="calculator" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-20 md:py-24">
        <div id="outbound" className="h-px scroll-mt-28 overflow-hidden opacity-0" aria-hidden />
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Revenue calculator</p>
          <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">Model the gap</h2>
          <p className="mx-auto mt-4 mb-10 max-w-xl text-zinc-300">
            Slide your current funnel metrics. See an illustrative comparison when more leads get contacted and booked.
          </p>
          <ROICalculator />
        </div>
      </section>

      <LandingTestimonialCarousel testimonials={testimonials} variant="dark" />

      <LandingFaq variant="dark" />

      {/* TRUST (lightweight) */}
      <section id="trust" className="scroll-mt-24 border-b border-white/20 bg-black px-6 py-12 md:py-14">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-white/[0.03] p-6 md:p-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Data & security</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white md:text-3xl">Your data is handled with care</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 md:text-base">
              Lightweight safeguards built into ApexAI so your team can move fast without losing control.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <Shield className="size-4 text-blue-400" />, title: "Encrypted transport", desc: "Traffic is encrypted in transit and platform data is encrypted at rest." },
              { icon: <MessageSquare className="size-4 text-blue-400" />, title: "Consent-aware flows", desc: "Outbound workflows keep consent and opt-out handling visible and organized." },
              { icon: <Star className="size-4 text-blue-400" />, title: "Audit visibility", desc: "Calls, transcripts, and activity logs are reviewable for QA and accountability." },
              { icon: <Phone className="size-4 text-blue-400" />, title: "Human handoff", desc: "Any conversation can transfer to a human when needed." },
              ...trustEnterpriseBullets.map((b) => ({
                icon: <CheckCircle2 className="size-4 text-emerald-400" />,
                title: b.title,
                desc: b.description,
              })),
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  {icon}
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/20 bg-black px-6 py-20 text-center text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,111,244,0.15)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-lg">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            Stop missing calls.
            <span className="block text-blue-400">Start closing more.</span>
          </h2>
          <p className="mt-4 text-zinc-400">Your competitors are already using AI. The question is whether yours is better than theirs.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#demo">
              <Button size="lg" className="h-12 bg-blue-600 px-8 font-bold hover:bg-blue-500">
                <Phone className="mr-2 size-5" /> Get your first AI call
              </Button>
            </a>
            <a href={getLoginUrl()}>
              <Button size="lg" variant="outline" className="h-12 border-zinc-600 bg-transparent px-8 text-white hover:bg-white/10">
                Sign up free
              </Button>
            </a>
          </div>
          <p className="mt-6 text-sm text-zinc-500">No credit card required. Live in under 5 minutes.</p>
        </div>
      </section>

      <MarketingFooter />

      {/* Mobile sticky conversion bar — hidden on md+ */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-white/20 bg-black/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
        role="region"
        aria-label="Quick actions"
      >
        <a href="#demo" className="min-w-0 flex-1">
          <Button size="lg" className="h-12 w-full gap-2 bg-blue-600 px-3 font-bold text-white hover:bg-blue-500">
            <Phone className="size-4 shrink-0" />
            <span className="truncate">Hear it on your phone</span>
          </Button>
        </a>
        <a href={getLoginUrl()} className="min-w-0 flex-1">
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full border-zinc-600 bg-transparent px-3 font-semibold text-white hover:bg-white/10"
          >
            <span className="truncate">Start free trial</span>
          </Button>
        </a>
      </div>
    </div>
  );
}
