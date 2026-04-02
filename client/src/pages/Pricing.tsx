import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, Megaphone } from "lucide-react";
import { getLoginUrl } from "@/const";
import MarketingShell from "@/components/marketing/MarketingShell";

const inboundTiers = [
  { name: "Starter", price: 149, minutes: 500, numbers: 1, industries: 1, desc: "Perfect for small businesses", popular: false },
  { name: "Growth", price: 299, minutes: 1500, numbers: 1, industries: 1, desc: "Scale your AI assistant", popular: true },
  { name: "Pro", price: 599, minutes: 4000, numbers: 3, industries: "All", desc: "For high-volume operations", popular: false },
  { name: "Enterprise", price: null, minutes: "Custom", numbers: "Custom", industries: "All", desc: "Custom for your business", popular: false },
];

const outboundTiers = [
  { name: "Starter", leads: 50, price: 249, desc: "Test the waters", popular: false },
  { name: "Growth", leads: 100, price: 498, desc: "Scale your reach", popular: true },
  { name: "Pro", leads: 250, price: 1245, desc: "High-volume outreach", popular: false },
  { name: "Enterprise", leads: 500, price: 2490, desc: "Full-scale operations", popular: false },
];

const inboundFeatures = [
  "24/7 AI phone answering", "Natural conversation (not a robot)", "Lead qualification & scoring",
  "Appointment booking", "Call recordings & transcripts", "SMS follow-up automation",
  "Real-time dashboard", "Your own phone number included",
];

const outboundFeatures = [
  "AI voice outbound calls", "SMS + Email outreach", "Lead qualification engine",
  "Appointment scheduling", "Real-time analytics", "Campaign management",
  "Custom templates", "30-day dedicated support",
];

export default function Pricing() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-white/20 px-6 py-20 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,111,244,0.1)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Simple Pricing</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">Two Products, One Platform</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            24/7 inbound AI assistant with a phone number included, or outbound campaign engine — or both.
          </p>
        </div>
      </section>

      {/* INBOUND */}
      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400"><Phone className="size-5" /></div>
            <div>
              <h2 className="text-2xl font-bold">Inbound AI Assistant</h2>
              <p className="text-sm text-zinc-400">24/7 AI answers your calls, qualifies leads, books appointments. Phone number included.</p>
            </div>
          </div>
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {inboundTiers.map((t) => (
              <div key={t.name} className={`relative rounded-2xl border p-6 ${t.popular ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500" : "border-white/20 bg-white/[0.03] hover:border-white/40"}`}>
                {t.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold">Most Popular</span>}
                <p className="text-sm font-medium text-zinc-400">{t.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  {t.price ? <><span className="text-3xl font-black">${t.price}</span><span className="text-sm text-zinc-500">/mo</span></> : <span className="text-3xl font-black">Custom</span>}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{t.desc}</p>
                <div className="my-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Minutes/mo</span><span className="font-medium">{typeof t.minutes === "number" ? t.minutes.toLocaleString() : t.minutes}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Phone numbers</span><span className="font-medium">{t.numbers}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Industries</span><span className="font-medium">{t.industries}</span></div>
                </div>
                <a href={getLoginUrl()}><Button size="sm" className={`w-full font-semibold ${t.popular ? "bg-blue-600 text-white hover:bg-blue-500" : "border-white/30 bg-transparent text-white hover:bg-white/10"}`} variant={t.popular ? "default" : "outline"}>{t.price ? "Get Started" : "Contact Sales"}</Button></a>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Everything Included</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {inboundFeatures.map((f) => (<div key={f} className="flex items-center gap-2 text-sm text-zinc-300"><CheckCircle2 className="size-4 shrink-0 text-blue-400" />{f}</div>))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center text-sm">
            <span className="font-medium text-blue-400">+$49/mo</span> <span className="text-zinc-400">per additional industry pack</span>
          </div>
        </div>
      </section>

      {/* OUTBOUND */}
      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400"><Megaphone className="size-5" /></div>
            <div>
              <h2 className="text-2xl font-bold">Outbound Campaign Engine</h2>
              <p className="text-sm text-zinc-400">AI-powered outbound calls, SMS, and email. Pay per lead, scale as you grow.</p>
            </div>
          </div>
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {outboundTiers.map((t) => (
              <div key={t.name} className={`relative rounded-2xl border p-6 ${t.popular ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500" : "border-white/20 bg-white/[0.03] hover:border-white/40"}`}>
                {t.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold">Most Popular</span>}
                <p className="text-sm font-medium text-zinc-400">{t.name}</p>
                <div className="mt-2 flex items-baseline gap-1"><span className="text-3xl font-black">${t.price.toLocaleString()}</span><span className="text-sm text-zinc-500">/mo</span></div>
                <p className="mt-1 text-xs text-zinc-500">{t.leads} leads · {t.desc}</p>
                <div className="mt-4"><a href={getLoginUrl()}><Button size="sm" className={`w-full font-semibold ${t.popular ? "bg-blue-600 text-white hover:bg-blue-500" : "border-white/30 bg-transparent text-white hover:bg-white/10"}`} variant={t.popular ? "default" : "outline"}>Get Started</Button></a></div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Everything Included</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {outboundFeatures.map((f) => (<div key={f} className="flex items-center gap-2 text-sm text-zinc-300"><CheckCircle2 className="size-4 shrink-0 text-blue-400" />{f}</div>))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/15 bg-white/[0.03] p-8 text-center">
          <h3 className="text-xl font-bold">Why ApexAI vs Retell, Bland, or Vapi?</h3>
          <p className="mt-2 text-sm text-zinc-400">Same AI quality. Full CRM dashboard included. No per-minute billing surprises.</p>
          <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><p className="text-zinc-400">Retell AI</p><p className="mt-1 text-lg font-bold">$0.07/min</p><p className="text-xs text-zinc-500">No CRM, API-only</p></div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4"><p className="font-medium text-blue-400">ApexAI</p><p className="mt-1 text-lg font-bold text-blue-400">$149/mo flat</p><p className="text-xs text-zinc-400">Full CRM + Dashboard</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><p className="text-zinc-400">Bland AI</p><p className="mt-1 text-lg font-bold">$0.09/min</p><p className="text-xs text-zinc-500">No dashboard</p></div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
