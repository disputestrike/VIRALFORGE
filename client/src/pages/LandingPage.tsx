import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight, Phone, Zap, BarChart3, Shield,
  PhoneIncoming, PhoneOutgoing, Menu, X, CheckCircle2,
  Calendar, MessageSquare, Users,
} from "lucide-react";
import { useState } from "react";
import DemoCallWidget from "@/components/DemoCallWidget";
import ROICalculator from "@/components/ROICalculator";
import IndustryDemos from "@/components/IndustryDemos";

const BG = "#0a0c12";
const BG2 = "#0f1117";
const BLUE = "#1d6ff4";
const BLUE2 = "#3b82f6";
const GREEN = "#22c55e";
const WHITE = "#ffffff";
const GRAY = "#f8f9fb";
const DIM = "rgba(255,255,255,0.6)";
const DIM2 = "rgba(255,255,255,0.35)";
const BORDER = "rgba(255,255,255,0.07)";
const BORDER_LIGHT = "rgba(0,0,0,0.07)";

export default function LandingPageFull() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Inbound AI", href: "#inbound" },
    { label: "Outbound AI", href: "#outbound" },
    { label: "Live Demo", href: "#demo" },
    { label: "Pricing", href: "/pricing" },
    { label: "Case Studies", href: "#results" },
    { label: "About", href: "/about" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
      `}</style>

      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "rgba(10,12,18,0.96)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 14H2.5L9 2Z" fill="white"/></svg>
            </div>
            <span style={{ color: WHITE, fontWeight: 700, fontSize: 18 }}>Apex<span style={{ color: BLUE2 }}>AI</span></span>
          </Link>

          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href}
                style={{ color: DIM, fontSize: 14, fontWeight: 500, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = WHITE)}
                onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
                {l.label}
              </a>
            ))}
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" style={{ backgroundColor: BLUE, color: WHITE, border: "none", borderRadius: 8 }}>Dashboard</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()} style={{ textDecoration: "none" }}>
                <Button size="sm" style={{ backgroundColor: BLUE, color: WHITE, border: "none", borderRadius: 8 }}>Sign In</Button>
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* HERO — black, premium */}
      <section style={{ backgroundColor: BG, padding: "100px 24px 88px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: `radial-gradient(ellipse, ${BLUE}14 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: `${BLUE}20`, border: `1px solid ${BLUE}40`, borderRadius: 100, padding: "6px 16px", marginBottom: 36 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, animation: "pulse 2s infinite" }} />
            <span style={{ color: BLUE2, fontSize: 13, fontWeight: 600 }}>Live — answering calls right now</span>
          </div>

          <h1 style={{ color: WHITE, fontSize: "clamp(38px, 6vw, 66px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.03em" }}>
            Your AI Revenue Engine.<br />
            <span style={{ color: BLUE2 }}>Inbound + Outbound.</span><br />
            Always Closing.
          </h1>

          <p style={{ color: DIM, fontSize: "clamp(17px, 2.5vw, 20px)", lineHeight: 1.65, marginBottom: 44, maxWidth: 580, margin: "0 auto 44px" }}>
            Answer every call. Qualify leads. Book appointments. Run outbound campaigns.
            Convert leads automatically — 24 hours a day.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#demo" style={{ textDecoration: "none" }}>
              <Button style={{ backgroundColor: BLUE, color: WHITE, border: "none", padding: "14px 28px", fontSize: 16, fontWeight: 600, borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={18} /> Get Your First AI Call
              </Button>
            </a>
            {!user && (
              <a href={getLoginUrl()} style={{ textDecoration: "none" }}>
                <Button variant="outline" style={{ color: WHITE, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "transparent", padding: "14px 28px", fontSize: 16, borderRadius: 10 }}>
                  Watch It Work Live <ArrowRight size={16} style={{ marginLeft: 6 }} />
                </Button>
              </a>
            )}
          </div>

          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", marginTop: 60, paddingTop: 60, borderTop: `1px solid ${BORDER}` }}>
            {[
              { value: "< 500ms", label: "Response time" },
              { value: "Zero", label: "Filler words" },
              { value: "24/7", label: "Always available" },
              { value: "Clean", label: "Call termination" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ color: WHITE, fontWeight: 700, fontSize: 22 }}>{value}</div>
                <div style={{ color: DIM2, fontSize: 13, marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM — white section */}
      <section style={{ backgroundColor: GRAY, padding: "72px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: BG, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
            You are leaving revenue on the table. Every day.
          </h2>
          <p style={{ color: "rgba(15,17,23,0.55)", fontSize: 17, marginBottom: 52, maxWidth: 500, margin: "0 auto 52px" }}>
            Every missed call is a missed sale. Leads go cold in minutes.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {[
              { icon: "📵", stat: "62%", label: "of calls go to voicemail and never convert" },
              { icon: "⏱️", stat: "5 min", label: "average time before a lead goes cold" },
              { icon: "📉", stat: "87%", label: "of leads expect a response within the hour" },
            ].map(({ icon, stat, label }) => (
              <div key={stat} style={{ backgroundColor: WHITE, borderRadius: 16, padding: "28px 24px", border: `1px solid ${BORDER_LIGHT}` }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
                <div style={{ color: BG, fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{stat}</div>
                <div style={{ color: "rgba(15,17,23,0.55)", fontSize: 14, lineHeight: 1.5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DEMO — most important, white */}
      <section id="demo" style={{ backgroundColor: WHITE, padding: "80px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: BLUE, fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Live Demo</div>
          <h2 style={{ color: BG, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
            Hear it for yourself. Right now.
          </h2>
          <p style={{ color: "rgba(15,17,23,0.55)", fontSize: 17, marginBottom: 44, maxWidth: 460, margin: "0 auto 44px" }}>
            Enter your number and get called instantly by ApexAI. No signup required.
          </p>
          <DemoCallWidget />
        </div>
      </section>

      {/* SYSTEM ARCHITECTURE — dark */}
      <section style={{ backgroundColor: BG, padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ color: BLUE2, fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Why We Win</div>
            <h2 style={{ color: WHITE, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
              A conversation engine, not a chatbot.
            </h2>
            <p style={{ color: DIM, fontSize: 17, maxWidth: 500, margin: "0 auto" }}>
              Other tools generate responses. ApexAI controls conversations — knowing exactly when to answer, qualify, book, and close.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 40 }}>
            {[
              { color: GREEN, label: "Speed Layer — 80% of turns", title: "Deepgram + Cerebras", points: ["Streaming STT: ~100ms", "Fast inference: ~30ms", "No dead air ever", "Greetings, FAQs, qualify, confirm"] },
              { color: BLUE2, label: "Quality Layer — 20% of turns", title: "Claude Escalation", points: ["Objection handling", "Complex questions", "Emotional turns", "High-stakes responses"] },
              { color: "#f59e0b", label: "Action Layer — Every call", title: "Real-World Actions", points: ["Book appointments → DB", "Save leads → CRM", "SMS follow-up", "Live human transfer"] },
            ].map(({ color, label, title, points }) => (
              <div key={title} style={{ backgroundColor: BG2, borderRadius: 16, padding: "28px 24px", border: `1px solid ${BORDER}` }}>
                <div style={{ color, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{label}</div>
                <div style={{ color: WHITE, fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{title}</div>
                {points.map(p => (
                  <div key={p} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                    <CheckCircle2 size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: DIM, fontSize: 14 }}>{p}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { value: "< 500ms", label: "Perceived latency" },
              { value: "ZERO", label: "Filler words (banned)" },
              { value: "Clean", label: "Call close on decline" },
              { value: "0.94x", label: "Speech rate — natural" },
            ].map(({ value, label }) => (
              <div key={label} style={{ backgroundColor: `${BLUE}10`, border: `1px solid ${BLUE}28`, borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
                <div style={{ color: WHITE, fontWeight: 800, fontSize: 22, marginBottom: 6 }}>{value}</div>
                <div style={{ color: DIM2, fontSize: 13, lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INBOUND — white */}
      <section id="inbound" style={{ backgroundColor: GRAY, padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35`, borderRadius: 100, padding: "6px 14px", marginBottom: 24 }}>
                <PhoneIncoming size={14} style={{ color: GREEN }} />
                <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>Inbound AI</span>
              </div>
              <h2 style={{ color: BG, fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
                Every call answered.<br />Every lead captured.
              </h2>
              <p style={{ color: "rgba(15,17,23,0.55)", fontSize: 17, lineHeight: 1.7, marginBottom: 28 }}>
                ApexAI picks up in under a second. Qualifies the caller. Answers their questions. Books appointments — without a human ever picking up the phone.
              </p>
              {["Instant pickup — never miss a call", "Qualifies leads in real time", "Books directly to your calendar", "SMS confirmation sent automatically", "Full call transcript + recording"].map(item => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <CheckCircle2 size={16} style={{ color: GREEN, flexShrink: 0 }} />
                  <span style={{ color: "rgba(15,17,23,0.7)", fontSize: 15 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: BG, borderRadius: 20, padding: "32px", border: `1px solid ${BORDER}` }}>
              <div style={{ color: DIM2, fontSize: 11, marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.1em" }}>Live call example</div>
              {[
                { role: "Caller", text: "Hi, do you handle solar companies?" },
                { role: "ApexAI", text: "Absolutely. We handle inbound calls, qualify homeowners, and book installs to your calendar. Are you getting a lot of inbound leads right now?" },
                { role: "Caller", text: "Yes, we get about 50 calls a day but miss half of them." },
                { role: "ApexAI", text: "Got it — that is a lot of missed revenue. I can show you exactly how ApexAI would handle those calls. Want me to set up a quick demo?" },
              ].map(({ role, text }, i) => (
                <div key={i} style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: role === "ApexAI" ? BLUE : "rgba(255,255,255,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: WHITE }}>
                    {role === "ApexAI" ? "A" : "C"}
                  </div>
                  <div style={{ backgroundColor: role === "ApexAI" ? `${BLUE}18` : "rgba(255,255,255,0.04)", padding: "10px 14px", borderRadius: 10, flex: 1 }}>
                    <div style={{ color: role === "ApexAI" ? BLUE2 : DIM2, fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{role}</div>
                    <div style={{ color: role === "ApexAI" ? WHITE : DIM, fontSize: 14, lineHeight: 1.5 }}>{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OUTBOUND — dark */}
      <section id="outbound" style={{ backgroundColor: BG, padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
            <div style={{ backgroundColor: BG2, borderRadius: 20, padding: "32px", border: `1px solid ${BORDER}` }}>
              <div style={{ color: DIM2, fontSize: 11, marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.1em" }}>Campaign dashboard</div>
              {[
                { label: "Campaign", value: "Solar Q1 — Texas", color: BLUE2 },
                { label: "Contacts loaded", value: "2,847", color: WHITE },
                { label: "Calls made today", value: "412", color: GREEN },
                { label: "Appointments booked", value: "38", color: "#f59e0b" },
                { label: "Conversion rate", value: "9.2%", color: GREEN },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ color: DIM2, fontSize: 14 }}>{label}</span>
                  <span style={{ color, fontSize: 14, fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: `${BLUE}18`, border: `1px solid ${BLUE}35`, borderRadius: 100, padding: "6px 14px", marginBottom: 24 }}>
                <PhoneOutgoing size={14} style={{ color: BLUE2 }} />
                <span style={{ color: BLUE2, fontSize: 13, fontWeight: 600 }}>Outbound AI</span>
              </div>
              <h2 style={{ color: WHITE, fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
                Run outbound at scale.<br />Automatically.
              </h2>
              <p style={{ color: DIM, fontSize: 17, lineHeight: 1.7, marginBottom: 28 }}>
                Upload your lead list and ApexAI calls them all. Qualifies, handles objections, books the ready ones — then follows up on everyone else via SMS.
              </p>
              {["Upload contacts — start calling in minutes", "AI handles objections naturally", "Books qualified leads automatically", "SMS + email follow-up for warm leads", "Full analytics per campaign"].map(item => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <CheckCircle2 size={16} style={{ color: BLUE2, flexShrink: 0 }} />
                  <span style={{ color: DIM, fontSize: 15 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRY DEMOS — white */}
      <section id="demos" style={{ backgroundColor: GRAY, padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: BLUE, fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Industry Packs</div>
          <h2 style={{ color: BG, fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
            Pre-built for your industry.
          </h2>
          <p style={{ color: "rgba(15,17,23,0.55)", fontSize: 17, marginBottom: 48, maxWidth: 460, margin: "0 auto 48px" }}>
            ApexAI comes with industry-specific scripts, objection handling, and qualification flows.
          </p>
          <IndustryDemos />
        </div>
      </section>

      {/* ROI — dark */}
      <section style={{ backgroundColor: BG2, padding: "80px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: BLUE2, fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>ROI Calculator</div>
          <h2 style={{ color: WHITE, fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
            See your real numbers.
          </h2>
          <p style={{ color: DIM, fontSize: 17, marginBottom: 40 }}>Enter your business details and see exactly what ApexAI is worth to you.</p>
          <ROICalculator />
        </div>
      </section>

      {/* TRUST — white */}
      <section style={{ backgroundColor: GRAY, padding: "72px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ color: BG, fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
              Enterprise-grade reliability.
            </h2>
            <p style={{ color: "rgba(15,17,23,0.55)", fontSize: 16 }}>Built for businesses that cannot afford downtime or missed opportunities.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {[
              { icon: "🔒", title: "SOC 2 Ready", desc: "Security controls aligned with enterprise standards. Your data is protected." },
              { icon: "📋", title: "TCPA Compliant", desc: "Built-in compliance controls for outbound calling. Stay legal at scale." },
              { icon: "⚡", title: "99.9% Uptime", desc: "Railway infrastructure with automatic failover. Never down during business hours." },
              { icon: "🤝", title: "Human Handoff", desc: "Instant live transfer when callers need a real person. Seamless experience." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ backgroundColor: WHITE, borderRadius: 16, padding: "24px", border: `1px solid ${BORDER_LIGHT}` }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
                <div style={{ color: BG, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>
                <div style={{ color: "rgba(15,17,23,0.55)", fontSize: 14, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — dark */}
      <section style={{ backgroundColor: BG, padding: "96px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: WHITE, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, marginBottom: 20, letterSpacing: "-0.03em" }}>
            Stop missing calls.<br />Start closing more.
          </h2>
          <p style={{ color: DIM, fontSize: 18, marginBottom: 40 }}>
            Your competitors are already using AI. The question is whether yours is better than theirs.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#demo" style={{ textDecoration: "none" }}>
              <Button style={{ backgroundColor: BLUE, color: WHITE, border: "none", padding: "16px 32px", fontSize: 16, fontWeight: 600, borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={18} /> Get Your First AI Call
              </Button>
            </a>
            {!user && (
              <a href={getLoginUrl()} style={{ textDecoration: "none" }}>
                <Button variant="outline" style={{ color: WHITE, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "transparent", padding: "16px 32px", fontSize: 16, borderRadius: 10 }}>
                  Sign Up Free <ArrowRight size={16} style={{ marginLeft: 8 }} />
                </Button>
              </a>
            )}
          </div>
          <p style={{ color: DIM2, fontSize: 13, marginTop: 20 }}>No credit card required. Live in under 5 minutes.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: BG2, borderTop: `1px solid ${BORDER}`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 14H2.5L9 2Z" fill="white"/></svg>
            </div>
            <span style={{ color: WHITE, fontWeight: 700 }}>Apex<span style={{ color: BLUE2 }}>AI</span></span>
            <span style={{ color: DIM2, fontSize: 13, marginLeft: 8 }}>© 2026 Starlight Global</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Inbound AI", "Outbound AI", "Pricing", "About", "Dashboard"].map(label => (
              <a key={label} href={label === "Dashboard" ? "/dashboard" : "/"} style={{ color: DIM2, fontSize: 14, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = WHITE)}
                onMouseLeave={e => (e.currentTarget.style.color = DIM2)}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
