import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import DemoCallWidget from "@/components/DemoCallWidget";
import ROICalculator from "@/components/ROICalculator";
import IndustryDemos from "@/components/IndustryDemos";
import {
  ArrowRight, Phone, PhoneIncoming, PhoneOutgoing,
  CheckCircle2, Menu, X, Zap, BarChart3, Users,
  Calendar, MessageSquare, Shield,
} from "lucide-react";

// ── Design tokens — Deepgram-inspired: dark + teal accent ─────────────────────
const T = {
  bg:    "#0b0d10",
  bg2:   "#101318",
  bg3:   "#161b22",
  teal:  "#13ef93",   // Deepgram primary accent — teal/mint
  teal2: "#0fcf7d",
  blue:  "#1d6ff4",
  white: "#ffffff",
  dim:   "rgba(255,255,255,0.62)",
  dim2:  "rgba(255,255,255,0.38)",
  dim3:  "rgba(255,255,255,0.08)",
  border:"rgba(19,239,147,0.12)",
  borderW:"rgba(255,255,255,0.07)",
};

// ── Testimonials ───────────────────────────────────────────────────────────────
const testimonials = [
  { name:"Moises R.", co:"Roofing — Dallas", result:"200+ appointments, 160 contracts, $2M in two weeks", icon:"🏗️" },
  { name:"Sarah K.", co:"Solar — Arizona", result:"47% response rate vs 5% manual. 90 bookings/month.", icon:"☀️" },
  { name:"James T.", co:"HVAC — Florida", result:"Never miss a call again. 3x revenue in 90 days.", icon:"❄️" },
];

// ── Customer logos ─────────────────────────────────────────────────────────────
const logos = ["Solar Pro","RoofRight","HVAC Masters","InsureNow","RealEdge","BuildCo","SkyLine","ProServ"];

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [ticker, setTicker] = useState(0);

  // Live ticker
  useEffect(() => {
    const t = setInterval(() => setTicker(n => n + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const navLinks = [
    { label:"Inbound AI", href:"#inbound" },
    { label:"Outbound AI", href:"#outbound" },
    { label:"Live Demo", href:"#demo" },
    { label:"Pricing", href:"/pricing" },
    { label:"Case Studies", href:"#results" },
    { label:"About", href:"/about" },
  ];

  const featureTabs = [
    { label:"Inbound AI", icon:<PhoneIncoming size={16}/> },
    { label:"Outbound AI", icon:<PhoneOutgoing size={16}/> },
    { label:"Booking", icon:<Calendar size={16}/> },
    { label:"Analytics", icon:<BarChart3 size={16}/> },
  ];

  const tabContent = [
    {
      headline: "Answer every call. Every time.",
      body: "ApexAI picks up in under a second. Qualifies the caller. Books the appointment. Never misses a lead — even at 2 AM.",
      points: ["Instant pickup — zero rings to voicemail","Real-time lead qualification","Direct calendar booking","Auto SMS confirmation","Full transcript + recording"],
      color: T.teal,
    },
    {
      headline: "Run outbound campaigns at scale.",
      body: "Upload your lead list. ApexAI calls them all. Qualifies the interested ones, books appointments, follows up on everyone else.",
      points: ["Upload contacts — live in minutes","Handles objections naturally","Books qualified leads automatically","SMS + email follow-up","Full campaign analytics"],
      color: T.blue,
    },
    {
      headline: "Appointments booked automatically.",
      body: "No back-and-forth. The AI collects name, phone, and time — confirms it, sends a reminder, and writes it to your calendar.",
      points: ["Name + phone + time collected","Instant confirmation SMS","Calendar sync","Reminder sequence","Reduces no-shows by 60%"],
      color: "#f59e0b",
    },
    {
      headline: "Full visibility into every call.",
      body: "Every conversation recorded, transcribed, and scored. Know your conversion rate, your top objections, and your AI's performance.",
      points: ["All calls recorded + transcribed","Lead scoring per call","Objection tracking","Conversion analytics","Per-campaign reporting"],
      color: "#a78bfa",
    },
  ];

  const tickerItems = [
    "🟢 Sarah K. just booked a solar appointment",
    "🟢 Roofing campaign: 38 bookings today",
    "🟢 HVAC lead qualified: $12k job",
    "🟢 Insurance: 147 calls handled this hour",
    "🟢 Real estate: 22 showings scheduled today",
  ];

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Arial, sans-serif", backgroundColor:T.bg, color:T.white, overflowX:"hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(19,239,147,0.2)} 50%{box-shadow:0 0 40px rgba(19,239,147,0.4)} }
        .nav-link { color:rgba(255,255,255,0.62); font-size:14px; font-weight:500; text-decoration:none; transition:color 0.15s; }
        .nav-link:hover { color:#fff; }
        .tab-btn { background:none; border:none; cursor:pointer; transition:all 0.2s; }
        .feature-card { transition:border-color 0.2s, background 0.2s; }
        .feature-card:hover { border-color:rgba(19,239,147,0.3) !important; }
        .cta-primary { transition:opacity 0.15s, transform 0.15s; }
        .cta-primary:hover { opacity:0.9; transform:translateY(-1px); }
        .logo-pill { opacity:0.45; transition:opacity 0.2s; filter:grayscale(1) brightness(2); }
        .logo-pill:hover { opacity:0.8; }
        @media (max-width:768px) { .desktop-only { display:none !important; } .mobile-grid { grid-template-columns:1fr !important; } }
      `}</style>

      {/* ── LIVE TICKER ─────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor:`${T.teal}18`, borderBottom:`1px solid ${T.border}`, padding:"8px 24px", textAlign:"center" }}>
        <span style={{ color:T.teal, fontSize:13, fontWeight:600 }}>
          {tickerItems[ticker % tickerItems.length]}
        </span>
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ position:"sticky", top:0, zIndex:100, backgroundColor:"rgba(11,13,16,0.96)", borderBottom:`1px solid ${T.borderW}`, backdropFilter:"blur(12px)" }}>
        <div style={{ maxWidth:1140, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg, ${T.teal}, ${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", animation:"glow 3s ease-in-out infinite" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 14H2.5L9 2Z" fill="white"/></svg>
            </div>
            <span style={{ color:T.white, fontWeight:800, fontSize:19, letterSpacing:"-0.02em" }}>Apex<span style={{ color:T.teal }}>AI</span></span>
          </Link>

          <div className="desktop-only" style={{ display:"flex", gap:28, alignItems:"center" }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} className="nav-link">{l.label}</a>
            ))}
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" style={{ backgroundColor:T.teal, color:"#000", fontWeight:700, border:"none", borderRadius:8 }}>Dashboard</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()} style={{ textDecoration:"none" }}>
                <Button size="sm" style={{ backgroundColor:T.teal, color:"#000", fontWeight:700, border:"none", borderRadius:8 }}>Get Started Free</Button>
              </a>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background:"none", border:"none", color:T.white, cursor:"pointer", display:"none" }} className="mobile-only">
            {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
        {mobileOpen && (
          <div style={{ backgroundColor:T.bg2, padding:"16px 24px 24px", borderTop:`1px solid ${T.borderW}` }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
                style={{ display:"block", color:T.dim, fontSize:15, padding:"10px 0", borderBottom:`1px solid ${T.borderW}`, textDecoration:"none" }}>
                {l.label}
              </a>
            ))}
            <a href={getLoginUrl()} style={{ textDecoration:"none" }}>
              <Button style={{ marginTop:16, width:"100%", backgroundColor:T.teal, color:"#000", fontWeight:700, border:"none", borderRadius:8 }}>Get Started Free</Button>
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor:T.bg, padding:"96px 24px 80px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        {/* Background grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.teal}08 1px, transparent 1px), linear-gradient(90deg, ${T.teal}08 1px, transparent 1px)`, backgroundSize:"64px 64px", pointerEvents:"none" }}/>
        {/* Glow */}
        <div style={{ position:"absolute", top:"0%", left:"50%", transform:"translateX(-50%)", width:800, height:500, background:`radial-gradient(ellipse, ${T.teal}18 0%, transparent 65%)`, pointerEvents:"none" }}/>

        <div style={{ maxWidth:800, margin:"0 auto", position:"relative", animation:"fadeUp 0.6s ease" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, backgroundColor:`${T.teal}18`, border:`1px solid ${T.border}`, borderRadius:100, padding:"7px 18px", marginBottom:36 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", backgroundColor:T.teal, animation:"pulse 2s infinite" }}/>
            <span style={{ color:T.teal, fontSize:13, fontWeight:600 }}>Live — answering calls right now</span>
          </div>

          <h1 style={{ color:T.white, fontSize:"clamp(40px,6.5vw,72px)", fontWeight:900, lineHeight:1.08, marginBottom:24, letterSpacing:"-0.04em" }}>
            The AI Revenue Engine<br/>
            <span style={{ color:T.teal }}>Built for Phone-Driven</span><br/>
            Businesses.
          </h1>

          <p style={{ color:T.dim, fontSize:"clamp(17px,2.5vw,21px)", lineHeight:1.65, maxWidth:580, margin:"0 auto 44px" }}>
            Answers every call. Qualifies leads. Books appointments. Runs outbound campaigns — inbound and outbound, 24 hours a day.
          </p>

          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <a href="#demo" style={{ textDecoration:"none" }}>
              <button className="cta-primary" style={{ backgroundColor:T.teal, color:"#000", fontWeight:800, fontSize:16, padding:"14px 32px", borderRadius:10, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                <Phone size={18}/> Hear It Live — Call Me Now
              </button>
            </a>
            <a href={getLoginUrl()} style={{ textDecoration:"none" }}>
              <button style={{ backgroundColor:"transparent", color:T.white, fontWeight:600, fontSize:16, padding:"14px 28px", borderRadius:10, border:`1px solid ${T.borderW}`, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                Start Free Trial <ArrowRight size={16}/>
              </button>
            </a>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:40, justifyContent:"center", flexWrap:"wrap", marginTop:64, paddingTop:64, borderTop:`1px solid ${T.borderW}` }}>
            {[
              { value:"< 1 sec", label:"Pickup time" },
              { value:"24/7", label:"Always available" },
              { value:"Zero", label:"Filler words" },
              { value:"Clean", label:"Call termination" },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ color:T.teal, fontWeight:900, fontSize:24, letterSpacing:"-0.03em" }}>{value}</div>
                <div style={{ color:T.dim2, fontSize:13, marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOGO BAR ─────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor:T.bg2, padding:"32px 24px", borderTop:`1px solid ${T.borderW}`, borderBottom:`1px solid ${T.borderW}` }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <p style={{ color:T.dim2, fontSize:13, textAlign:"center", marginBottom:24, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Trusted by fast-growing businesses</p>
          <div style={{ display:"flex", gap:32, justifyContent:"center", alignItems:"center", flexWrap:"wrap" }}>
            {logos.map(l => (
              <div key={l} className="logo-pill" style={{ color:T.white, fontSize:14, fontWeight:700, padding:"8px 16px", border:`1px solid ${T.borderW}`, borderRadius:8 }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE TABS (Deepgram style) ───────────────────────────────────── */}
      <section style={{ backgroundColor:T.bg, padding:"80px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ color:T.teal, fontWeight:700, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>Platform</div>
            <h2 style={{ color:T.white, fontSize:"clamp(26px,4vw,44px)", fontWeight:800, marginBottom:16, letterSpacing:"-0.03em" }}>
              One platform. Every revenue channel.
            </h2>
            <p style={{ color:T.dim, fontSize:18, maxWidth:540, margin:"0 auto" }}>
              Not just a chatbot. Not just a phone system. A complete AI revenue engine for inbound and outbound.
            </p>
          </div>

          {/* Tab selector */}
          <div style={{ display:"flex", gap:4, justifyContent:"center", backgroundColor:T.bg3, borderRadius:12, padding:6, marginBottom:40, width:"fit-content", margin:"0 auto 40px" }}>
            {featureTabs.map((tab, i) => (
              <button
                key={tab.label}
                className="tab-btn"
                onClick={() => setActiveTab(i)}
                style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"10px 20px", borderRadius:9, fontSize:14, fontWeight:600,
                  color: activeTab === i ? "#000" : T.dim,
                  backgroundColor: activeTab === i ? T.teal : "transparent",
                  border:"none",
                }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"center" }} className="mobile-grid">
            <div>
              <div style={{ color:tabContent[activeTab].color, fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>
                {featureTabs[activeTab].label}
              </div>
              <h3 style={{ color:T.white, fontSize:"clamp(22px,3.5vw,36px)", fontWeight:800, marginBottom:16, letterSpacing:"-0.02em", lineHeight:1.2 }}>
                {tabContent[activeTab].headline}
              </h3>
              <p style={{ color:T.dim, fontSize:17, lineHeight:1.7, marginBottom:28 }}>
                {tabContent[activeTab].body}
              </p>
              {tabContent[activeTab].points.map(p => (
                <div key={p} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                  <CheckCircle2 size={16} style={{ color:tabContent[activeTab].color, flexShrink:0 }}/>
                  <span style={{ color:T.dim, fontSize:15 }}>{p}</span>
                </div>
              ))}
            </div>
            {/* Visual panel */}
            <div style={{ backgroundColor:T.bg3, borderRadius:20, padding:"32px", border:`1px solid ${T.borderW}`, minHeight:280 }}>
              {activeTab === 0 && (
                <div>
                  <div style={{ color:T.dim2, fontSize:11, marginBottom:20, textTransform:"uppercase", letterSpacing:"0.1em" }}>Live call — inbound</div>
                  {[
                    { role:"Caller", text:"Do you handle solar companies?" },
                    { role:"ApexAI", text:"Absolutely. We handle inbound calls, qualify homeowners, and book installs to your calendar. Are you getting a lot of inbound leads?" },
                    { role:"Caller", text:"Yes, about 50 a day but we miss half." },
                    { role:"ApexAI", text:"Got it — that is a lot of missed revenue. Want me to set up a quick demo call?" },
                  ].map(({ role, text }, i) => (
                    <div key={i} style={{ display:"flex", gap:10, marginBottom:14, alignItems:"flex-start" }}>
                      <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#000", backgroundColor: role==="ApexAI" ? T.teal : "rgba(255,255,255,0.12)" }}>
                        {role==="ApexAI" ? "A" : "C"}
                      </div>
                      <div style={{ backgroundColor: role==="ApexAI" ? `${T.teal}18` : "rgba(255,255,255,0.04)", padding:"9px 14px", borderRadius:10, flex:1 }}>
                        <div style={{ color: role==="ApexAI" ? T.teal : T.dim2, fontSize:10, fontWeight:700, marginBottom:4 }}>{role}</div>
                        <div style={{ color: role==="ApexAI" ? T.white : T.dim, fontSize:14, lineHeight:1.5 }}>{text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 1 && (
                <div>
                  <div style={{ color:T.dim2, fontSize:11, marginBottom:20, textTransform:"uppercase", letterSpacing:"0.1em" }}>Outbound campaign dashboard</div>
                  {[
                    { label:"Campaign", value:"Solar Q1 — Texas", color:T.blue },
                    { label:"Contacts loaded", value:"2,847", color:T.white },
                    { label:"Calls made today", value:"412", color:T.teal },
                    { label:"Appointments booked", value:"38", color:"#f59e0b" },
                    { label:"Conversion rate", value:"9.2%", color:T.teal },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${T.borderW}` }}>
                      <span style={{ color:T.dim2, fontSize:14 }}>{label}</span>
                      <span style={{ color, fontSize:14, fontWeight:700 }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 2 && (
                <div>
                  <div style={{ color:T.dim2, fontSize:11, marginBottom:20, textTransform:"uppercase", letterSpacing:"0.1em" }}>Booking confirmation</div>
                  <div style={{ backgroundColor:`${T.teal}18`, border:`1px solid ${T.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
                    <div style={{ color:T.teal, fontSize:12, fontWeight:700, marginBottom:8 }}>✓ APPOINTMENT CONFIRMED</div>
                    <div style={{ color:T.white, fontSize:15, fontWeight:600, marginBottom:4 }}>Sarah Johnson — Solar Assessment</div>
                    <div style={{ color:T.dim, fontSize:14 }}>Tuesday, April 8 @ 2:00 PM</div>
                    <div style={{ color:T.dim, fontSize:14 }}>📱 SMS sent to (555) 867-5309</div>
                  </div>
                  <div style={{ color:T.dim2, fontSize:13 }}>Booked automatically during inbound call. No human involved.</div>
                </div>
              )}
              {activeTab === 3 && (
                <div>
                  <div style={{ color:T.dim2, fontSize:11, marginBottom:20, textTransform:"uppercase", letterSpacing:"0.1em" }}>Analytics overview — today</div>
                  {[
                    { label:"Calls handled", value:"847", pct:"+23%", color:T.teal },
                    { label:"Leads qualified", value:"203", pct:"+31%", color:T.teal },
                    { label:"Appointments booked", value:"67", pct:"+18%", color:"#f59e0b" },
                    { label:"Avg call duration", value:"3m 24s", pct:"stable", color:T.dim },
                    { label:"Conversion rate", value:"7.9%", pct:"+2.1%", color:T.teal },
                  ].map(({ label, value, pct, color }) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${T.borderW}` }}>
                      <span style={{ color:T.dim2, fontSize:13 }}>{label}</span>
                      <span style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ color, fontSize:14, fontWeight:700 }}>{value}</span>
                        <span style={{ color:T.teal, fontSize:11, backgroundColor:`${T.teal}18`, padding:"2px 6px", borderRadius:4 }}>{pct}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ────────────────────────────────────────────────────────── */}
      <section id="demo" style={{ backgroundColor:T.bg2, padding:"80px 24px" }}>
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <div style={{ color:T.teal, fontWeight:700, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>Live Demo</div>
          <h2 style={{ color:T.white, fontSize:"clamp(26px,4vw,44px)", fontWeight:800, marginBottom:16, letterSpacing:"-0.03em" }}>
            Hear it for yourself.<br/><span style={{ color:T.teal }}>Right now.</span>
          </h2>
          <p style={{ color:T.dim, fontSize:17, marginBottom:44, maxWidth:440, margin:"0 auto 44px" }}>
            Enter your number and get called instantly by ApexAI. No signup. No credit card.
          </p>
          <div style={{ backgroundColor:T.bg3, borderRadius:20, padding:40, border:`1px solid ${T.border}` }}>
            <DemoCallWidget />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (horizontal steps like Deepgram) ───────────────────── */}
      <section style={{ backgroundColor:T.bg, padding:"80px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ color:T.teal, fontWeight:700, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>Architecture</div>
            <h2 style={{ color:T.white, fontSize:"clamp(26px,4vw,44px)", fontWeight:800, marginBottom:16, letterSpacing:"-0.03em" }}>
              A unified voice AI engine.
            </h2>
            <p style={{ color:T.dim, fontSize:17, maxWidth:500, margin:"0 auto" }}>
              Not stitched-together components. One system, streaming end-to-end.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:0, alignItems:"center" }} className="mobile-grid">
            {[
              { icon:"📞", label:"Caller Speaks", sub:"SignalWire delivers mulaw audio in real time" },
              { icon:"🎤", label:"STT — Nova 3", sub:"Deepgram detects end-of-speech in 300ms" },
              { icon:"🧠", label:"AI Responds", sub:"Claude for complex. Cerebras for speed." },
              { icon:"🔊", label:"TTS — Aura 2", sub:"First audio plays in under 250ms" },
              { icon:"✅", label:"Action Taken", sub:"Booking, CRM, SMS, transfer — real tools" },
            ].map(({ icon, label, sub }, i) => (
              <div key={label} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ backgroundColor:T.bg3, borderRadius:16, padding:"24px 20px", border:`1px solid ${T.borderW}`, textAlign:"center", flex:1, minHeight:160, display:"flex", flexDirection:"column", justifyContent:"center", gap:10 }}>
                  <div style={{ fontSize:28 }}>{icon}</div>
                  <div style={{ color:T.teal, fontWeight:700, fontSize:14 }}>{label}</div>
                  <div style={{ color:T.dim2, fontSize:12, lineHeight:1.5 }}>{sub}</div>
                </div>
                {i < 4 && <div style={{ color:T.teal, fontSize:22, padding:"0 4px", flexShrink:0 }}>→</div>}
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:16, marginTop:40 }}>
            {[
              { value:"< 1s", label:"Total pickup time" },
              { value:"300ms", label:"End-of-speech detect" },
              { value:"250ms", label:"First audio chunk" },
              { value:"ZERO", label:"Filler words" },
            ].map(({ value, label }) => (
              <div key={label} style={{ backgroundColor:`${T.teal}10`, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 16px", textAlign:"center" }}>
                <div style={{ color:T.teal, fontWeight:900, fontSize:24, letterSpacing:"-0.03em" }}>{value}</div>
                <div style={{ color:T.dim2, fontSize:13, marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRY DEMOS ───────────────────────────────────────────────────── */}
      <section id="inbound" style={{ backgroundColor:T.bg2, padding:"80px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", textAlign:"center" }}>
          <div style={{ color:T.teal, fontWeight:700, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>Industry Packs</div>
          <h2 style={{ color:T.white, fontSize:"clamp(26px,4vw,44px)", fontWeight:800, marginBottom:16, letterSpacing:"-0.03em" }}>
            Pre-trained for your industry.
          </h2>
          <p style={{ color:T.dim, fontSize:17, maxWidth:480, margin:"0 auto 48px" }}>
            Scripts, objection handling, and qualification flows — ready out of the box.
          </p>
          <IndustryDemos />
        </div>
      </section>

      {/* ── ROI CALCULATOR ───────────────────────────────────────────────────── */}
      <section id="outbound" style={{ backgroundColor:T.bg, padding:"80px 24px" }}>
        <div style={{ maxWidth:780, margin:"0 auto", textAlign:"center" }}>
          <div style={{ color:T.teal, fontWeight:700, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>ROI Calculator</div>
          <h2 style={{ color:T.white, fontSize:"clamp(26px,4vw,44px)", fontWeight:800, marginBottom:16, letterSpacing:"-0.03em" }}>
            See your actual numbers.
          </h2>
          <p style={{ color:T.dim, fontSize:17, marginBottom:44 }}>
            Enter your business details. See exactly what ApexAI is worth to you.
          </p>
          <ROICalculator />
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section id="results" style={{ backgroundColor:T.bg2, padding:"80px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ color:T.teal, fontWeight:700, fontSize:13, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>Results</div>
            <h2 style={{ color:T.white, fontSize:"clamp(26px,4vw,44px)", fontWeight:800, letterSpacing:"-0.03em" }}>
              Real businesses. Real results.
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:24 }}>
            {testimonials.map(({ name, co, result, icon }) => (
              <div key={name} className="feature-card" style={{ backgroundColor:T.bg3, borderRadius:20, padding:"28px", border:`1px solid ${T.borderW}` }}>
                <div style={{ fontSize:32, marginBottom:16 }}>{icon}</div>
                <p style={{ color:T.white, fontSize:16, lineHeight:1.6, marginBottom:20, fontStyle:"italic" }}>"{result}"</p>
                <div>
                  <div style={{ color:T.teal, fontWeight:700, fontSize:14 }}>{name}</div>
                  <div style={{ color:T.dim2, fontSize:13 }}>{co}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ────────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor:T.bg, padding:"72px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <h2 style={{ color:T.white, fontSize:"clamp(22px,3.5vw,36px)", fontWeight:800, textAlign:"center", marginBottom:48, letterSpacing:"-0.02em" }}>
            Enterprise-grade reliability.
          </h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:24 }}>
            {[
              { icon:"🔒", title:"SOC 2 Ready", desc:"Security controls aligned with enterprise standards." },
              { icon:"📋", title:"TCPA Compliant", desc:"Built-in compliance for outbound calling at scale." },
              { icon:"⚡", title:"99.9% Uptime", desc:"Railway infrastructure with automatic failover." },
              { icon:"🤝", title:"Human Handoff", desc:"Instant live transfer anytime a caller needs a person." },
              { icon:"📼", title:"All Calls Recorded", desc:"Full transcripts + recordings for every conversation." },
              { icon:"🌍", title:"12 Languages", desc:"English, Spanish, French, German, Portuguese, and more." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="feature-card" style={{ backgroundColor:T.bg2, borderRadius:16, padding:"24px", border:`1px solid ${T.borderW}` }}>
                <div style={{ fontSize:26, marginBottom:14 }}>{icon}</div>
                <div style={{ color:T.white, fontWeight:700, fontSize:15, marginBottom:8 }}>{title}</div>
                <div style={{ color:T.dim2, fontSize:14, lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor:T.bg2, padding:"96px 24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:400, background:`radial-gradient(ellipse, ${T.teal}15 0%, transparent 70%)`, pointerEvents:"none" }}/>
        <div style={{ maxWidth:600, margin:"0 auto", position:"relative" }}>
          <h2 style={{ color:T.white, fontSize:"clamp(30px,5vw,52px)", fontWeight:900, marginBottom:20, letterSpacing:"-0.04em" }}>
            Stop missing calls.<br/>
            <span style={{ color:T.teal }}>Start closing more.</span>
          </h2>
          <p style={{ color:T.dim, fontSize:18, marginBottom:44 }}>
            Your competitors are using AI. The question is whether yours is better than theirs.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <a href="#demo" style={{ textDecoration:"none" }}>
              <button className="cta-primary" style={{ backgroundColor:T.teal, color:"#000", fontWeight:800, fontSize:16, padding:"16px 36px", borderRadius:10, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                <Phone size={18}/> Get Your First AI Call
              </button>
            </a>
            <a href={getLoginUrl()} style={{ textDecoration:"none" }}>
              <button style={{ backgroundColor:"transparent", color:T.white, fontWeight:600, fontSize:16, padding:"16px 28px", borderRadius:10, border:`1px solid ${T.borderW}`, cursor:"pointer" }}>
                Sign Up Free
              </button>
            </a>
          </div>
          <p style={{ color:T.dim2, fontSize:13, marginTop:20 }}>No credit card required. Live in under 5 minutes.</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor:T.bg, borderTop:`1px solid ${T.borderW}`, padding:"40px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:`linear-gradient(135deg, ${T.teal}, ${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 14H2.5L9 2Z" fill="white"/></svg>
            </div>
            <span style={{ color:T.white, fontWeight:800 }}>Apex<span style={{ color:T.teal }}>AI</span></span>
            <span style={{ color:T.dim2, fontSize:13, marginLeft:8 }}>© 2026 Starlight Global</span>
          </div>
          <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
            {[
              { label:"Inbound AI", href:"#inbound" },
              { label:"Outbound AI", href:"#outbound" },
              { label:"Pricing", href:"/pricing" },
              { label:"About", href:"/about" },
              { label:"Dashboard", href:"/dashboard" },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="nav-link" style={{ fontSize:14 }}>{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
