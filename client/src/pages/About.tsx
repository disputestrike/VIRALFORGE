import { Shield, Phone, Zap, Users, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import MarketingShell from "@/components/marketing/MarketingShell";

export default function About() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/20 px-6 py-20 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,111,244,0.1)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">About ApexAI</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Built for businesses that win or lose on the phone
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            ApexAI is a unified AI communications platform — inbound and outbound voice, SMS, and email — designed to turn every conversation into revenue.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">The problem</h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Service businesses — solar installers, roofers, HVAC companies, insurance agents — depend on phone calls to close deals. But they miss 30-60% of inbound calls, follow up too slowly on leads, and can't afford to staff phones 24/7. Every missed call is lost revenue.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Our solution</h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                ApexAI answers every call in under a second, qualifies callers with natural conversation, books appointments automatically, and runs outbound campaigns at scale. One platform handles inbound, outbound, SMS, email, CRM, and analytics — so businesses close more without hiring more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-8 text-center text-xs font-bold uppercase tracking-wider text-blue-400">What ApexAI does</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Phone, title: "Inbound AI", desc: "24/7 answering, qualification, and appointment booking on every call." },
              { icon: Zap, title: "Outbound Campaigns", desc: "Upload leads, AI calls them all, handles objections, books the qualified ones." },
              { icon: Users, title: "CRM & Leads", desc: "Built-in lead management, scoring, segmentation, and pipeline tracking." },
              { icon: BarChart3, title: "Analytics", desc: "Per-campaign conversion, call recordings, transcripts, and performance dashboards." },
              { icon: Shield, title: "Security", desc: "Tenant-isolated data, encrypted transport, audit trails, and compliance-aware design." },
              { icon: CheckCircle2, title: "Multi-channel", desc: "Voice, SMS, and email from one platform — consistent context across every touchpoint." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/20 bg-white/[0.03] p-6">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
                  <item.icon className="size-5" />
                </div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-blue-400">Data & Compliance</p>
          <h2 className="mb-8 text-center text-2xl font-bold">Built with security in mind</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { badge: "SOC 2 Ready", desc: "Role-based access, tenant data isolation, audit logging, encrypted transport, HTTPOnly session cookies. Technical controls aligned with SOC 2 Type II requirements." },
              { badge: "HIPAA Aligned", desc: "Per-tenant data scoping, access controls, and audit trails match HIPAA technical safeguard expectations. BAA available for healthcare clients." },
              { badge: "GDPR Aware", desc: "Data minimization, right-to-deletion support, encrypted storage. Privacy-conscious defaults for teams serving EU customers." },
              { badge: "TCPA Framework", desc: "Opt-in tracking, calling hours enforcement, DNC registry awareness, and caller ID disclosure built into the outbound engine." },
            ].map((c) => (
              <div key={c.badge} className="rounded-2xl border border-white/15 bg-white/[0.03] p-6">
                <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  {c.badge}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-zinc-500">
            For BAA, DPA, or security questionnaire requests, contact security@apexai.com
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center md:py-20">
        <div className="mx-auto max-w-lg">
          <h2 className="text-3xl font-black">Ready to stop missing calls?</h2>
          <p className="mt-3 text-zinc-400">Start your free trial. Live in under 5 minutes.</p>
          <a href={getLoginUrl()} className="mt-6 inline-block">
            <Button size="lg" className="h-12 bg-blue-600 px-8 font-bold hover:bg-blue-500">
              Get Started Free
            </Button>
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
