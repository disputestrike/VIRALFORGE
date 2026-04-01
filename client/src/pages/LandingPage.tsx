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
import { landingColors as C } from "@/components/marketing/landingTheme";
import {
  ArrowRight, Phone, PhoneIncoming, PhoneOutgoing,
  CheckCircle2, Zap, BarChart3,
  Calendar, MessageSquare, Shield, Star,
} from "lucide-react";

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
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 28, border: `1px solid ${C.borderW}` }}>
          <div style={{ color: C.dim2, fontSize: 11, marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.1em" }}>Live call example</div>
          {[
            { r: "Caller", t: "Do you handle solar companies?" },
            { r: "ApexAI", t: "Absolutely. We handle inbound calls, qualify homeowners, and book installs directly to your calendar. Are you getting a lot of inbound leads right now?" },
            { r: "Caller", t: "Yes, about 50 a day but we miss half of them." },
            { r: "ApexAI", t: "Got it — that is a lot of missed revenue. I can show you exactly how ApexAI handles those calls. Want me to set up a quick demo?" },
          ].map(({ r, t }, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: r === "ApexAI" ? "#fff" : "#000",
                  backgroundColor: r === "ApexAI" ? C.blue : "rgba(255,255,255,0.15)",
                }}
              >
                {r === "ApexAI" ? "A" : "C"}
              </div>
              <div style={{ backgroundColor: r === "ApexAI" ? `${C.blue}18` : "rgba(255,255,255,0.04)", padding: "9px 13px", borderRadius: 10, flex: 1 }}>
                <div style={{ color: r === "ApexAI" ? C.blue2 : C.dim2, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{r}</div>
                <div style={{ color: r === "ApexAI" ? C.white : C.dim, fontSize: 13, lineHeight: 1.5 }}>{t}</div>
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
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 28, border: `1px solid ${C.borderW}` }}>
          <div style={{ color: C.dim2, fontSize: 11, marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.1em" }}>Campaign dashboard — live</div>
          {[
            { label: "Campaign", value: "Solar Q1 — Texas", color: C.blue2 },
            { label: "Contacts loaded", value: "2,847", color: C.white },
            { label: "Calls made today", value: "412", color: C.green },
            { label: "Appointments booked", value: "38", color: "#f59e0b" },
            { label: "Conversion rate", value: "9.2%", color: C.green },
            { label: "SMS follow-ups sent", value: "374", color: C.blue3 },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.borderW}` }}>
              <span style={{ color: C.dim2, fontSize: 13 }}>{label}</span>
              <span style={{ color, fontSize: 14, fontWeight: 700 }}>{value}</span>
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
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 28, border: `1px solid ${C.borderW}` }}>
          <div style={{ color: C.dim2, fontSize: 11, marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.1em" }}>Booking confirmation</div>
          <div style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>✓ APPOINTMENT CONFIRMED</div>
            <div style={{ color: C.white, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sarah Johnson — Solar Assessment</div>
            <div style={{ color: C.dim, fontSize: 13, marginBottom: 4 }}>Tuesday, April 8 at 2:00 PM</div>
            <div style={{ color: C.dim, fontSize: 13 }}>📱 SMS confirmation sent to (555) 867-5309</div>
          </div>
          <div style={{ color: C.dim2, fontSize: 13, lineHeight: 1.6 }}>Booked automatically during inbound call. No human involved. Calendar updated instantly.</div>
        </div>
      ),
    },
    {
      color: "#a78bfa",
      headline: "Full visibility into every conversation.",
      body: "Every call recorded, transcribed, and scored. Know your conversion rate, top objections, and AI performance — turn by turn.",
      points: ["All calls recorded and transcribed", "Lead scoring per call", "Objection pattern tracking", "Per-campaign conversion analytics", "Export to your CRM"],
      panel: (
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 28, border: `1px solid ${C.borderW}` }}>
          <div style={{ color: C.dim2, fontSize: 11, marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.1em" }}>Analytics — today</div>
          {[
            { label: "Calls handled", value: "847", pct: "+23%" },
            { label: "Leads qualified", value: "203", pct: "+31%" },
            { label: "Appointments booked", value: "67", pct: "+18%" },
            { label: "Avg call duration", value: "3m 24s", pct: "stable" },
            { label: "Conversion rate", value: "7.9%", pct: "+2.1%" },
          ].map(({ label, value, pct }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.borderW}` }}>
              <span style={{ color: C.dim2, fontSize: 13 }}>{label}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: C.white, fontSize: 14, fontWeight: 700 }}>{value}</span>
                <span style={{ color: C.green, fontSize: 11, backgroundColor: "rgba(34,197,94,0.12)", padding: "2px 7px", borderRadius: 4 }}>{pct}</span>
              </span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif", backgroundColor: C.bg, color: C.white, overflowX: "hidden" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        a{text-decoration:none;color:inherit}
        .nav-link{color:rgba(255,255,255,0.6);font-size:14px;font-weight:500;transition:color 0.15s}
        .nav-link:hover{color:#fff}
        .tab-btn{background:none;border:none;cursor:pointer;transition:all 0.2s;white-space:nowrap}
        .hover-card{transition:border-color 0.2s,transform 0.2s}
        .hover-card:hover{border-color:rgba(29,111,244,0.4)!important;transform:translateY(-2px)}
        .cta-btn{transition:opacity 0.15s,transform 0.15s;cursor:pointer}
        .cta-btn:hover{opacity:0.9;transform:translateY(-1px)}
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

      <div style={{ backgroundColor: `${C.blue}18`, borderBottom: `1px solid ${C.border}`, padding: "8px 24px", textAlign: "center" }}>
        <span style={{ color: C.blue3, fontSize: 13, fontWeight: 600 }}>{tickerItems[ticker % tickerItems.length]}</span>
      </div>

      <MarketingNav />

      {/* HERO */}
      <section style={{ backgroundColor: C.bg, padding: "96px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(${C.blue}06 1px,transparent 1px),linear-gradient(90deg,${C.blue}06 1px,transparent 1px)`,
            backgroundSize: "56px 56px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 500,
            background: `radial-gradient(ellipse,${C.blue}1a 0%,transparent 65%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 820, margin: "0 auto", position: "relative", animation: "fadeUp 0.5s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: `${C.blue}18`, border: `1px solid ${C.border}`, borderRadius: 100, padding: "7px 18px", marginBottom: 36 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.green, animation: "pulse 2s infinite" }} />
            <span style={{ color: C.blue3, fontSize: 13, fontWeight: 600 }}>Live — answering calls right now</span>
          </div>
          <h1 style={{ color: C.white, fontSize: "clamp(38px,6.5vw,68px)", fontWeight: 900, lineHeight: 1.08, marginBottom: 24, letterSpacing: "-0.04em" }}>
            Your AI revenue engine.
            <br />
            <span style={{ color: C.blue3 }}>Inbound + outbound.</span>
            <br />
            Always closing.
          </h1>
          <p style={{ color: C.dim, fontSize: "clamp(17px,2.5vw,20px)", lineHeight: 1.65, maxWidth: 600, margin: "0 auto 44px" }}>
            Answers every call. Qualifies leads. Books appointments. Runs outbound campaigns — 24 hours a day, 7 days a week.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#demo">
              <button
                type="button"
                className="cta-btn"
                style={{
                  backgroundColor: C.blue,
                  color: C.white,
                  fontWeight: 800,
                  fontSize: 16,
                  padding: "15px 32px",
                  borderRadius: 10,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Phone size={18} /> Hear it live — call me now
              </button>
            </a>
            <a href={getLoginUrl()}>
              <button
                type="button"
                className="cta-btn"
                style={{
                  backgroundColor: "transparent",
                  color: C.white,
                  fontWeight: 600,
                  fontSize: 16,
                  padding: "15px 28px",
                  borderRadius: 10,
                  border: `1px solid ${C.borderW}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Start free trial <ArrowRight size={16} />
              </button>
            </a>
          </div>

          <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap", marginTop: 64, paddingTop: 64, borderTop: `1px solid ${C.borderW}` }}>
            {[
              { value: "< 1 sec", label: "Pickup time" },
              { value: "24/7", label: "Always available" },
              { value: "Zero", label: "Filler words" },
              { value: "8+", label: "Voice options" },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ color: C.blue3, fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em" }}>{value}</div>
                <div style={{ color: C.dim2, fontSize: 13, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ backgroundColor: C.bg2, padding: "40px 24px", borderTop: `1px solid ${C.borderW}`, borderBottom: `1px solid ${C.borderW}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ color: C.dim2, fontSize: 12, textAlign: "center", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Trusted by fast-growing businesses
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            {logos.map((l) => (
              <div key={l} style={{ color: C.dim, fontSize: 13, fontWeight: 600, padding: "8px 16px", border: `1px solid ${C.borderW}`, borderRadius: 8, backgroundColor: C.bg3 }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section id="platform" style={{ backgroundColor: C.bg, padding: "88px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: C.blue2, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>The platform</div>
            <h2 style={{ color: C.white, fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.03em" }}>One platform. Every revenue channel.</h2>
            <p style={{ color: C.dim, fontSize: 18, maxWidth: 520, margin: "0 auto" }}>Not a chatbot. Not a legacy IVR. A complete AI revenue engine for inbound and outbound.</p>
          </div>

          <div style={{ display: "flex", gap: 4, justifyContent: "center", backgroundColor: C.bg3, borderRadius: 12, padding: 5, marginBottom: 44, width: "fit-content", margin: "0 auto 44px", flexWrap: "wrap" }}>
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                type="button"
                className="tab-btn"
                onClick={() => setActiveTab(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 20px",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  color: activeTab === i ? C.white : C.dim,
                  backgroundColor: activeTab === i ? C.blue : "transparent",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 52, alignItems: "center" }}>
            <div>
              <div style={{ color: tabContent[activeTab]!.color, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{tabs[activeTab]!.label}</div>
              <h3 style={{ color: C.white, fontSize: "clamp(22px,3.5vw,34px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{tabContent[activeTab]!.headline}</h3>
              <p style={{ color: C.dim, fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>{tabContent[activeTab]!.body}</p>
              {tabContent[activeTab]!.points.map((p) => (
                <div key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <CheckCircle2 size={16} style={{ color: tabContent[activeTab]!.color, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ color: C.dim, fontSize: 15 }}>{p}</span>
                </div>
              ))}
            </div>
            {tabContent[activeTab]!.panel}
          </div>
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section id="different" style={{ backgroundColor: C.bg2, padding: "88px 24px", borderTop: `1px solid ${C.borderW}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: C.blue2, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Why ApexAI</div>
            <h2 style={{ color: C.white, fontSize: "clamp(26px,4vw,42px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14 }}>Legacy IVR vs ApexAI</h2>
            <p style={{ color: C.dim, fontSize: 17, maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>Menus and voicemail leak revenue. ApexAI holds a real conversation, qualifies intent, and books — on every ring.</p>
          </div>
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="hover-card" style={{ backgroundColor: C.bg3, borderRadius: 16, padding: 28, border: `1px solid ${C.borderW}` }}>
              <div style={{ color: C.dim2, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>LEGACY PHONE TREE</div>
              <ul style={{ color: C.dim, fontSize: 15, lineHeight: 1.85, paddingLeft: 18 }}>
                <li>Press 1… press 2… callers hang up</li>
                <li>Voicemail when you are busy</li>
                <li>No qualification or follow-up</li>
                <li>Static scripts, no learning loop</li>
              </ul>
            </div>
            <div className="hover-card" style={{ backgroundColor: `${C.blue}10`, borderRadius: 16, padding: 28, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.blue3, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>APEXAI</div>
              <ul style={{ color: C.white, fontSize: 15, lineHeight: 1.85, paddingLeft: 18, opacity: 0.95 }}>
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
      <section id="how-it-works" style={{ backgroundColor: C.bg, padding: "88px 24px", borderTop: `1px solid ${C.borderW}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ color: C.blue2, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>How it works</div>
            <h2 style={{ color: C.white, fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.03em" }}>Real-time phone conversation — not a chatbot</h2>
            <p style={{ color: C.dim, fontSize: 17, maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>
              Your caller talks naturally. The system listens, decides when they are done speaking, generates a reply, and speaks with a natural voice — while optional actions like calendar and SMS run in the background.
            </p>
          </div>
          <div className="how-works-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, alignItems: "stretch" }}>
            {[
              { icon: "📞", label: "Caller speaks", sub: "Audio from the phone line is processed continuously.", color: C.blue },
              { icon: "🎤", label: "Speech timing", sub: "Detects when the caller finishes so replies do not talk over them.", color: C.blue2 },
              { icon: "🧠", label: "Intelligent reply", sub: "Tuned for natural sales and support conversations on the phone.", color: "#a78bfa" },
              { icon: "🔊", label: "Natural voice", sub: "Speaks as the answer is ready — minimal awkward silence.", color: C.green },
              { icon: "✅", label: "Actions", sub: "Bookings, CRM updates, and text confirmations when you enable them.", color: "#f59e0b" },
            ].map(({ icon, label, sub, color }, idx) => (
              <div key={label} style={{ display: "flex", alignItems: "stretch", minWidth: 0 }}>
                <div className="hover-card" style={{ backgroundColor: C.bg3, borderRadius: 14, padding: "20px 14px", border: `1px solid ${C.borderW}`, textAlign: "center", flex: 1, minHeight: 152, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 24 }}>{icon}</div>
                  <div style={{ color, fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>{label}</div>
                  <div style={{ color: C.dim2, fontSize: 11, lineHeight: 1.5 }}>{sub}</div>
                </div>
                {idx < 4 && <div className="how-works-arrow" style={{ color: C.blue2, fontSize: 18, padding: "0 4px", flexShrink: 0, display: "flex", alignItems: "center" }}>→</div>}
              </div>
            ))}
          </div>
          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginTop: 36 }}>
            {[
              { value: "Sub‑second", label: "Typical response start" },
              { value: "Low latency", label: "Built for live calls" },
              { value: "24/7", label: "Always answers" },
              { value: "Human transfer", label: "Hand off anytime" },
            ].map(({ value, label }) => (
              <div key={label} style={{ backgroundColor: C.bg3, border: `1px solid ${C.borderW}`, borderRadius: 12, padding: "18px 14px", textAlign: "center" }}>
                <div style={{ color: C.blue3, fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>{value}</div>
                <div style={{ color: C.dim2, fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section id="demo" style={{ backgroundColor: C.bg2, padding: "88px clamp(20px,5vw,48px) 104px", borderTop: `1px solid ${C.borderW}` }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ color: C.blue2, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Live demo</div>
            <p style={{ color: C.dim, fontSize: 17, maxWidth: 720, margin: "0 auto", lineHeight: 1.65 }}>No signup. No credit card. We call you so you can hear the same experience your leads get.</p>
          </div>
          <div style={{ backgroundColor: C.bg3, borderRadius: 24, padding: "clamp(28px,4vw,48px) clamp(20px,4vw,40px)", marginTop: 36, border: `1px solid ${C.borderW}`, boxSizing: "border-box", width: "100%" }}>
            <DemoCallWidget />
          </div>
        </div>
      </section>

      {/* INDUSTRY / SOLUTIONS — #inbound kept for legacy deep links */}
      <section id="solutions" style={{ backgroundColor: C.bg, padding: "88px clamp(20px,5vw,48px)", borderTop: `1px solid ${C.borderW}` }}>
        <div id="inbound" style={{ height: 1, scrollMarginTop: 88, overflow: "hidden", pointerEvents: "none" }} aria-hidden />
        <div style={{ maxWidth: 1240, margin: "0 auto", textAlign: "center", width: "100%" }}>
          <div style={{ color: C.blue2, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Solutions</div>
          <h2 style={{ color: C.white, fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.03em" }}>Industry packs</h2>
          <p style={{ color: C.dim, fontSize: 17, maxWidth: 680, margin: "0 auto 48px", lineHeight: 1.65 }}>
            Solar, roofing, HVAC, insurance, real estate, and more — scripts and qualification flows you can customize.
          </p>
          <IndustryDemos />
        </div>
      </section>

      {/* ROI — #outbound kept for legacy deep links */}
      <section id="calculator" style={{ backgroundColor: C.bg2, padding: "88px clamp(20px,5vw,48px)", borderTop: `1px solid ${C.borderW}` }}>
        <div id="outbound" style={{ height: 1, scrollMarginTop: 88, overflow: "hidden", pointerEvents: "none" }} aria-hidden />
        <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center", width: "100%" }}>
          <div style={{ color: C.blue2, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Revenue calculator</div>
          <h2 style={{ color: C.white, fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.03em" }}>Model the gap</h2>
          <p style={{ color: C.dim, fontSize: 17, marginBottom: 48, maxWidth: 640, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
            Slide your current funnel metrics. See an illustrative comparison when more leads get contacted and booked.
          </p>
          <ROICalculator />
        </div>
      </section>

      <LandingTestimonialCarousel testimonials={testimonials} />

      <LandingFaq />

      {/* TRUST */}
      <section id="trust" style={{ backgroundColor: C.bg, padding: "72px 24px", borderTop: `1px solid ${C.borderW}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ color: C.white, fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 800, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>Enterprise-grade reliability</h2>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {[
              { icon: <Shield size={26} style={{ color: C.blue3 }} />, title: "SOC 2 ready", desc: "Security controls aligned with enterprise standards. Data encrypted in transit and at rest." },
              { icon: <MessageSquare size={26} style={{ color: C.blue3 }} />, title: "TCPA-aware", desc: "Built-in controls for outbound at scale. You manage consent; we help you stay organized." },
              { icon: <Zap size={26} style={{ color: C.blue3 }} />, title: "99.9% uptime", desc: "Hosted on redundant cloud infrastructure with monitoring and failover." },
              { icon: <Phone size={26} style={{ color: C.blue3 }} />, title: "Human handoff", desc: "Instant live transfer anytime a caller needs a real person. Seamless." },
              { icon: <Star size={26} style={{ color: C.blue3 }} />, title: "All calls recorded", desc: "Full transcripts and recordings for every conversation. Review anytime." },
              { icon: <Calendar size={26} style={{ color: C.blue3 }} />, title: "12+ languages", desc: "English, Spanish, French, German, Portuguese, and more. Global ready." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="hover-card" style={{ backgroundColor: C.bg3, borderRadius: 16, padding: 24, border: `1px solid ${C.borderW}` }}>
                <div style={{ marginBottom: 14 }}>{icon}</div>
                <div style={{ color: C.white, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</div>
                <div style={{ color: C.dim2, fontSize: 14, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ backgroundColor: C.bg2, padding: "96px 24px", textAlign: "center", position: "relative", overflow: "hidden", borderTop: `1px solid ${C.borderW}` }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: `radial-gradient(ellipse,${C.blue}18 0%,transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative" }}>
          <h2 style={{ color: C.white, fontSize: "clamp(30px,5vw,52px)", fontWeight: 900, marginBottom: 20, letterSpacing: "-0.04em" }}>
            Stop missing calls.
            <br />
            <span style={{ color: C.blue3 }}>Start closing more.</span>
          </h2>
          <p style={{ color: C.dim, fontSize: 18, marginBottom: 44 }}>Your competitors are already using AI. The question is whether yours is better than theirs.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#demo">
              <button type="button" className="cta-btn" style={{ backgroundColor: C.blue, color: C.white, fontWeight: 800, fontSize: 16, padding: "16px 36px", borderRadius: 10, border: "none", display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={18} /> Get your first AI call
              </button>
            </a>
            <a href={getLoginUrl()}>
              <button type="button" className="cta-btn" style={{ backgroundColor: "transparent", color: C.white, fontWeight: 600, fontSize: 16, padding: "16px 28px", borderRadius: 10, border: `1px solid ${C.borderW}` }}>
                Sign up free
              </button>
            </a>
          </div>
          <p style={{ color: C.dim2, fontSize: 13, marginTop: 20 }}>No credit card required. Live in under 5 minutes.</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
