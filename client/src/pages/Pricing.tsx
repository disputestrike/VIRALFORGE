import { ArrowRight, CheckCircle2, Phone, Sparkles, TrendingUp } from "lucide-react";
import { getLoginUrl } from "@/const";
import MarketingShell from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";
import {
  ENTERPRISE_PLAN,
  PLATFORM_ADD_ONS,
  PLATFORM_INCLUDED_FEATURES,
  PLATFORM_SCALE_FEATURES,
  SELF_SERVE_PLANS,
} from "@/lib/pricing";

export default function Pricing() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-white/20 px-6 py-20 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,111,244,0.12)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Simple Pricing</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">Capture and convert inbound demand with one platform</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            ApexAI answers every call, qualifies real buyers, books appointments, and follows up automatically
            so phone-driven teams stop leaking revenue between first contact and next step.
          </p>
        </div>
      </section>

      <section className="border-b border-white/20 px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/15 bg-white/[0.03] p-6 md:p-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">How ApexAI impacts your business</p>
            <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">One mental model: capture and convert inbound demand</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">
              Every plan uses the same ApexAI platform. The difference is how much inbound demand,
              follow-up, and operational complexity you want the system to handle for your team.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                title: "Capture missed demand",
                detail: "Answer overflow, after-hours, and first-touch calls before they become lost opportunities.",
              },
              {
                title: "Qualify buyers faster",
                detail: "Screen callers, collect context, and route real opportunities to the right next step.",
              },
              {
                title: "Book revenue automatically",
                detail: "Turn conversations into appointments, confirmations, and cleaner calendars.",
              },
              {
                title: "Follow up without headcount",
                detail: "Keep momentum going with SMS, email, and handoff-ready conversation history.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/#calculator">
              <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                See ROI scenarios
              </Button>
            </a>
            <a href="/#demo">
              <Button className="bg-blue-600 text-white hover:bg-blue-500">
                Hear the live demo
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <Phone className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Plans built for real phone-driven teams</h2>
              <p className="text-sm text-zinc-400">
                Choose the plan that matches how much inbound demand, follow-up, and routing coverage your team needs right now.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {SELF_SERVE_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 ${
                  plan.popular
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500"
                    : "border-white/20 bg-white/[0.03] hover:border-white/40"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold">
                    Most Popular
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Best for {plan.bestFor}</p>
                <p className="mt-3 text-sm font-medium text-zinc-300">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black">${plan.price}</span>
                  <span className="text-sm text-zinc-500">/mo</span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{plan.summary}</p>

                <div className="my-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-400">Estimated conversations/mo</span>
                    <span className="font-medium text-white">{plan.conversationEstimate}</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">What it handles</p>
                  <div className="mt-3 space-y-2">
                    {plan.whatItHandles.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="my-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Included usage capacity</span>
                    <span className="font-medium">up to {plan.minutes.toLocaleString()} min/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Phone numbers</span>
                    <span className="font-medium">{plan.numbers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Industry packs</span>
                    <span className="font-medium">{plan.industriesIncluded}</span>
                  </div>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                  Includes standard usage capacity for normal business activity. Capacity details stay in the plan so your team can scale cleanly.
                </p>
                <a href={getLoginUrl()}>
                  <Button
                    size="sm"
                    className={`w-full font-semibold ${
                      plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "border-white/30 bg-transparent text-white hover:bg-white/10"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Start free trial
                  </Button>
                </a>
              </div>
            ))}

            <div className="rounded-2xl border border-white/20 bg-white/[0.03] p-6 hover:border-white/40">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Best for {ENTERPRISE_PLAN.bestFor}</p>
              <p className="mt-3 text-sm font-medium text-zinc-300">{ENTERPRISE_PLAN.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black">{ENTERPRISE_PLAN.priceLabel}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-300">{ENTERPRISE_PLAN.summary}</p>

              <div className="my-5 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-400">Deployment profile</span>
                  <span className="font-medium text-white">{ENTERPRISE_PLAN.conversationEstimate}</span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">What it handles</p>
                <div className="mt-3 space-y-2">
                  {ENTERPRISE_PLAN.whatItHandles.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="my-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Included usage capacity</span>
                  <span className="font-medium">{ENTERPRISE_PLAN.minutes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Phone numbers</span>
                  <span className="font-medium">{ENTERPRISE_PLAN.numbers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Industry packs</span>
                  <span className="font-medium">{ENTERPRISE_PLAN.industriesIncluded}</span>
                </div>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                Use this path when rollout complexity matters more than self-serve speed.
              </p>
              <a href="/#demo">
                <Button size="sm" variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10">
                  Talk to sales
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Decision guide</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Starter",
                    detail: "Start here if you mainly need missed-call recovery, instant booking, and one strong front desk line.",
                  },
                  {
                    title: "Growth",
                    detail: "Choose this if your team needs dependable inbound coverage plus follow-up when the first touch gets missed.",
                  },
                  {
                    title: "Scale or Enterprise",
                    detail: "Move here when multiple lines, locations, compliance, or heavier routing complexity enter the picture.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Need a custom path?</p>
                  <h3 className="text-lg font-bold text-white">High-volume and complex teams can buy differently</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                If you run multiple locations, heavier call volume, or advanced CRM and routing needs, we can scope custom deployment and performance-based options separately from the self-serve plans.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="/#calculator">
                  <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                    See ROI first
                  </Button>
                </a>
                <a href="/#demo">
                  <Button className="bg-blue-600 text-white hover:bg-blue-500">
                    Talk to sales
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Included on the platform</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLATFORM_INCLUDED_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                  <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">What unlocks as you scale</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLATFORM_SCALE_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-white/[0.03] p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Add-ons instead of a second pricing system</h3>
              <p className="mt-1 text-sm text-zinc-400">
                ApexAI stays one product. When you need more coverage, channels, or deployment support, you add it intentionally.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {PLATFORM_ADD_ONS.map((item) => (
              <div key={item.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-sm font-medium text-blue-400">{item.priceLabel}</p>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Self-serve",
                detail: "Best when you want to connect a number, choose a plan, and go live fast without extra process.",
              },
              {
                title: "Advanced setup",
                detail: "Best for teams that need help with routing, integrations, or more tailored deployment support.",
              },
              {
                title: "Custom deployment",
                detail: "Best for high-volume, multi-location, regulated, or performance-priced opportunities.",
              },
            ].map((path) => (
              <div key={path.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">{path.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{path.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
