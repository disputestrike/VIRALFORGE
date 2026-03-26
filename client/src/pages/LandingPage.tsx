import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowRight, Bot, CheckCircle2, Mail, MessageSquare, Phone,
  Share2, Star, Zap, BarChart3, Clock, Headphones, Menu, X, Shield,
} from "lucide-react";
import { useState } from "react";
import LiveTicker from "@/components/LiveTicker";
import ROICalculator from "@/components/ROICalculator";
import CommunityWins from "@/components/CommunityWins";

const features = [
  { icon: Phone, title: "Voice AI Calls", desc: "Human-sounding AI that books appointments on autopilot across any industry.", img: "/voice_ai.png" },
  { icon: MessageSquare, title: "SMS Outreach", desc: "Personalized SMS campaigns with intelligent follow-up sequences.", img: "/multichannel.png" },
  { icon: Mail, title: "Email Automation", desc: "Multi-step email sequences with dynamic personalization at scale.", img: null },
  { icon: Share2, title: "Lead Intelligence", desc: "AI qualifies and scores every lead. Focus only on real buyers.", img: "/lead_list.png" },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Live dashboards tracking response rate, show rate, and ROI.", img: null },
  { icon: Clock, title: "24/7 Automation", desc: "Your AI works while you sleep. Leads contacted instantly, every time.", img: null },
];

const staticTestimonials = [
  { name: "Moises R.", industry: "Roofing", result: "200+ appointments, 160 contracts, $2M in two weeks", before: "Manual cold calling, 5% response rate", after: "AI-driven outreach, 47% response rate" },
  { name: "Sarah K.", industry: "Solar", result: "312 qualified leads in 30 days, $890K pipeline", before: "3 SDRs, 40 calls/day", after: "AI handles 500+ touchpoints daily" },
  { name: "Marcus T.", industry: "HVAC", result: "89 booked appointments, $240K closed in 6 weeks", before: "Struggling to fill calendar", after: "Calendar fully booked 3 weeks out" },
];

const pricingTiers = [
  { name: "Starter", leads: 50, price: 249, desc: "Perfect for testing" },
  { name: "Growth", leads: 100, price: 498, desc: "Scaling your campaigns", popular: true },
  { name: "Pro", leads: 250, price: 1245, desc: "Mid-market volume" },
  { name: "Enterprise", leads: 500, price: 2490, desc: "Full-scale operations" },
];

export default function LandingPageFull() {
  const { isAuthenticated } = useAuth();
  const { data: testimonials } = trpc.testimonials.list.useQuery({ featuredOnly: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayTestimonials = testimonials && testimonials.length > 0
    ? testimonials.slice(0, 3) : staticTestimonials;

  const handleGetStarted = () => {
    window.location.href = isAuthenticated ? "/dashboard" : getLoginUrl();
  };

  return (
    <div className="min-h-screen text-foreground" style={{ backgroundColor: "#0f1117" }}>

      {/* ── Navigation ── */}
      <header style={{ backgroundColor: "rgba(18,20,28,0.92)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        className="backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity">
              <img src="/logo.png" alt="ApexAI" className="h-8 w-auto" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {["#features", "#results", "#case-studies", "#pricing", "#about", "#contact"].map((href) => (
              <a key={href} href={href}
                className="hover:text-white transition-colors capitalize">
                {href.replace("#", "").replace("-", " ")}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleGetStarted}
              style={{ backgroundColor: "#1d6ff4", borderColor: "#1d6ff4" }}>
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t p-4 space-y-3" style={{ backgroundColor: "#141820", borderColor: "rgba(255,255,255,0.08)" }}>
            {["#features", "#results", "#case-studies", "#pricing", "#about", "#contact"].map((href) => (
              <a key={href} href={href} className="block text-sm capitalize"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                {href.replace("#", "").replace("-", " ")}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-0 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,111,244,0.12), transparent)" }} />

        <div className="max-w-5xl mx-auto text-center relative">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium"
            style={{ borderColor: "rgba(29,111,244,0.4)", color: "#5b9bf8", backgroundColor: "rgba(29,111,244,0.08)" }}>
            <Zap className="w-3 h-3 mr-1.5" />
            AI-Powered Sales Automation
          </Badge>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight text-white">
            Stop Chasing Leads.
            <br />
            <span style={{ backgroundImage: "linear-gradient(135deg, #1d6ff4, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Start Closing Deals.
            </span>
          </h1>

          <p className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            AI-powered outbound calling, SMS, email, and social outreach that books appointments on autopilot — for any industry.{" "}
            <span className="text-white font-semibold">We handle everything. You just close deals.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button size="lg" className="text-base px-8 h-12" onClick={handleGetStarted}
              style={{ backgroundColor: "#1d6ff4", borderColor: "#1d6ff4" }}>
              Launch Your Campaign <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-12 text-white"
              style={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "transparent" }}>
              Watch Demo (Coming Soon)
            </Button>
          </div>

          <p className="text-sm mb-12" style={{ color: "rgba(255,255,255,0.4)" }}>
            Expert setup day one · 30-day dedicated support · $249/month to start
          </p>

          {/* Hero image — full bleed, no border, fades at bottom */}
          <div className="relative mx-auto max-w-5xl">
            <img src="/hero_image.png" alt="ApexAI Sales Dashboard"
              className="w-full rounded-t-2xl object-cover"
              style={{ maxHeight: 520, objectPosition: "top" }} />
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
              style={{ background: "linear-gradient(to top, #0f1117, transparent)" }} />
          </div>
        </div>
      </section>

      {/* ── LIVE TICKER ── */}
      <LiveTicker />

      {/* ── METRICS ── */}
      <section id="results" className="py-16 px-6"
        style={{ backgroundColor: "#141820", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs mb-10 uppercase tracking-widest font-medium"
            style={{ color: "rgba(255,255,255,0.35)" }}>Platform Performance Metrics</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Avg Response Rate", value: "47%", color: "#60a5fa", desc: "vs 5% industry avg" },
              { label: "Avg Schedule Rate", value: "68%", color: "#34d399", desc: "of all responses" },
              { label: "Avg Show Rate", value: "82%", color: "#fb923c", desc: "appointment attendance" },
              { label: "Avg Increase In Sales", value: "312%", color: "#c084fc", desc: "within 90 days" },
            ].map((m) => (
              <div key={m.label} className="text-center p-6 rounded-xl"
                style={{ backgroundColor: "#1a1e2a", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-4xl font-black mb-2" style={{ color: m.color }}>{m.value}</div>
                <div className="text-sm font-semibold text-white mb-1">{m.label}</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — Voice AI with real image ── */}
      <section id="features" className="py-20 px-6" style={{ backgroundColor: "#0f1117" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">Everything in One Native Platform</h2>
            <p className="text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>No integrations. No Zapier. No outside tools.</p>
          </div>

          {/* Voice AI feature — full-width highlight */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16 p-8 rounded-2xl"
            style={{ backgroundColor: "#141820", border: "1px solid rgba(29,111,244,0.2)" }}>
            <div>
              <Badge className="mb-4" style={{ backgroundColor: "rgba(29,111,244,0.15)", color: "#60a5fa", border: "1px solid rgba(29,111,244,0.3)" }}>
                #1 Feature
              </Badge>
              <h3 className="text-2xl font-bold text-white mb-4">AI Voice Calls That Sound Human</h3>
              <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                Our AI makes outbound calls that leads can't distinguish from a real salesperson. It qualifies, handles objections, and books appointments — all without a human dialing.
              </p>
              <ul className="space-y-2">
                {["Natural conversation flow", "Handles objections intelligently", "Books appointments automatically", "Works 24/7 across time zones"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#34d399" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src="/voice_ai.png" alt="AI Voice Call" className="w-full h-auto object-cover" />
            </div>
          </div>

          {/* Multichannel — with image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src="/multichannel.png" alt="Multichannel Outreach" className="w-full h-auto object-cover" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Multi-Channel Outreach in One Platform</h3>
              <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                Email sequences, SMS campaigns, and voice calls — all coordinated automatically. One lead, every channel, zero manual work.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {features.slice(1, 5).map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="p-4 rounded-xl"
                    style={{ backgroundColor: "#1a1e2a", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <Icon className="w-5 h-5 mb-2" style={{ color: "#1d6ff4" }} />
                    <p className="font-semibold text-sm text-white mb-1">{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lead List — with image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Intelligent Lead Management</h3>
              <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                Import, score, segment, and track every lead. Plain-English search. AI qualification before the first call is ever made.
              </p>
              <div className="flex items-center gap-3 p-4 rounded-xl"
                style={{ backgroundColor: "#1a1e2a", border: "1px solid rgba(29,111,244,0.2)" }}>
                <img src="/ai_chip.png" alt="AI" className="w-12 h-12 object-contain flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white text-sm">AI Lead Scoring</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Every lead scored 0–100 before you spend a single call minute</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src="/lead_list.png" alt="Lead Management" className="w-full h-auto object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section style={{ backgroundColor: "#141820", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">See Every Number. In Real Time.</h2>
            <p className="text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>Appointments booked, revenue growth, show rates — all live on your dashboard.</p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: "1px solid rgba(29,111,244,0.25)" }}>
            <img src="/dashboard_analytics.png" alt="ApexAI Analytics Dashboard" className="w-full h-auto object-cover" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { v: "540", l: "Appts this month", up: "+28.6%" },
              { v: "82%", l: "Show rate", up: "↑ from 71%" },
              { v: "$152K", l: "Revenue tracked", up: "+41%" },
              { v: "89%", l: "Client retention", up: "Industry avg: 62%" },
            ].map(s => (
              <div key={s.l} className="p-4 rounded-xl text-center"
                style={{ backgroundColor: "#1a1e2a", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-2xl font-black text-white mb-1">{s.v}</p>
                <p className="text-xs font-medium text-white mb-1">{s.l}</p>
                <p className="text-xs" style={{ color: "#34d399" }}>{s.up}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES — Solar + Roofing ── */}
      <section id="case-studies" className="py-20 px-6" style={{ backgroundColor: "#0f1117" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Real Results, Real Industries</h2>
            <p className="text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>Every result follows the same pattern: specific numbers, before and after.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Solar */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#141820" }}>
              <img src="/industry_solar.png" alt="Solar Industry" className="w-full h-56 object-cover" />
              <div className="p-6">
                <Badge className="mb-3" style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                  Solar
                </Badge>
                <h3 className="text-xl font-bold text-white mb-2">Calendar Fully Booked in 30 Days</h3>
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                  "312 qualified leads in 30 days, $890K pipeline. Before: 3 SDRs, 40 calls/day. After: AI handles 500+ touchpoints daily."
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Sarah K.</span>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ade80" }}>+312% Pipeline</span>
                </div>
              </div>
            </div>

            {/* Roofing */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#141820" }}>
              <img src="/industry_roofing.png" alt="Roofing Industry" className="w-full h-56 object-cover" />
              <div className="p-6">
                <Badge className="mb-3" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                  Roofing
                </Badge>
                <h3 className="text-xl font-bold text-white mb-2">$2M Closed in Two Weeks</h3>
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                  "200+ appointments, 160 contracts, $2M in two weeks. Before: manual cold calling, 5% response rate. After: 47% response rate."
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Moises R.</span>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ade80" }}>$2M in 2 Weeks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayTestimonials.map((t: any, i: number) => (
              <div key={i} className="p-6 rounded-xl" style={{ backgroundColor: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="font-bold text-white mb-4 leading-relaxed" style={{ color: "#60a5fa" }}>
                  {t.resultValue ?? t.result}
                </p>
                <div className="space-y-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
                  <p className="text-xs"><span className="text-red-400 font-semibold">Before: </span><span style={{ color: "rgba(255,255,255,0.5)" }}>{t.beforeMetric ?? t.before}</span></p>
                  <p className="text-xs"><span className="text-green-400 font-semibold">After: </span><span style={{ color: "rgba(255,255,255,0.5)" }}>{t.afterMetric ?? t.after}</span></p>
                </div>
                <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-sm font-semibold text-white">{t.clientName ?? t.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{t.industry} Industry</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#141820" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Not Just Software. A Done-For-You System.</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
              A dedicated specialist sets up your entire system on day one, optimizes it for 30 days, and hands off a fully working machine.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                { day: "Day 1", title: "Expert Setup", desc: "WE configure everything: campaigns, templates, targeting, and AI scripts. Zero work on your end." },
                { day: "Days 2–14", title: "Sales Optimization", desc: "WE analyze data, refine messaging, optimize conversions. YOU focus on closing." },
                { day: "Days 15–30", title: "Scale & Handoff", desc: "System running at peak performance. WE hand you a fully built, proven machine. YOU just scale." },
              ].map((step, i) => (
                <div key={step.day} className="flex gap-6 items-start p-6 rounded-xl"
                  style={{ backgroundColor: "#1a1e2a", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-sm"
                    style={{ backgroundColor: "#1d6ff4" }}>{i + 1}</div>
                  <div>
                    <Badge className="mb-2 text-xs" style={{ backgroundColor: "rgba(29,111,244,0.12)", color: "#60a5fa", border: "1px solid rgba(29,111,244,0.25)" }}>{step.day}</Badge>
                    <h3 className="font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src="/team_collab.png" alt="ApexAI Team" className="w-full h-auto object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-6" style={{ backgroundColor: "#0f1117" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Simple, Linear Pricing</h2>
            <p className="text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>$249 per 50 leads per month. Fully managed. No surprises.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {pricingTiers.map((tier) => (
              <div key={tier.name} className={`relative p-6 rounded-xl transition-all ${tier.popular ? "scale-105" : ""}`}
                style={{
                  backgroundColor: tier.popular ? "rgba(29,111,244,0.1)" : "#141820",
                  border: tier.popular ? "2px solid #1d6ff4" : "1px solid rgba(255,255,255,0.08)",
                }}>
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" style={{ backgroundColor: "#1d6ff4" }}>
                    Most Popular
                  </Badge>
                )}
                <h3 className="font-bold text-lg text-white mb-1">{tier.name}</h3>
                <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>{tier.desc}</p>
                <div className="mb-2">
                  <span className="text-4xl font-black text-white">${tier.price}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>/mo</span>
                </div>
                <p className="text-sm mb-6 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{tier.leads} leads/month</p>
                <Button className="w-full" onClick={handleGetStarted}
                  style={tier.popular ? { backgroundColor: "#1d6ff4", borderColor: "#1d6ff4" } : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.2)", color: "white" }}
                  variant={tier.popular ? "default" : "outline"}>
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>

          {/* Guarantee badge + plan inclusions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center p-8 rounded-2xl"
            style={{ backgroundColor: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex justify-center">
              <img src="/guarantee_badge.png" alt="30-Day Risk-Free Guarantee" className="w-40 h-auto object-contain" />
            </div>
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold text-white mb-4">All plans include:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Fully managed setup & optimization",
                  "AI voice calls (human-sounding)",
                  "SMS outreach & automation",
                  "Email automation",
                  "Lead qualification engine",
                  "Real-time analytics dashboard",
                  "24/7 automated outreach",
                  "30-day dedicated support",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#34d399" }} />
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ── */}
      <ROICalculator />

      {/* ── GLOBAL / ABOUT ── */}
      <section id="about" className="py-20 px-6" style={{ backgroundColor: "#141820" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Built by Sales People. For Sales People.</h2>
              <p className="leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                ApexAI was built by founders who've been in the trenches — cold calling, managing SDRs, grinding through objections. We know the work. That's why ApexAI eliminates 80% of it.
              </p>
              <p className="leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                Our team has shipped 50+ AI products. ApexAI is the culmination of everything we learned about what actually moves deals forward.
              </p>
              <p className="leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                Not a side project. We're investing $5M+ to make ApexAI the default platform for outbound sales automation globally.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src="/team_success.png" alt="ApexAI Team Success" className="w-full h-auto object-cover" />
            </div>
          </div>

          {/* Global reach */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src="/global_reach.png" alt="Global Reach" className="w-full h-auto object-cover" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Any Industry. Any Country. Any Scale.</h3>
              <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                Solar, roofing, insurance, real estate, HVAC, financial services — if you need appointments, ApexAI works for you. We operate across 40+ countries, 24 hours a day.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[["40+", "Countries"], ["500K+", "Appointments"], ["$1B+", "Pipeline Created"]].map(([v, l]) => (
                  <div key={l} className="p-4 rounded-xl text-center"
                    style={{ backgroundColor: "#1a1e2a", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-2xl font-black text-white mb-1">{v}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMUNITY WINS ── */}
      <CommunityWins />

      {/* ── CONTACT ── */}
      <section id="contact" className="py-20 px-6" style={{ backgroundColor: "#0f1117" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Questions? We're Here.</h2>
          <p className="text-lg mb-12" style={{ color: "rgba(255,255,255,0.5)" }}>
            Our team is available for calls, emails, and detailed consultations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Headphones, title: "Phone Support", sub: "Available 9am–6pm EST", val: "Coming Soon" },
              { icon: Mail, title: "Email Support", sub: "Within 24 hours", val: "support@apexai.io", href: "mailto:support@apexai.io" },
              { icon: Bot, title: "Live Chat", sub: "On this website", val: "Chat Widget" },
            ].map(({ icon: Icon, title, sub, val, href }) => (
              <div key={title} className="p-6 rounded-xl text-center"
                style={{ backgroundColor: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Icon className="w-8 h-8 mx-auto mb-4" style={{ color: "#1d6ff4" }} />
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>
                {href ? (
                  <a href={href} className="text-sm font-mono hover:underline" style={{ color: "#60a5fa" }}>{val}</a>
                ) : (
                  <p className="text-sm font-mono" style={{ color: "#60a5fa" }}>{val}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#141820" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(29,111,244,0.15), rgba(96,165,250,0.05))", border: "1px solid rgba(29,111,244,0.25)" }}>
            <h2 className="text-4xl font-black text-white mb-4">Ready to Close More Deals?</h2>
            <p className="text-lg mb-8" style={{ color: "rgba(255,255,255,0.55)" }}>
              Join businesses using ApexAI to automate outreach and fill their calendars.
            </p>
            <Button size="lg" className="text-base px-10 h-12" onClick={handleGetStarted}
              style={{ backgroundColor: "#1d6ff4", borderColor: "#1d6ff4" }}>
              Start Your Campaign Today <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-xs mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
              30-day free trial · No credit card required · Money-back guarantee
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", backgroundColor: "#0c0e14" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src="/logo.png" alt="ApexAI" className="h-8 w-auto mb-4" />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                AI-powered sales automation for every industry.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Product</h4>
              <ul className="space-y-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><a href="#case-studies" className="hover:text-white transition-colors">Case Studies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Company</h4>
              <ul className="space-y-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Legal</h4>
              <ul className="space-y-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3 flex-wrap">
              {[["SOC 2 Type II", "rgba(34,197,94,0.1)", "rgba(34,197,94,0.2)", "#4ade80"],
                ["GDPR", "rgba(59,130,246,0.1)", "rgba(59,130,246,0.2)", "#60a5fa"],
                ["TCPA", "rgba(249,115,22,0.1)", "rgba(249,115,22,0.2)", "#fb923c"]].map(([label, bg, border, color]) => (
                <span key={label} className="px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: bg as string, border: `1px solid ${border}`, color: color as string }}>
                  ✓ {label}
                </span>
              ))}
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>© 2026 ApexAI. All rights reserved. Built by CrucibAI.</p>
            <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
