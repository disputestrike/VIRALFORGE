import { Phone, PhoneOutgoing, Calendar, BarChart3, Zap, Shield, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import MarketingShell from "@/components/marketing/MarketingShell";

const sections = [
  { icon: Phone, title: "Inbound AI", desc: "Answer every call. Capture every lead. ApexAI picks up in under a second, qualifies the caller, and books the appointment — without a human ever picking up the phone.", features: ["Sub-second pickup", "Real-time qualification", "Appointment booking", "SMS confirmation", "Call recording & transcript"] },
  { icon: PhoneOutgoing, title: "Outbound AI", desc: "Upload your lead list and ApexAI calls them all. Qualifies the interested ones, books appointments, and follows up on everyone else automatically.", features: ["Bulk dialing at scale", "Objection handling", "Lead qualification", "SMS + email follow-up", "Campaign analytics"] },
  { icon: Calendar, title: "Booking & Calendar", desc: "Collects name, phone, preferred time — confirms verbally, sends reminders, and syncs to your calendar. Reduces no-shows.", features: ["Verbal booking on call", "SMS confirmation", "Reminder sequences", "Calendar sync", "CRM auto-update"] },
  { icon: BarChart3, title: "Analytics & Ops", desc: "Per-campaign conversion, recordings, searchable transcripts, lead scoring, and dashboards.", features: ["Conversion tracking", "Call recordings", "Searchable transcripts", "Lead scoring", "Export-ready data"] },
];

export default function Platform() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-white/20 px-6 py-20 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,111,244,0.1)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Platform</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">The Unified Voice Platform</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Inbound and outbound voice, SMS, email, CRM, booking, and analytics — one platform, one login.
          </p>
        </div>
      </section>

      {sections.map((s, i) => (
        <section key={s.title} className="border-b border-white/20 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 === 1 ? "md:[direction:rtl] md:*:[direction:ltr]" : ""}`}>
              <div>
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400"><s.icon className="size-6" /></div>
                <h2 className="text-3xl font-bold">{s.title}</h2>
                <p className="mt-4 text-zinc-400 leading-relaxed">{s.desc}</p>
                <ul className="mt-6 space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Zap className="size-3.5 text-blue-400" />{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-8">
                <div className="flex flex-col gap-3">
                  {s.features.map((f, j) => (
                    <div key={f} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600/20 text-xs font-bold text-blue-400">{j + 1}</div>
                      <span className="text-sm text-zinc-300">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="px-6 py-16 text-center md:py-20">
        <div className="mx-auto max-w-lg">
          <h2 className="text-3xl font-black">See it in action</h2>
          <p className="mt-3 text-zinc-400">Start your free trial and have your first AI call in under 5 minutes.</p>
          <a href={getLoginUrl()} className="mt-6 inline-block">
            <Button size="lg" className="h-12 bg-blue-600 px-8 font-bold hover:bg-blue-500">Get Started Free</Button>
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
