import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowRight, Bot, CheckCircle2, Mail, MessageSquare, Phone,
  Share2, Star, Zap, BarChart3, Clock, Headphones, Menu, X, Shield,
  PhoneIncoming, PhoneOutgoing, Mic,
} from "lucide-react";
import { useState } from "react";
import LiveTicker from "@/components/LiveTicker";
import ROICalculator from "@/components/ROICalculator";
import CommunityWins from "@/components/CommunityWins";

const staticTestimonials = [
  { name: "Moises R.", industry: "Roofing", result: "200+ appointments, 160 contracts, $2M in two weeks", before: "Manual cold calling, 5% response rate", after: "AI-driven outreach, 47% response rate" },
  { name: "Sarah K.", industry: "Solar", result: "312 qualified leads in 30 days, $890K pipeline", before: "3 SDRs, 40 calls/day", after: "AI handles 500+ touchpoints daily" },
  { name: "Marcus T.", industry: "HVAC", result: "89 booked appointments, $240K closed in 6 weeks", before: "Struggling to fill calendar", after: "Calendar fully booked 3 weeks out" },
];

const D = "#0f1117";
const D2 = "#141820";
const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const BLUE_LIGHT = "#60a5fa";
const GREEN = "#34d399";
const DIM = "rgba(255,255,255,0.55)";
const DIM2 = "rgba(255,255,255,0.4)";
const DIM3 = "rgba(255,255,255,0.08)";

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
    <div className="min-h-screen text-foreground" style={{ backgroundColor: D }}>

      {/* ── Navigation ── */}
      <header style={{ backgroundColor: "rgba(18,20,28,0.95)", borderBottom: `1px solid ${DIM3}` }}
        className="backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity select-none">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill={BLUE}/>
                <path d="M16 6L26 24H6L16 6Z" fill="white" opacity="0.95"/>
                <path d="M16 12L21 22H11L16 12Z" fill={BLUE}/>
              </svg>
              <span style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>
                <span style={{ color: "#ffffff" }}>Apex</span><span style={{ color: BLUE_LIGHT }}>AI</span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: DIM2 }}>
            {["#features", "#inbound", "#pricing", "#case-studies", "#about"].map((href) => (
              <a key={href} href={href} className="hover:text-white transition-colors capitalize">
                {href.replace("#", "").replace("-", " ")}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm" style={{ backgroundColor: BLUE, borderColor: BLUE }}>
                  Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={handleGetStarted} style={{ backgroundColor: BLUE, borderColor: BLUE }}>
                Get Started <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t p-4 space-y-3" style={{ backgroundColor: D2, borderColor: DIM3 }}>
            {["#features", "#inbound", "#pricing", "#case-studies", "#about"].map((href) => (
              <a key={href} href={href} className="block text-sm py-1 capitalize" style={{ color: DIM2 }}
                onClick={() => setMobileMenuOpen(false)}>
                {href.replace("#", "").replace("-", " ")}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-0 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,111,244,0.12), transparent)` }} />

        <div className="max-w-5xl mx-auto text-center relative">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium"
            style={{ borderColor: "rgba(29,111,244,0.4)", color: BLUE_LIGHT, backgroundColor: "rgba(29,111,244,0.08)" }}>
            <Zap className="w-3 h-3 mr-1.5" />
            Inbound + Outbound AI — 24/7
          </Badge>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight text-white">
            Your AI Sales Team.
            <br />
            <span style={{ backgroundImage: `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Always On. Always Closing.
            </span>
          </h1>

          <p className="text-xl max-w-2xl mx-auto mb-6 leading-relaxed" style={{ color: DIM }}>
            ApexAI handles inbound calls 24/7 and runs outbound campaigns on autopilot — booking appointments, qualifying leads, and closing deals while you sleep.
          </p>

          {/* Inbound + Outbound pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: PhoneIncoming, label: "Answers inbound calls 24/7", color: GREEN },
              { icon: PhoneOutgoing, label: "Makes outbound calls at scale", color: BLUE_LIGHT },
              { icon: Mic, label: "Sounds like a real person", color: "#c084fc" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30`, color }}>
                <Icon className="w-3.5 h-3.5" />{label}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button size="lg" className="text-base px-8 h-12" onClick={handleGetStarted}
              style={{ backgroundColor: BLUE, borderColor: BLUE }}>
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <a href="#inbound">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 text-white w-full sm:w-auto"
                style={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "transparent" }}>
                See How It Works
              </Button>
            </a>
          </div>

          <p className="text-sm mb-12" style={{ color: "rgba(255,255,255,0.4)" }}>
            No credit card required · Setup in minutes · Works for any industry
          </p>

          <div className="relative mx-auto max-w-5xl">
            <img src="/hero_image.png" alt="ApexAI Dashboard"
              className="w-full rounded-t-2xl object-cover"
              style={{ maxHeight: 520, objectPosition: "top" }} />
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${D}, transparent)` }} />
          </div>
        </div>
      </section>

      <LiveTicker />

      {/* ── METRICS ── */}
      <section id="results" className="py-16 px-6"
        style={{ backgroundColor: D2, borderTop: `1px solid ${DIM3}`, borderBottom: `1px solid ${DIM3}` }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs mb-10 uppercase tracking-widest font-medium"
            style={{ color: "rgba(255,255,255,0.35)" }}>Real Results From Real Customers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Avg Response Rate", value: "47%", color: BLUE_LIGHT, desc: "vs 5% industry avg" },
              { label: "Avg Schedule Rate", value: "68%", color: GREEN, desc: "of all responses" },
              { label: "Avg Show Rate", value: "82%", color: "#fb923c", desc: "appointment attendance" },
              { label: "Avg Sales Increase", value: "312%", color: "#c084fc", desc: "within 90 days" },
            ].map((m) => (
              <div key={m.label} className="text-center p-6 rounded-xl"
                style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                <div className="text-4xl font-black mb-2" style={{ color: m.color }}>{m.value}</div>
                <div className="text-sm font-semibold text-white mb-1">{m.label}</div>
                <div className="text-xs" style={{ color: DIM2 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INBOUND AI ASSISTANT ── */}
      <section id="inbound" className="py-20 px-6" style={{ backgroundColor: D }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4" style={{ backgroundColor: `${GREEN}20`, color: GREEN, border: `1px solid ${GREEN}40` }}>
              <PhoneIncoming className="w-3 h-3 mr-1.5" /> 24/7 Inbound AI Assistant
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Never Miss Another Inbound Call
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: DIM }}>
              Your AI assistant answers every call, qualifies leads, books appointments — at 2am on a Sunday or 9am Monday. No voicemail. No missed opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-12">
            <div className="space-y-4">
              {[
                { icon: PhoneIncoming, title: "Answers Every Call Instantly", desc: "No hold time. No voicemail. The AI picks up in under 1 second, 24 hours a day, 365 days a year." },
                { icon: Mic, title: "Sounds Like a Real Person", desc: "Natural conversation, not a robot menu. Callers can't tell it's AI — until the appointment is booked." },
                { icon: Star, title: "Qualifies & Books On the Spot", desc: "Asks the right questions, understands intent, and books appointments directly into your calendar." },
                { icon: BarChart3, title: "Every Call Logged & Transcribed", desc: "Full transcripts, call recordings, sentiment analysis — all in your dashboard." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-4 rounded-xl"
                  style={{ backgroundColor: D2, border: `1px solid ${DIM3}` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${GREEN}20` }}>
                    <Icon className="w-4 h-4" style={{ color: GREEN }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: DIM2 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 rounded-2xl" style={{ backgroundColor: D2, border: `1px solid rgba(52,211,153,0.2)` }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
                <span className="text-sm font-semibold" style={{ color: GREEN }}>AI LIVE — 24/7</span>
                <span className="text-xs ml-auto" style={{ color: DIM2 }}>Your dedicated number</span>
              </div>
              {/* Simulated conversation */}
              <div className="space-y-3">
                {[
                  { role: "caller", text: "Hi, I'm calling about solar panels for my home." },
                  { role: "ai", text: "Great! I'd love to help. Are you a homeowner, and roughly what's your monthly electric bill?" },
                  { role: "caller", text: "Yes I own it. About $280 a month." },
                  { role: "ai", text: "Perfect — you qualify. I have Thursday at 2pm or Friday at 10am. Which works better for a free consultation?" },
                  { role: "caller", text: "Thursday works!" },
                  { role: "ai", text: "Done! Thursday 2pm is confirmed. You'll get a reminder text. Anything else?" },
                ].map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
                    <div className="max-w-xs px-3 py-2 rounded-xl text-xs"
                      style={{
                        backgroundColor: msg.role === "ai" ? `${BLUE}25` : D3,
                        border: `1px solid ${msg.role === "ai" ? `${BLUE}40` : DIM3}`,
                        color: msg.role === "ai" ? BLUE_LIGHT : "rgba(255,255,255,0.8)",
                      }}>
                      {msg.role === "ai" && <span className="text-xs font-bold block mb-0.5" style={{ color: BLUE_LIGHT }}>AI</span>}
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-4 p-3 rounded-lg" style={{ backgroundColor: `${GREEN}15`, border: `1px solid ${GREEN}30` }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: GREEN }} />
                  <span className="text-xs font-medium" style={{ color: GREEN }}>Appointment booked automatically in your calendar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUTBOUND ── */}
      <section id="features" className="py-20 px-6" style={{ backgroundColor: D2 }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4" style={{ backgroundColor: `${BLUE}20`, color: BLUE_LIGHT, border: `1px solid ${BLUE}40` }}>
              <PhoneOutgoing className="w-3 h-3 mr-1.5" /> Outbound Campaign Engine
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Scale Outreach Without Scaling Headcount
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: DIM }}>
              AI-powered outbound calls, SMS, and email that books appointments on autopilot — for any industry, any volume.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16 p-8 rounded-2xl"
            style={{ backgroundColor: D3, border: `1px solid rgba(29,111,244,0.2)` }}>
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">AI Voice Calls That Sound Human</h3>
              <p className="leading-relaxed mb-6" style={{ color: DIM }}>
                Our AI makes outbound calls that leads can't distinguish from a real salesperson. It qualifies, handles objections, and books appointments — without anyone dialing.
              </p>
              <ul className="space-y-2">
                {["Natural conversation, handles objections", "Books appointments automatically", "Works across Solar, HVAC, Roofing, Insurance + more", "Simultaneous calls at any volume"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: GREEN }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DIM3}` }}>
              <img src="/voice_ai.png" alt="AI Voice Call" className="w-full h-auto object-cover" style={{ objectPosition: "top" }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: MessageSquare, title: "SMS Campaigns", desc: "Personalized SMS with intelligent follow-up sequences. Replies handled by AI." },
              { icon: Mail, title: "Email Automation", desc: "Multi-step sequences with dynamic personalization. Opens, clicks, replies — all tracked." },
              { icon: Share2, title: "Lead Intelligence", desc: "AI scores every lead 0–100. Focus only on real buyers ready to move." },
              { icon: BarChart3, title: "Real-Time Analytics", desc: "Response rate, show rate, revenue — live dashboards updated every call." },
              { icon: Clock, title: "24/7 Outreach", desc: "Leads contacted the instant they come in, any hour. Never a cold lead again." },
              { icon: Shield, title: "Any Industry", desc: "Solar, HVAC, roofing, insurance, real estate, B2B — same platform, any vertical." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-xl" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                <Icon className="w-5 h-5 mb-3" style={{ color: BLUE }} />
                <p className="font-semibold text-white mb-2 text-sm">{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: DIM2 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-6" style={{ backgroundColor: D }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Two Products, One Platform</h2>
            <p className="text-lg" style={{ color: DIM }}>Start with what you need. Add more as you grow.</p>
          </div>

          {/* Inbound AI */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${GREEN}20` }}>
                <PhoneIncoming className="w-4 h-4" style={{ color: GREEN }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">24/7 Inbound AI Assistant</h3>
                <p className="text-xs" style={{ color: DIM2 }}>Your AI phone number included. Answers every call, books appointments.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Starter", price: 149, minutes: 500, numbers: 1, desc: "Perfect for small businesses" },
                { name: "Growth", price: 299, minutes: 1500, numbers: 1, desc: "Scale your AI assistant", popular: true },
                { name: "Pro", price: 599, minutes: 4000, numbers: 3, desc: "High-volume operations" },
                { name: "Enterprise", price: null, minutes: "Custom", numbers: "Custom", desc: "Custom for your business" },
              ].map((tier) => (
                <div key={tier.name} className="relative p-5 rounded-xl"
                  style={{
                    backgroundColor: tier.popular ? "rgba(29,111,244,0.08)" : D2,
                    border: tier.popular ? `2px solid ${BLUE}` : `1px solid ${DIM3}`,
                  }}>
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs" style={{ backgroundColor: BLUE }}>
                      Popular
                    </Badge>
                  )}
                  <p className="text-xs font-medium mb-1" style={{ color: DIM2 }}>{tier.name}</p>
                  <div className="mb-3">
                    {tier.price ? (
                      <><span className="text-2xl font-black text-white">${tier.price}</span><span className="text-xs" style={{ color: DIM2 }}>/mo</span></>
                    ) : (
                      <span className="text-2xl font-black text-white">Custom</span>
                    )}
                  </div>
                  <p className="text-xs mb-3" style={{ color: DIM2 }}>{typeof tier.minutes === "number" ? `${tier.minutes.toLocaleString()} min/mo` : tier.minutes} · {tier.numbers} number{typeof tier.numbers === "number" && tier.numbers > 1 ? "s" : ""}</p>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{tier.desc}</p>
                  <Button size="sm" className="w-full text-xs" onClick={handleGetStarted}
                    style={tier.popular ? { backgroundColor: BLUE } : { backgroundColor: "transparent", border: `1px solid ${DIM3}`, color: "white" }}
                    variant={tier.popular ? "default" : "outline"}>
                    {tier.price ? "Get Started" : "Contact Sales"}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: DIM2 }}>
              + $49/mo per additional industry pack (HVAC, Roofing, Insurance, Real Estate, etc.)
            </p>
          </div>

          {/* Outbound */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BLUE}20` }}>
                <PhoneOutgoing className="w-4 h-4" style={{ color: BLUE_LIGHT }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Outbound Campaign Engine</h3>
                <p className="text-xs" style={{ color: DIM2 }}>AI calls, SMS, and email. Pay by lead volume.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Starter", leads: 50, price: 249, desc: "Test the waters" },
                { name: "Growth", leads: 100, price: 498, desc: "Scale your reach", popular: true },
                { name: "Pro", leads: 250, price: 1245, desc: "High-volume outreach" },
                { name: "Enterprise", leads: 500, price: 2490, desc: "Full-scale operations" },
              ].map((tier) => (
                <div key={tier.name} className="relative p-5 rounded-xl"
                  style={{
                    backgroundColor: (tier as any).popular ? "rgba(29,111,244,0.08)" : D2,
                    border: (tier as any).popular ? `2px solid ${BLUE}` : `1px solid ${DIM3}`,
                  }}>
                  {(tier as any).popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs" style={{ backgroundColor: BLUE }}>
                      Popular
                    </Badge>
                  )}
                  <p className="text-xs font-medium mb-1" style={{ color: DIM2 }}>{tier.name}</p>
                  <div className="mb-1">
                    <span className="text-2xl font-black text-white">${tier.price.toLocaleString()}</span>
                    <span className="text-xs" style={{ color: DIM2 }}>/mo</span>
                  </div>
                  <p className="text-xs mb-4" style={{ color: DIM2 }}>{tier.leads} leads · {tier.desc}</p>
                  <Button size="sm" className="w-full text-xs" onClick={handleGetStarted}
                    style={(tier as any).popular ? { backgroundColor: BLUE } : { backgroundColor: "transparent", border: `1px solid ${DIM3}`, color: "white" }}
                    variant={(tier as any).popular ? "default" : "outline"}>
                    Get Started
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* What's included */}
          <div className="p-8 rounded-2xl" style={{ backgroundColor: D2, border: `1px solid ${DIM3}` }}>
            <h3 className="font-bold text-white mb-6">Everything Included in Every Plan</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                "AI voice calls (human-sounding)",
                "SMS outreach & follow-up",
                "Email automation",
                "Lead qualification & scoring",
                "Real-time analytics dashboard",
                "Call recordings & transcripts",
                "Your dedicated phone number",
                "Expert setup & 30-day support",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ── */}
      <ROICalculator />

      {/* ── CASE STUDIES ── */}
      <section id="case-studies" className="py-20 px-6" style={{ backgroundColor: D }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Real Results, Real Industries</h2>
            <p className="text-lg" style={{ color: DIM }}>Every result follows the same pattern: specific numbers, before and after.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DIM3}`, backgroundColor: D2 }}>
              <img src="/industry_solar.png" alt="Solar Industry"
                className="w-full object-cover" style={{ height: 240, objectPosition: "top center" }} />
              <div className="p-6">
                <Badge className="mb-3" style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>Solar</Badge>
                <h3 className="text-xl font-bold text-white mb-2">Calendar Fully Booked in 30 Days</h3>
                <p className="text-sm mb-4" style={{ color: DIM2 }}>
                  "312 qualified leads in 30 days, $890K pipeline. Before: 3 SDRs, 40 calls/day. After: AI handles 500+ touchpoints daily."
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Sarah K.</span>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ade80" }}>+312% Pipeline</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DIM3}`, backgroundColor: D2 }}>
              <img src="/industry_roofing.png" alt="Roofing Industry"
                className="w-full object-cover" style={{ height: 240, objectPosition: "top center" }} />
              <div className="p-6">
                <Badge className="mb-3" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>Roofing</Badge>
                <h3 className="text-xl font-bold text-white mb-2">$2M Closed in Two Weeks</h3>
                <p className="text-sm mb-4" style={{ color: DIM2 }}>
                  "200+ appointments, 160 contracts, $2M in two weeks. Before: manual cold calling, 5% response rate. After: 47% response rate."
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Moises R.</span>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ade80" }}>$2M in 2 Weeks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials — all dark background, white text */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayTestimonials.map((t: any, i: number) => (
              <div key={i} className="p-6 rounded-xl" style={{ backgroundColor: D2, border: `1px solid ${DIM3}` }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="font-semibold mb-4 leading-relaxed text-sm" style={{ color: BLUE_LIGHT }}>
                  {t.resultValue ?? t.result}
                </p>
                <div className="space-y-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
                  <p className="text-xs"><span className="text-red-400 font-semibold">Before: </span><span style={{ color: DIM2 }}>{t.beforeMetric ?? t.before}</span></p>
                  <p className="text-xs"><span className="text-green-400 font-semibold">After: </span><span style={{ color: DIM2 }}>{t.afterMetric ?? t.after}</span></p>
                </div>
                <div className="pt-4" style={{ borderTop: `1px solid ${DIM3}` }}>
                  <p className="text-sm font-semibold text-white">{t.clientName ?? t.name}</p>
                  <p className="text-xs" style={{ color: DIM2 }}>{t.industry} Industry</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6" style={{ backgroundColor: D2 }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Done-For-You Setup. Zero Complexity.</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: DIM }}>
              A dedicated specialist configures everything on day one. You focus on closing — we handle the rest.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                { day: "Day 1", title: "Expert Setup", desc: "We configure campaigns, templates, targeting, and AI scripts. Zero work on your end." },
                { day: "Days 2–14", title: "Optimization", desc: "We analyze data, refine messaging, optimize conversions. You focus on closing." },
                { day: "Days 15–30", title: "Scale & Handoff", desc: "System running at peak. We hand you a proven, fully built machine. You just scale." },
              ].map((step, i) => (
                <div key={step.day} className="flex gap-6 items-start p-6 rounded-xl"
                  style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-sm"
                    style={{ backgroundColor: BLUE }}>{i + 1}</div>
                  <div>
                    <Badge className="mb-2 text-xs" style={{ backgroundColor: "rgba(29,111,244,0.12)", color: BLUE_LIGHT, border: `1px solid rgba(29,111,244,0.25)` }}>{step.day}</Badge>
                    <h3 className="font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: DIM2 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DIM3}` }}>
              <img src="/team_collab.png" alt="ApexAI Team"
                className="w-full object-cover" style={{ objectPosition: "top center", maxHeight: 420 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMUNITY WINS ── */}
      <CommunityWins />

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 px-6" style={{ backgroundColor: D2 }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Who We Are</h2>
              <p className="leading-relaxed mb-4" style={{ color: DIM }}>
                ApexAI was founded by sales professionals and AI engineers who spent years in the trenches — cold calling, managing SDR teams, grinding through objections, and watching leads go cold. We built the tool we wished existed.
              </p>
              <p className="leading-relaxed mb-4" style={{ color: DIM }}>
                Our platform handles both sides of the phone: inbound AI that answers every call 24/7, and outbound campaigns that reach leads at scale. We serve solar, roofing, HVAC, insurance, real estate, and any other industry that lives on phone calls.
              </p>
              <p className="leading-relaxed mb-6" style={{ color: DIM }}>
                We're backed by a team with 50+ AI products shipped. ApexAI is built on Starlight Global's infrastructure — enterprise-grade, SOC 2 ready, and built to scale globally. This is not a side project. We're investing $5M+ to make ApexAI the default platform for AI-powered sales globally.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                {[["SOC 2 Type II", GREEN], ["HIPAA Ready", "#fb923c"], ["GDPR Compliant", BLUE_LIGHT], ["TCPA Compliant", "#c084fc"]].map(([label, color]) => (
                  <span key={label} className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}35`, color }}>
                    <Shield className="w-3 h-3" /> {label}
                  </span>
                ))}
              </div>
              <a href="/about#compliance" className="text-sm font-medium hover:underline" style={{ color: BLUE_LIGHT }}>
                View full compliance documentation →
              </a>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DIM3}` }}>
              <img src="/team_success.png" alt="ApexAI Team"
                className="w-full object-cover" style={{ objectPosition: "top center", maxHeight: 420 }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ["Any Industry", "Solar, roofing, HVAC, insurance, real estate, B2B SaaS and more. One platform."],
              ["Any Scale", "From 50 leads/mo to 50,000. Same platform, no migration, no limits."],
              ["Always On", "Inbound AI answers calls 24/7. Outbound runs while you sleep. Zero missed leads."],
            ].map(([title, desc]) => (
              <div key={title as string} className="p-6 rounded-xl text-center"
                style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                <p className="font-bold text-white mb-2">{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: DIM2 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-20 px-6" style={{ backgroundColor: D }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Questions? We're Here.</h2>
          <p className="text-lg mb-12" style={{ color: DIM }}>
            Our team is available for calls, demos, and detailed consultations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Headphones, title: "Phone Support", sub: "Available 9am–6pm EST", val: "Coming Soon" },
              { icon: Mail, title: "Email Support", sub: "Response within 24 hours", val: "support@apexai.io", href: "mailto:support@apexai.io" },
              { icon: Bot, title: "Live Chat", sub: "On this website", val: "Chat with AI now" },
            ].map(({ icon: Icon, title, sub, val, href }) => (
              <div key={title} className="p-6 rounded-xl text-center"
                style={{ backgroundColor: D2, border: `1px solid ${DIM3}` }}>
                <Icon className="w-8 h-8 mx-auto mb-4" style={{ color: BLUE }} />
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm mb-3" style={{ color: DIM2 }}>{sub}</p>
                {href ? (
                  <a href={href} className="text-sm font-mono hover:underline" style={{ color: BLUE_LIGHT }}>{val}</a>
                ) : (
                  <p className="text-sm" style={{ color: BLUE_LIGHT }}>{val}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-6" style={{ backgroundColor: D2 }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(29,111,244,0.15), rgba(96,165,250,0.05))`, border: `1px solid rgba(29,111,244,0.25)` }}>
            <h2 className="text-4xl font-black text-white mb-4">Ready to Never Miss a Lead Again?</h2>
            <p className="text-lg mb-8" style={{ color: DIM }}>
              Start with a free trial. Your AI answers the first call in minutes.
            </p>
            <Button size="lg" className="text-base px-10 h-12" onClick={handleGetStarted}
              style={{ backgroundColor: BLUE, borderColor: BLUE }}>
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-xs mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
              No credit card required · Setup in minutes · Works 24/7 from day one
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6" style={{ borderTop: `1px solid ${DIM3}`, backgroundColor: "#0c0e14" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4 select-none">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill={BLUE}/>
                  <path d="M16 6L26 24H6L16 6Z" fill="white" opacity="0.95"/>
                  <path d="M16 12L21 22H11L16 12Z" fill={BLUE}/>
                </svg>
                <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                  <span style={{ color: "#ffffff" }}>Apex</span><span style={{ color: BLUE_LIGHT }}>AI</span>
                </span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                AI-powered inbound + outbound sales for every industry.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Product</h4>
              <ul className="space-y-2 text-xs" style={{ color: DIM2 }}>
                <li><a href="#features" className="hover:text-white transition-colors">Outbound Campaigns</a></li>
                <li><a href="#inbound" className="hover:text-white transition-colors">Inbound AI Assistant</a></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><a href="#case-studies" className="hover:text-white transition-colors">Case Studies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Company</h4>
              <ul className="space-y-2 text-xs" style={{ color: DIM2 }}>
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><Link href="/about" className="hover:text-white transition-colors">Our Story</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Legal & Security</h4>
              <ul className="space-y-2 text-xs" style={{ color: DIM2 }}>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: `1px solid ${DIM3}` }}>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                ["SOC 2 Type II", GREEN],
                ["HIPAA Ready", "#fb923c"],
                ["GDPR", BLUE_LIGHT],
                ["TCPA", "#c084fc"],
              ].map(([label, color]) => (
                <span key={label} className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30`, color }}>
                  ✓ {label}
                </span>
              ))}
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>© 2026 ApexAI · Built by Starlight Global</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
