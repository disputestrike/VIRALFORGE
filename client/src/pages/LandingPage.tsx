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
  CheckCircle2, Menu, X, Zap, BarChart3,
  Calendar, MessageSquare, Shield, Star,
} from "lucide-react";

// ── Our brand colors — blue primary, dark background ──────────────────────────
const C = {
  bg:     "#0a0c12",
  bg2:    "#0f1117",
  bg3:    "#141820",
  blue:   "#1d6ff4",
  blue2:  "#3b82f6",
  blue3:  "#60a5fa",
  green:  "#22c55e",
  white:  "#ffffff",
  gray:   "#f8f9fb",
  dim:    "rgba(255,255,255,0.62)",
  dim2:   "rgba(255,255,255,0.38)",
  dim3:   "rgba(255,255,255,0.07)",
  border: "rgba(29,111,244,0.2)",
  borderW:"rgba(255,255,255,0.07)",
  borderL:"rgba(0,0,0,0.07)",
};

const testimonials = [
  { name:"Moises R.", co:"Roofing — Dallas", quote:"200+ appointments, 160 contracts, $2M revenue in two weeks.", before:"5% response rate manually", after:"47% with ApexAI", icon:"🏗️" },
  { name:"Sarah K.", co:"Solar — Arizona", quote:"47% response rate vs 5% manual calling. 90 bookings every month now.", before:"Missing half our inbound calls", after:"Zero missed calls", icon:"☀️" },
  { name:"James T.", co:"HVAC — Florida", quote:"Never miss a call again. 3x revenue in 90 days. Game changer.", before:"Voicemail killing leads", after:"3x revenue in 90 days", icon:"❄️" },
];

const logos = ["Solar Pro","RoofRight","HVAC Masters","InsureNow","RealEdge","BuildCo","SkyLine","ProServ"];

const tickerItems = [
  "🟢 Sarah K. just booked a solar appointment — Irving TX",
  "🟢 Roofing campaign: 38 bookings booked today",
  "🟢 HVAC lead qualified: $12k job — Phoenix AZ",
  "🟢 Insurance: 147 calls handled this hour",
  "🟢 Real estate: 22 showings scheduled today",
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTicker(n => n + 1), 4200);
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

  const tabs = [
    { label:"Inbound AI", icon:<PhoneIncoming size={14}/> },
    { label:"Outbound AI", icon:<PhoneOutgoing size={14}/> },
    { label:"Booking", icon:<Calendar size={14}/> },
    { label:"Analytics", icon:<BarChart3 size={14}/> },
  ];

  const tabContent = [
    {
      color: C.green,
      headline: "Answer every call. Capture every lead.",
      body: "ApexAI picks up in under a second, qualifies the caller, and books the appointment — without a human ever picking up the phone.",
      points: ["Instant pickup — zero calls to voicemail","Real-time lead qualification","Books directly to your calendar","Auto SMS confirmation sent","Full transcript and recording"],
      panel: (
        <div style={{backgroundColor:C.bg,borderRadius:16,padding:28,border:`1px solid ${C.borderW}`}}>
          <div style={{color:C.dim2,fontSize:11,marginBottom:18,textTransform:"uppercase",letterSpacing:"0.1em"}}>Live call example</div>
          {[
            {r:"Caller",t:"Do you handle solar companies?"},
            {r:"ApexAI",t:"Absolutely. We handle inbound calls, qualify homeowners, and book installs directly to your calendar. Are you getting a lot of inbound leads right now?"},
            {r:"Caller",t:"Yes, about 50 a day but we miss half of them."},
            {r:"ApexAI",t:"Got it — that is a lot of missed revenue. I can show you exactly how ApexAI handles those calls. Want me to set up a quick demo?"},
          ].map(({r,t},i) => (
            <div key={i} style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-start"}}>
              <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:r==="ApexAI"?"#fff":"#000",backgroundColor:r==="ApexAI"?C.blue:"rgba(255,255,255,0.15)"}}>
                {r==="ApexAI"?"A":"C"}
              </div>
              <div style={{backgroundColor:r==="ApexAI"?`${C.blue}18`:"rgba(255,255,255,0.04)",padding:"9px 13px",borderRadius:10,flex:1}}>
                <div style={{color:r==="ApexAI"?C.blue2:C.dim2,fontSize:10,fontWeight:700,marginBottom:3}}>{r}</div>
                <div style={{color:r==="ApexAI"?C.white:C.dim,fontSize:13,lineHeight:1.5}}>{t}</div>
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
      points: ["Upload contacts — calling in minutes","Handles objections naturally","Books qualified leads automatically","SMS and email follow-up built in","Full campaign analytics dashboard"],
      panel: (
        <div style={{backgroundColor:C.bg,borderRadius:16,padding:28,border:`1px solid ${C.borderW}`}}>
          <div style={{color:C.dim2,fontSize:11,marginBottom:18,textTransform:"uppercase",letterSpacing:"0.1em"}}>Campaign dashboard — live</div>
          {[
            {label:"Campaign",value:"Solar Q1 — Texas",color:C.blue2},
            {label:"Contacts loaded",value:"2,847",color:C.white},
            {label:"Calls made today",value:"412",color:C.green},
            {label:"Appointments booked",value:"38",color:"#f59e0b"},
            {label:"Conversion rate",value:"9.2%",color:C.green},
            {label:"SMS follow-ups sent",value:"374",color:C.blue3},
          ].map(({label,value,color}) => (
            <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.borderW}`}}>
              <span style={{color:C.dim2,fontSize:13}}>{label}</span>
              <span style={{color,fontSize:14,fontWeight:700}}>{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      color: "#f59e0b",
      headline: "Appointments booked automatically.",
      body: "No back-and-forth. The AI collects name, phone, and preferred time — confirms it, sends a reminder, and writes it to your calendar.",
      points: ["Name, phone, and time collected","Instant confirmation SMS sent","Calendar sync and reminders","Reduces no-shows by 60%","CRM updated automatically"],
      panel: (
        <div style={{backgroundColor:C.bg,borderRadius:16,padding:28,border:`1px solid ${C.borderW}`}}>
          <div style={{color:C.dim2,fontSize:11,marginBottom:18,textTransform:"uppercase",letterSpacing:"0.1em"}}>Booking confirmation</div>
          <div style={{backgroundColor:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:12,padding:20,marginBottom:16}}>
            <div style={{color:C.green,fontSize:12,fontWeight:700,marginBottom:10}}>✓ APPOINTMENT CONFIRMED</div>
            <div style={{color:C.white,fontSize:15,fontWeight:600,marginBottom:6}}>Sarah Johnson — Solar Assessment</div>
            <div style={{color:C.dim,fontSize:13,marginBottom:4}}>Tuesday, April 8 at 2:00 PM</div>
            <div style={{color:C.dim,fontSize:13}}>📱 SMS confirmation sent to (555) 867-5309</div>
          </div>
          <div style={{color:C.dim2,fontSize:13,lineHeight:1.6}}>Booked automatically during inbound call. No human involved. Calendar updated instantly.</div>
        </div>
      ),
    },
    {
      color: "#a78bfa",
      headline: "Full visibility into every conversation.",
      body: "Every call recorded, transcribed, and scored. Know your conversion rate, top objections, and AI performance — turn by turn.",
      points: ["All calls recorded and transcribed","Lead scoring per call","Objection pattern tracking","Per-campaign conversion analytics","Export to your CRM"],
      panel: (
        <div style={{backgroundColor:C.bg,borderRadius:16,padding:28,border:`1px solid ${C.borderW}`}}>
          <div style={{color:C.dim2,fontSize:11,marginBottom:18,textTransform:"uppercase",letterSpacing:"0.1em"}}>Analytics — today</div>
          {[
            {label:"Calls handled",value:"847",pct:"+23%"},
            {label:"Leads qualified",value:"203",pct:"+31%"},
            {label:"Appointments booked",value:"67",pct:"+18%"},
            {label:"Avg call duration",value:"3m 24s",pct:"stable"},
            {label:"Conversion rate",value:"7.9%",pct:"+2.1%"},
          ].map(({label,value,pct}) => (
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.borderW}`}}>
              <span style={{color:C.dim2,fontSize:13}}>{label}</span>
              <span style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.white,fontSize:14,fontWeight:700}}>{value}</span>
                <span style={{color:C.green,fontSize:11,backgroundColor:"rgba(34,197,94,0.12)",padding:"2px 7px",borderRadius:4}}>{pct}</span>
              </span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.dim,fontSize:14}}>Loading...</div>
    </div>
  );

  return (
    <div style={{fontFamily:"-apple-system, 'Helvetica Neue', Arial, sans-serif",backgroundColor:C.bg,color:C.white,overflowX:"hidden"}}>
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
        @media(max-width:768px){.hide-mobile{display:none!important}.grid-2{grid-template-columns:1fr!important}.grid-3{grid-template-columns:1fr!important}.grid-4{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      {/* TICKER */}
      <div style={{backgroundColor:`${C.blue}18`,borderBottom:`1px solid ${C.border}`,padding:"8px 24px",textAlign:"center"}}>
        <span style={{color:C.blue3,fontSize:13,fontWeight:600}}>{tickerItems[ticker%tickerItems.length]}</span>
      </div>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,backgroundColor:"rgba(10,12,18,0.96)",borderBottom:`1px solid ${C.borderW}`,backdropFilter:"blur(12px)"}}>
        <div style={{maxWidth:1140,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <Link href="/" style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:C.blue,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 14H2.5L9 2Z" fill="white"/></svg>
            </div>
            <span style={{color:C.white,fontWeight:800,fontSize:19,letterSpacing:"-0.02em"}}>Apex<span style={{color:C.blue3}}>AI</span></span>
          </Link>
          <div className="hide-mobile" style={{display:"flex",gap:28,alignItems:"center"}}>
            {navLinks.map(l => <a key={l.label} href={l.href} className="nav-link">{l.label}</a>)}
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" style={{backgroundColor:C.blue,color:C.white,fontWeight:700,border:"none",borderRadius:8}}>Dashboard</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" style={{backgroundColor:C.blue,color:C.white,fontWeight:700,border:"none",borderRadius:8}}>Get Started Free</Button>
              </a>
            )}
          </div>
          <button onClick={()=>setMobileOpen(!mobileOpen)} style={{background:"none",border:"none",color:C.white,cursor:"pointer"}} className="show-mobile">
            {mobileOpen?<X size={22}/>:<Menu size={22}/>}
          </button>
        </div>
        {mobileOpen && (
          <div style={{backgroundColor:C.bg2,padding:"16px 24px 24px",borderTop:`1px solid ${C.borderW}`}}>
            {navLinks.map(l=>(
              <a key={l.label} href={l.href} onClick={()=>setMobileOpen(false)}
                style={{display:"block",color:C.dim,fontSize:15,padding:"10px 0",borderBottom:`1px solid ${C.borderW}`}}>{l.label}</a>
            ))}
            <a href={getLoginUrl()}>
              <Button style={{marginTop:16,width:"100%",backgroundColor:C.blue,color:C.white,fontWeight:700,border:"none",borderRadius:8}}>Get Started Free</Button>
            </a>
          </div>
        )}
      </nav>

      {/* HERO — dark, premium */}
      <section style={{backgroundColor:C.bg,padding:"96px 24px 80px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${C.blue}06 1px,transparent 1px),linear-gradient(90deg,${C.blue}06 1px,transparent 1px)`,backgroundSize:"56px 56px",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"5%",left:"50%",transform:"translateX(-50%)",width:800,height:500,background:`radial-gradient(ellipse,${C.blue}1a 0%,transparent 65%)`,pointerEvents:"none"}}/>
        <div style={{maxWidth:820,margin:"0 auto",position:"relative",animation:"fadeUp 0.5s ease"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,backgroundColor:`${C.blue}18`,border:`1px solid ${C.border}`,borderRadius:100,padding:"7px 18px",marginBottom:36}}>
            <div style={{width:7,height:7,borderRadius:"50%",backgroundColor:C.green,animation:"pulse 2s infinite"}}/>
            <span style={{color:C.blue3,fontSize:13,fontWeight:600}}>Live — answering calls right now</span>
          </div>
          <h1 style={{color:C.white,fontSize:"clamp(38px,6.5vw,68px)",fontWeight:900,lineHeight:1.08,marginBottom:24,letterSpacing:"-0.04em"}}>
            Your AI Revenue Engine.<br/>
            <span style={{color:C.blue3}}>Inbound + Outbound.</span><br/>
            Always Closing.
          </h1>
          <p style={{color:C.dim,fontSize:"clamp(17px,2.5vw,20px)",lineHeight:1.65,maxWidth:600,margin:"0 auto 44px"}}>
            Answers every call. Qualifies leads. Books appointments. Runs outbound campaigns — 24 hours a day, 7 days a week.
          </p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <a href="#demo">
              <button className="cta-btn" style={{backgroundColor:C.blue,color:C.white,fontWeight:800,fontSize:16,padding:"15px 32px",borderRadius:10,border:"none",display:"flex",alignItems:"center",gap:8}}>
                <Phone size={18}/> Hear It Live — Call Me Now
              </button>
            </a>
            <a href={getLoginUrl()}>
              <button className="cta-btn" style={{backgroundColor:"transparent",color:C.white,fontWeight:600,fontSize:16,padding:"15px 28px",borderRadius:10,border:`1px solid ${C.borderW}`,display:"flex",alignItems:"center",gap:8}}>
                Start Free Trial <ArrowRight size={16}/>
              </button>
            </a>
          </div>

          {/* Stats bar */}
          <div style={{display:"flex",gap:40,justifyContent:"center",flexWrap:"wrap",marginTop:64,paddingTop:64,borderTop:`1px solid ${C.borderW}`}}>
            {[
              {value:"< 1 sec",label:"Pickup time"},
              {value:"24/7",label:"Always available"},
              {value:"Zero",label:"Filler words"},
              {value:"8",label:"Voice options"},
            ].map(({value,label}) => (
              <div key={label} style={{textAlign:"center"}}>
                <div style={{color:C.blue3,fontWeight:900,fontSize:24,letterSpacing:"-0.03em"}}>{value}</div>
                <div style={{color:C.dim2,fontSize:13,marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOGOS — white strip */}
      <section style={{backgroundColor:C.gray,padding:"28px 24px",borderTop:`1px solid ${C.borderL}`,borderBottom:`1px solid ${C.borderL}`}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <p style={{color:"rgba(15,17,23,0.4)",fontSize:12,textAlign:"center",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Trusted by fast-growing businesses</p>
          <div style={{display:"flex",gap:24,justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
            {logos.map(l=>(
              <div key={l} style={{color:"rgba(15,17,23,0.45)",fontSize:13,fontWeight:700,padding:"6px 14px",border:"1px solid rgba(0,0,0,0.1)",borderRadius:7,backgroundColor:C.white}}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE TABS — dark */}
      <section style={{backgroundColor:C.bg,padding:"80px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div style={{color:C.blue2,fontWeight:700,fontSize:13,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>The Platform</div>
            <h2 style={{color:C.white,fontSize:"clamp(26px,4vw,44px)",fontWeight:800,marginBottom:16,letterSpacing:"-0.03em"}}>
              One platform. Every revenue channel.
            </h2>
            <p style={{color:C.dim,fontSize:18,maxWidth:520,margin:"0 auto"}}>
              Not a chatbot. Not a phone system. A complete AI revenue engine for inbound and outbound.
            </p>
          </div>

          {/* Tab selector */}
          <div style={{display:"flex",gap:4,justifyContent:"center",backgroundColor:C.bg3,borderRadius:12,padding:5,marginBottom:44,width:"fit-content",margin:"0 auto 44px",flexWrap:"wrap"}}>
            {tabs.map((tab,i) => (
              <button key={tab.label} className="tab-btn" onClick={()=>setActiveTab(i)}
                style={{display:"flex",alignItems:"center",gap:7,padding:"10px 20px",borderRadius:9,fontSize:14,fontWeight:600,
                  color:activeTab===i?C.white:C.dim,
                  backgroundColor:activeTab===i?C.blue:"transparent"}}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:52,alignItems:"center"}}>
            <div>
              <div style={{color:tabContent[activeTab].color,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>
                {tabs[activeTab].label}
              </div>
              <h3 style={{color:C.white,fontSize:"clamp(22px,3.5vw,34px)",fontWeight:800,marginBottom:16,letterSpacing:"-0.02em",lineHeight:1.2}}>
                {tabContent[activeTab].headline}
              </h3>
              <p style={{color:C.dim,fontSize:16,lineHeight:1.7,marginBottom:28}}>
                {tabContent[activeTab].body}
              </p>
              {tabContent[activeTab].points.map(p => (
                <div key={p} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                  <CheckCircle2 size={16} style={{color:tabContent[activeTab].color,flexShrink:0,marginTop:2}}/>
                  <span style={{color:C.dim,fontSize:15}}>{p}</span>
                </div>
              ))}
            </div>
            {tabContent[activeTab].panel}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — white */}
      <section style={{backgroundColor:C.gray,padding:"80px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <div style={{color:C.blue,fontWeight:700,fontSize:13,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>How It Works</div>
            <h2 style={{color:"#0a0c12",fontSize:"clamp(26px,4vw,44px)",fontWeight:800,marginBottom:16,letterSpacing:"-0.03em"}}>
              Streaming end-to-end. No dead air.
            </h2>
            <p style={{color:"rgba(10,12,18,0.55)",fontSize:17,maxWidth:500,margin:"0 auto"}}>
              Every component streams in real time — Deepgram hears the caller, Cerebras responds in milliseconds, Cartesia speaks before the full answer is even generated.
            </p>
          </div>
          <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:0,alignItems:"center"}}>
            {[
              {icon:"📞",label:"Caller Speaks",sub:"SignalWire streams mulaw audio instantly",color:C.blue},
              {icon:"🎤",label:"Deepgram STT",sub:"nova-2-phonecall detects end of speech in 300ms",color:C.blue2},
              {icon:"🧠",label:"Cerebras / Claude",sub:"Cerebras for speed. Claude for objections.",color:"#8b5cf6"},
              {icon:"🔊",label:"Cartesia TTS",sub:"Speaks on first clause. No waiting.",color:C.green},
              {icon:"✅",label:"Action Taken",sub:"Booking, CRM, SMS — real tools, real results",color:"#f59e0b"},
            ].map(({icon,label,sub,color},i) => (
              <div key={label} style={{display:"flex",alignItems:"center"}}>
                <div className="hover-card" style={{backgroundColor:C.white,borderRadius:14,padding:"22px 16px",border:`1px solid ${C.borderL}`,textAlign:"center",flex:1,minHeight:150,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
                  <div style={{fontSize:26}}>{icon}</div>
                  <div style={{color,fontWeight:700,fontSize:13}}>{label}</div>
                  <div style={{color:"rgba(10,12,18,0.5)",fontSize:12,lineHeight:1.5}}>{sub}</div>
                </div>
                {i<4 && <div style={{color:C.blue2,fontSize:20,padding:"0 3px",flexShrink:0}}>→</div>}
              </div>
            ))}
          </div>
          <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginTop:36}}>
            {[
              {value:"< 1s",label:"Total perceived latency"},
              {value:"300ms",label:"End-of-speech detect"},
              {value:"~30ms",label:"Cerebras inference"},
              {value:"ZERO",label:"Filler words — ever"},
            ].map(({value,label}) => (
              <div key={label} style={{backgroundColor:C.white,border:`1px solid ${C.borderL}`,borderRadius:12,padding:"18px 16px",textAlign:"center"}}>
                <div style={{color:C.blue,fontWeight:900,fontSize:22,letterSpacing:"-0.03em"}}>{value}</div>
                <div style={{color:"rgba(10,12,18,0.5)",fontSize:12,marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DEMO — dark, hero-level */}
      <section id="demo" style={{backgroundColor:C.bg2,padding:"88px 24px"}}>
        <div style={{maxWidth:680,margin:"0 auto",textAlign:"center"}}>
          <div style={{color:C.blue2,fontWeight:700,fontSize:13,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Live Demo</div>
          <h2 style={{color:C.white,fontSize:"clamp(26px,4vw,44px)",fontWeight:800,marginBottom:16,letterSpacing:"-0.03em"}}>
            Hear it for yourself.<br/><span style={{color:C.blue3}}>Right now.</span>
          </h2>
          <p style={{color:C.dim,fontSize:17,marginBottom:44,maxWidth:440,margin:"0 auto 44px"}}>
            Enter your number and get called instantly by ApexAI. No signup. No credit card.
          </p>
          <div style={{backgroundColor:C.bg3,borderRadius:20,padding:"40px 36px",border:`1px solid ${C.border}`}}>
            <DemoCallWidget />
          </div>
        </div>
      </section>

      {/* INDUSTRY DEMOS — white */}
      <section id="inbound" style={{backgroundColor:C.gray,padding:"80px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",textAlign:"center"}}>
          <div style={{color:C.blue,fontWeight:700,fontSize:13,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Industry Packs</div>
          <h2 style={{color:"#0a0c12",fontSize:"clamp(26px,4vw,44px)",fontWeight:800,marginBottom:16,letterSpacing:"-0.03em"}}>
            Pre-trained for your industry.
          </h2>
          <p style={{color:"rgba(10,12,18,0.55)",fontSize:17,maxWidth:480,margin:"0 auto 52px"}}>
            Solar, roofing, HVAC, insurance, real estate — industry-specific scripts and qualification flows ready out of the box.
          </p>
          <IndustryDemos />
        </div>
      </section>

      {/* ROI CALCULATOR — dark */}
      <section id="outbound" style={{backgroundColor:C.bg,padding:"80px 24px"}}>
        <div style={{maxWidth:760,margin:"0 auto",textAlign:"center"}}>
          <div style={{color:C.blue2,fontWeight:700,fontSize:13,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>ROI Calculator</div>
          <h2 style={{color:C.white,fontSize:"clamp(26px,4vw,44px)",fontWeight:800,marginBottom:16,letterSpacing:"-0.03em"}}>
            See your actual numbers.
          </h2>
          <p style={{color:C.dim,fontSize:17,marginBottom:44}}>
            Enter your business details. See exactly what ApexAI is worth.
          </p>
          <ROICalculator />
        </div>
      </section>

      {/* TESTIMONIALS — white */}
      <section id="results" style={{backgroundColor:C.gray,padding:"80px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <div style={{color:C.blue,fontWeight:700,fontSize:13,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Real Results</div>
            <h2 style={{color:"#0a0c12",fontSize:"clamp(26px,4vw,44px)",fontWeight:800,letterSpacing:"-0.03em"}}>
              Real businesses. Real revenue.
            </h2>
          </div>
          <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24}}>
            {testimonials.map(({name,co,quote,before,after,icon}) => (
              <div key={name} className="hover-card" style={{backgroundColor:C.white,borderRadius:20,padding:28,border:`1px solid ${C.borderL}`}}>
                <div style={{fontSize:32,marginBottom:16}}>{icon}</div>
                <p style={{color:"#0a0c12",fontSize:15,lineHeight:1.65,marginBottom:20,fontStyle:"italic"}}>"{quote}"</p>
                <div style={{display:"flex",gap:16,marginBottom:16}}>
                  <div style={{flex:1,backgroundColor:"rgba(239,68,68,0.08)",borderRadius:8,padding:"8px 12px"}}>
                    <div style={{color:"rgba(239,68,68,0.7)",fontSize:10,fontWeight:700,marginBottom:2}}>BEFORE</div>
                    <div style={{color:"rgba(10,12,18,0.6)",fontSize:12}}>{before}</div>
                  </div>
                  <div style={{flex:1,backgroundColor:"rgba(34,197,94,0.08)",borderRadius:8,padding:"8px 12px"}}>
                    <div style={{color:C.green,fontSize:10,fontWeight:700,marginBottom:2}}>AFTER</div>
                    <div style={{color:"rgba(10,12,18,0.7)",fontSize:12,fontWeight:600}}>{after}</div>
                  </div>
                </div>
                <div>
                  <div style={{color:C.blue,fontWeight:700,fontSize:14}}>{name}</div>
                  <div style={{color:"rgba(10,12,18,0.5)",fontSize:13}}>{co}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST — dark */}
      <section style={{backgroundColor:C.bg2,padding:"72px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <h2 style={{color:C.white,fontSize:"clamp(22px,3.5vw,36px)",fontWeight:800,textAlign:"center",marginBottom:48,letterSpacing:"-0.02em"}}>
            Enterprise-grade reliability.
          </h2>
          <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {[
              {icon:"🔒",title:"SOC 2 Ready",desc:"Security controls aligned with enterprise standards. Data encrypted in transit and at rest."},
              {icon:"📋",title:"TCPA Compliant",desc:"Built-in compliance controls for outbound calling at scale. Stay legal."},
              {icon:"⚡",title:"99.9% Uptime",desc:"Railway infrastructure with automatic failover. Never goes down during business hours."},
              {icon:"🤝",title:"Human Handoff",desc:"Instant live transfer anytime a caller needs a real person. Seamless."},
              {icon:"📼",title:"All Calls Recorded",desc:"Full transcripts and recordings for every conversation. Review anytime."},
              {icon:"🌍",title:"12 Languages",desc:"English, Spanish, French, German, Portuguese, and more. Global ready."},
            ].map(({icon,title,desc}) => (
              <div key={title} className="hover-card" style={{backgroundColor:C.bg3,borderRadius:16,padding:24,border:`1px solid ${C.borderW}`}}>
                <div style={{fontSize:26,marginBottom:14}}>{icon}</div>
                <div style={{color:C.white,fontWeight:700,fontSize:15,marginBottom:8}}>{title}</div>
                <div style={{color:C.dim2,fontSize:14,lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — dark with glow */}
      <section style={{backgroundColor:C.bg,padding:"96px 24px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:400,background:`radial-gradient(ellipse,${C.blue}18 0%,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{maxWidth:600,margin:"0 auto",position:"relative"}}>
          <h2 style={{color:C.white,fontSize:"clamp(30px,5vw,52px)",fontWeight:900,marginBottom:20,letterSpacing:"-0.04em"}}>
            Stop missing calls.<br/>
            <span style={{color:C.blue3}}>Start closing more.</span>
          </h2>
          <p style={{color:C.dim,fontSize:18,marginBottom:44}}>
            Your competitors are already using AI. The question is whether yours is better than theirs.
          </p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <a href="#demo">
              <button className="cta-btn" style={{backgroundColor:C.blue,color:C.white,fontWeight:800,fontSize:16,padding:"16px 36px",borderRadius:10,border:"none",display:"flex",alignItems:"center",gap:8}}>
                <Phone size={18}/> Get Your First AI Call
              </button>
            </a>
            <a href={getLoginUrl()}>
              <button className="cta-btn" style={{backgroundColor:"transparent",color:C.white,fontWeight:600,fontSize:16,padding:"16px 28px",borderRadius:10,border:`1px solid ${C.borderW}`}}>
                Sign Up Free
              </button>
            </a>
          </div>
          <p style={{color:C.dim2,fontSize:13,marginTop:20}}>No credit card required. Live in under 5 minutes.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{backgroundColor:C.bg2,borderTop:`1px solid ${C.borderW}`,padding:"40px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,borderRadius:7,background:C.blue,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 14H2.5L9 2Z" fill="white"/></svg>
            </div>
            <span style={{color:C.white,fontWeight:800}}>Apex<span style={{color:C.blue3}}>AI</span></span>
            <span style={{color:C.dim2,fontSize:13,marginLeft:8}}>© 2026 Starlight Global</span>
          </div>
          <div style={{display:"flex",gap:28,flexWrap:"wrap"}}>
            {[
              {label:"Inbound AI",href:"#inbound"},
              {label:"Outbound AI",href:"#outbound"},
              {label:"Pricing",href:"/pricing"},
              {label:"About",href:"/about"},
              {label:"Dashboard",href:"/dashboard"},
            ].map(({label,href}) => (
              <a key={label} href={href} className="nav-link" style={{fontSize:14}}>{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
