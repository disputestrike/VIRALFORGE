import { CheckCircle2, Phone, Sparkles } from "lucide-react";
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
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">One premium AI phone agent platform</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            ApexAI is packaged as one platform for SMB and mid-market teams: inbound voice, booking,
            CRM, follow-up, and analytics in one account.
          </p>
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
                Choose the right capacity for your call volume now, then add industries, numbers, and outbound scale as you grow.
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
                <p className="text-sm font-medium text-zinc-400">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black">${plan.price}</span>
                  <span className="text-sm text-zinc-500">/mo</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{plan.summary}</p>
                <div className="my-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Minutes/mo</span>
                    <span className="font-medium">{plan.minutes.toLocaleString()}</span>
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
                <p className="mb-4 text-xs text-zinc-400">{plan.bestFor}</p>
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
                    Get Started
                  </Button>
                </a>
              </div>
            ))}

            <div className="rounded-2xl border border-white/20 bg-white/[0.03] p-6 hover:border-white/40">
              <p className="text-sm font-medium text-zinc-400">{ENTERPRISE_PLAN.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black">{ENTERPRISE_PLAN.priceLabel}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{ENTERPRISE_PLAN.summary}</p>
              <div className="my-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Minutes/mo</span>
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
              <p className="mb-4 text-xs text-zinc-400">{ENTERPRISE_PLAN.bestFor}</p>
              <a href={getLoginUrl()}>
                <Button size="sm" variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10">
                  Contact Sales
                </Button>
              </a>
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
        </div>
      </section>
    </MarketingShell>
  );
}
