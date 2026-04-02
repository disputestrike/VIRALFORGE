import { Zap, Sparkles, Phone, Users, Shield, TextQuote, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import MarketingShell from "@/components/marketing/MarketingShell";

const industries = [
  { icon: Zap, title: "Solar", desc: "Qualifies homeowners on roof ownership, electric bill, and timeline. Books site survey appointments. Handles 'too expensive' and 'already have solar' objections.", examples: ["Inbound lead qualification", "Outbound appointment setting", "Post-install follow-up"] },
  { icon: Sparkles, title: "HVAC", desc: "Triages emergency vs maintenance calls. Books tech visits based on availability. Handles warranty questions and seasonal campaigns.", examples: ["Emergency dispatch triage", "Maintenance scheduling", "Seasonal outbound campaigns"] },
  { icon: Phone, title: "Roofing", desc: "Storm damage and insurance claim flows. Free inspection booking. Handles 'I need to think about it' and 'get more quotes' objections.", examples: ["Storm response campaigns", "Free inspection booking", "Insurance claim assistance"] },
  { icon: Users, title: "Real Estate", desc: "Buyer/seller qualification. Property showing scheduling. Pre-qualification for financing. Handles both inbound inquiries and outbound follow-up.", examples: ["Buyer qualification", "Showing scheduling", "Lead nurture sequences"] },
  { icon: Shield, title: "Insurance", desc: "Quote request handling. Coverage questions answered from your knowledge base. Agent consultation booking.", examples: ["Quote request intake", "Coverage Q&A", "Agent booking"] },
  { icon: TextQuote, title: "Spanish", desc: "Full sales conversations en Español across any vertical you run today. Same qualification, booking, and follow-up — just in Spanish.", examples: ["Bilingual inbound", "Spanish outbound campaigns", "SMS follow-up in Spanish"] },
];

export default function Solutions() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-white/20 px-6 py-20 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,111,244,0.1)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Solutions</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">One engine, every industry</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            ApexAI ships industry-specific packs with tailored scripts, objection handling, and qualification flows. Same platform, tuned for how your business actually sells.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl space-y-8">
          {industries.map((ind) => (
            <div key={ind.title} className="rounded-2xl border border-white/20 bg-white/[0.03] p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400"><ind.icon className="size-5" /></div>
                    <h2 className="text-xl font-bold">{ind.title}</h2>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">{ind.desc}</p>
                </div>
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Use cases</p>
                  <ul className="space-y-2">
                    {ind.examples.map((ex) => (
                      <li key={ex} className="flex items-center gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />{ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/20 px-6 py-16 text-center md:py-20">
        <div className="mx-auto max-w-lg">
          <h2 className="text-3xl font-black">Don't see your industry?</h2>
          <p className="mt-3 text-zinc-400">ApexAI works for any phone-driven business. Start with our general pack and customize from there.</p>
          <a href={getLoginUrl()} className="mt-6 inline-block">
            <Button size="lg" className="h-12 bg-blue-600 px-8 font-bold hover:bg-blue-500">Get Started Free</Button>
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
