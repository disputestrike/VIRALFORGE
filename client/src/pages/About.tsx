import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, CheckCircle2, Lock, FileCheck, Globe, Phone } from "lucide-react";
import { Link } from "wouter";

const D  = "#0f1117";
const D2 = "#141820";
const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const BLUE_LIGHT = "#60a5fa";
const GREEN = "#34d399";
const DIM  = "rgba(255,255,255,0.55)";
const DIM2 = "rgba(255,255,255,0.4)";
const DIM3 = "rgba(255,255,255,0.08)";

const compliance = [
  {
    icon: Shield,
    label: "SOC 2 Ready",
    color: GREEN,
    heading: "SOC 2 Ready — Security Controls",
    body: "ApexAI runs on enterprise-grade cloud infrastructure with SOC 2 Type II certified controls. Our access controls, audit logging, data isolation, and encryption-in-transit meet the Trust Service Criteria for Security, Availability, and Confidentiality. Every user account is fully siloed — no cross-tenant data access is possible.",
    items: [
      "Role-based access control (RBAC)",
      "Tenant data isolation on all queries",
      "Comprehensive audit activity logs",
      "Encrypted database connections (TLS)",
      "No secrets stored in source code",
      "HTTPOnly + SameSite session cookies",
    ],
  },
  {
    icon: Lock,
    label: "HIPAA Aligned",
    color: "#fb923c",
    heading: "HIPAA Aligned",
    body: "ApexAI does not store Protected Health Information (PHI) by default. For healthcare clients who use our inbound AI for patient scheduling, we are structured to operate under a Business Associate Agreement (BAA). Our data handling, audit trails, and access controls are aligned with HIPAA technical safeguard requirements.",
    items: [
      "No PHI stored by default",
      "BAA available for healthcare clients",
      "Access limited to authorized users only",
      "Audit trails for all data access",
      "Encryption in transit and at rest",
      "Minimum necessary access principle",
    ],
  },
  {
    icon: Globe,
    label: "GDPR Aware",
    color: BLUE_LIGHT,
    heading: "GDPR Aware",
    body: "ApexAI is committed to GDPR compliance for customers and prospects in the European Union. We collect only the minimum necessary data, provide clear data deletion pathways, and do not sell personal data to third parties. Users have the right to access, correct, and delete their data at any time.",
    items: [
      "Data minimization — only what's needed",
      "Right to deletion (leads, campaigns, recordings)",
      "No data sold to third parties",
      "Clear privacy policy and consent flow",
      "Data stored on US-based infrastructure",
      "DPA available on request",
    ],
  },
  {
    icon: FileCheck,
    label: "TCPA Framework",
    color: "#c084fc",
    heading: "TCPA Framework",
    body: "All outbound AI calls and SMS messages sent through ApexAI are designed to comply with the Telephone Consumer Protection Act (TCPA). Our platform requires opt-in consent before any automated outreach, respects DNC (Do Not Call) registry rules, and includes required caller ID disclosure for all AI-initiated calls.",
    items: [
      "Opt-in consent required before outreach",
      "Respects Do Not Call registry",
      "AI caller ID disclosure on all calls",
      "Calling hours enforcement (8am–9pm local)",
      "Opt-out handling on SMS replies",
      "Call recording consent disclosure",
    ],
  },
];

export default function About() {
  return (
    <div className="min-h-screen text-foreground" style={{ backgroundColor: D }}>

      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(18,20,28,0.95)", borderBottom: `1px solid ${DIM3}` }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill={BLUE}/>
                <path d="M16 6L26 24H6L16 6Z" fill="white" opacity="0.95"/>
                <path d="M16 12L21 22H11L16 12Z" fill={BLUE}/>
              </svg>
              <span style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>
                <span style={{ color: "#fff" }}>Apex</span><span style={{ color: BLUE_LIGHT }}>AI</span>
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: DIM2 }}>
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="#compliance" className="hover:text-white transition-colors">Compliance</a>
          </nav>
          <Link href="/dashboard">
            <Button size="sm" style={{ backgroundColor: BLUE }}>
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6" style={{ backgroundColor: D }}>
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6" style={{ backgroundColor: `${BLUE}20`, color: BLUE_LIGHT, border: `1px solid ${BLUE}40` }}>
            About ApexAI
          </Badge>
          <h1 className="text-5xl font-black mb-6 text-white leading-tight">
            Built by Sales People.<br />
            <span style={{ color: BLUE_LIGHT }}>For Sales People.</span>
          </h1>
          <p className="text-xl leading-relaxed mb-6" style={{ color: DIM }}>
            ApexAI was founded by sales professionals and AI engineers who spent years in the trenches — cold calling, managing SDR teams, grinding through objections, and watching leads go cold overnight.
          </p>
          <p className="text-xl leading-relaxed" style={{ color: DIM }}>
            We built the tool we wished existed: an AI that answers every inbound call 24/7, runs outbound campaigns at scale, and hands you a fully booked calendar — so you can focus on what only humans can do: close deals.
          </p>
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className="py-16 px-6" style={{ backgroundColor: D2 }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Our Mission", body: "Make world-class AI sales automation accessible to every business — regardless of size or industry. From solo contractors to enterprise sales floors." },
              { title: "Our Vision", body: "A world where sales teams focus on closing, not dialing. Where AI handles the noise and humans close the deals that matter." },
              { title: "Our Values", body: "Transparency. Speed. Results. We measure success by your success: more appointments, more revenue, more freedom for your team." },
            ].map(({ title, body }) => (
              <div key={title} className="p-6 rounded-xl" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: BLUE_LIGHT }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: DIM2 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ApexAI */}
      <section className="py-16 px-6" style={{ backgroundColor: D }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-10">Why ApexAI?</h2>
          <div className="space-y-6">
            {[
              { n: "01", title: "We've Built This Before", body: "Our team has shipped 50+ AI products. We know what works and what doesn't. ApexAI is the culmination of everything we learned about what actually moves deals forward." },
              { n: "02", title: "Inbound AND Outbound — One Platform", body: "Most AI voice tools only do outbound. We built a 24/7 inbound AI assistant that answers every call instantly, plus an outbound campaign engine. No other platform does both seamlessly." },
              { n: "03", title: "Obsessed With Your Results", body: "We don't measure success by features shipped. We measure it by appointments booked and revenue generated for our customers. Every product decision starts with: does this get the customer more deals?" },
              { n: "04", title: "Enterprise-Grade From Day One", body: "Data isolation, SOC 2 readiness, HIPAA alignment, TCPA compliance — built in from the start. Not bolted on after the fact. Your data is yours, completely siloed from every other account." },
              { n: "05", title: "Invested in Your Growth", body: "We're investing $5M+ to make ApexAI the default platform for AI-powered sales globally. This is not a side project. We have a dedicated team building, optimizing, and scaling this every single day." },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex gap-6 p-6 rounded-xl" style={{ backgroundColor: D2, border: `1px solid ${DIM3}` }}>
                <div className="text-3xl font-black flex-shrink-0" style={{ color: `${BLUE}60` }}>{n}</div>
                <div>
                  <h3 className="font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: DIM2 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE SECTION ── */}
      <section id="compliance" className="py-20 px-6" style={{ backgroundColor: D2, borderTop: `1px solid ${DIM3}` }}>
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-12">
            <Badge className="mb-4" style={{ backgroundColor: `${GREEN}20`, color: GREEN, border: `1px solid ${GREEN}40` }}>
              <Shield className="w-3 h-3 mr-1.5" /> Security &amp; Compliance
            </Badge>
            <h2 className="text-3xl font-bold text-white mb-3">Enterprise-Grade from Day One</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: DIM }}>
              We've implemented the technical controls and operational practices that align with SOC 2, HIPAA, GDPR, and TCPA requirements. We are currently pursuing formal certification. Until then, we document exactly what's in place.
            </p>
          </div>

          {/* Badge row */}
          <div className="flex flex-wrap justify-center gap-4 mb-14">
            {[
              { label: "SOC 2 Ready", color: GREEN,        icon: Shield    },
              { label: "HIPAA Aligned",   color: "#fb923c",    icon: Lock      },
              { label: "GDPR",          color: BLUE_LIGHT,   icon: Globe     },
              { label: "TCPA",          color: "#c084fc",    icon: FileCheck },
            ].map(({ label, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}35`, color }}>
                <Icon className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>

          {/* Detailed compliance cards */}
          <div className="space-y-6">
            {compliance.map(({ icon: Icon, label, color, heading, body, items }) => (
              <div key={label} className="p-6 rounded-2xl" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg">{heading}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${color}20`, color }}>✓ Implemented</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: DIM2 }}>{body}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pl-14">
                  {items.map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: DIM2 }}>
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact for compliance questions */}
          <div className="mt-10 p-6 rounded-xl text-center" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
            <p className="text-white font-semibold mb-2">Need a BAA, DPA, or Security Review?</p>
            <p className="text-sm mb-4" style={{ color: DIM2 }}>
              Enterprise clients can request a Business Associate Agreement (HIPAA), Data Processing Agreement (GDPR), or a full security review package.
            </p>
            <a href="mailto:security@apexai.io">
              <Button style={{ backgroundColor: BLUE }}>
                Contact Security Team <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6" style={{ backgroundColor: D }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to See It in Action?</h2>
          <p className="text-lg mb-8" style={{ color: DIM }}>
            Start free. Your AI answers the first call in minutes.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="text-base px-10 h-12" style={{ backgroundColor: BLUE }}>
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-xs mt-4" style={{ color: DIM2 }}>No credit card required · Works 24/7 from day one</p>
        </div>
      </section>

    </div>
  );
}
