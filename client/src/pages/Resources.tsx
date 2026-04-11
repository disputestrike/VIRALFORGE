import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import MarketingShell from "@/components/marketing/MarketingShell";

const stories = [
  { name: "Moises R.", industry: "Roofing — Dallas", quote: "200+ appointments, 160 contracts, $2M revenue in two weeks with ApexAI handling all our inbound and outbound calls.", metric: "$2M in 2 weeks" },
  { name: "Sarah K.", industry: "Solar — Arizona", quote: "47% response rate vs 5% manual calling. 90 bookings every month now. We never miss a call.", metric: "47% response rate" },
  { name: "James T.", industry: "HVAC — Florida", quote: "Never miss a call again. 3x revenue in 90 days. Game changer for our seasonal business.", metric: "3x revenue" },
];

const faqs = [
  { q: "How fast does the AI pick up?", a: "Under one second. Callers hear a greeting immediately — no rings to voicemail." },
  { q: "Does it sound like a robot?", a: "No. ApexAI uses natural voice synthesis tuned for phone conversations. Callers regularly don't realize they're speaking with AI." },
  { q: "Can I use my existing phone number?", a: "Yes. You can port your existing number to SignalWire, or set up call forwarding from your current carrier." },
  { q: "What industries does it work for?", a: "Solar, HVAC, roofing, real estate, insurance, and any phone-driven business. Industry packs come with tailored scripts and qualification flows." },
  { q: "Is there a contract or setup fee?", a: "No contract, no setup fee. Month-to-month billing. Cancel anytime." },
  { q: "How does billing work?", a: "ApexAI uses one platform subscription with included monthly minutes. Higher tiers unlock more capacity, more numbers, outbound campaigns, and deeper automation." },
  { q: "Can the AI transfer to a human?", a: "Yes. You set a transfer number in Settings. When a caller asks for a human or the AI detects a complex situation, it warm-transfers immediately." },
  { q: "What about compliance?", a: "ApexAI is built with TCPA-aware outbound patterns, tenant-isolated data, encrypted transport, and audit trails. SOC 2 Ready, HIPAA Aligned." },
];

export default function Resources() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-white/20 px-6 py-20 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,111,244,0.1)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Resources</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">Customer Stories & FAQ</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Real results from real businesses. Plus answers to every question you'll have before signing up.
          </p>
        </div>
      </section>

      {/* Customer stories */}
      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-8 text-center text-xs font-bold uppercase tracking-wider text-blue-400">Customer Stories</p>
          <div className="grid gap-6 md:grid-cols-3">
            {stories.map((s) => (
              <div key={s.name} className="rounded-2xl border border-white/20 bg-white/[0.03] p-6">
                <div className="mb-4 rounded-lg bg-blue-600/15 px-3 py-1.5 text-center text-lg font-black text-blue-400">{s.metric}</div>
                <p className="text-sm leading-relaxed text-zinc-400">"{s.quote}"</p>
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-sm font-bold">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.industry}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-8 text-center text-xs font-bold uppercase tracking-wider text-blue-400">FAQ</p>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
                <h3 className="font-bold">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/pricing" className="rounded-2xl border border-white/20 bg-white/[0.03] p-6 text-center transition-colors hover:border-blue-400/40">
              <h3 className="text-lg font-bold">Pricing</h3>
              <p className="mt-2 text-sm text-zinc-400">One premium platform with clear plans and add-ons.</p>
            </Link>
            <Link href="/platform" className="rounded-2xl border border-white/20 bg-white/[0.03] p-6 text-center transition-colors hover:border-blue-400/40">
              <h3 className="text-lg font-bold">Platform</h3>
              <p className="mt-2 text-sm text-zinc-400">Full product walkthrough.</p>
            </Link>
            <Link href="/about" className="rounded-2xl border border-white/20 bg-white/[0.03] p-6 text-center transition-colors hover:border-blue-400/40">
              <h3 className="text-lg font-bold">About</h3>
              <p className="mt-2 text-sm text-zinc-400">Why we built this and compliance details.</p>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
