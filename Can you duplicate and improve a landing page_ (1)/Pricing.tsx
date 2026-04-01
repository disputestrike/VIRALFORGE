import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Check } from "lucide-react";

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small teams just getting started",
    features: [
      "Up to 1,000 inbound calls/month",
      "Basic lead qualification",
      "Calendar booking integration",
      "SMS confirmations",
      "Email support",
      "Basic analytics",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$299",
    period: "/month",
    description: "For teams ready to scale their revenue",
    features: [
      "Up to 10,000 inbound calls/month",
      "Advanced lead qualification",
      "Outbound campaign automation",
      "Calendar & CRM integration",
      "SMS & email follow-up",
      "Advanced analytics & insights",
      "Priority support",
      "Custom scripts",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "For large teams with complex requirements",
    features: [
      "Unlimited calls",
      "Custom qualification logic",
      "Advanced integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom training",
      "API access",
      "White-label options",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-emerald-500/10 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              No hidden fees. No long-term contracts. Pay for what you use and scale as you grow.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier, idx) => (
              <Card
                key={idx}
                className={`p-8 flex flex-col ${
                  tier.highlighted
                    ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/50 ring-2 ring-emerald-500/30"
                    : "bg-card/50 border-border/40"
                }`}
              >
                {tier.highlighted && (
                  <div className="mb-4 inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 w-fit">
                    <p className="text-xs font-semibold text-emerald-400">Most Popular</p>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>

                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-muted-foreground ml-2">{tier.period}</span>
                </div>

                <Button
                  size="lg"
                  className={
                    tier.highlighted
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white w-full mb-8"
                      : "border-emerald-500/30 hover:border-emerald-400 w-full mb-8"
                  }
                  variant={tier.highlighted ? "default" : "outline"}
                >
                  {tier.cta}
                </Button>

                <div className="space-y-4 flex-1">
                  {tier.features.map((feature, fidx) => (
                    <div key={fidx} className="flex gap-3">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 md:py-32 bg-card/30 border-y border-border/40">
        <div className="container">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-4 px-4 font-semibold text-white">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-white">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold text-white">Growth</th>
                  <th className="text-center py-4 px-4 font-semibold text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Inbound Calls", starter: "1K/mo", growth: "10K/mo", enterprise: "Unlimited" },
                  { feature: "Outbound Campaigns", starter: "—", growth: "✓", enterprise: "✓" },
                  { feature: "Lead Qualification", starter: "Basic", growth: "Advanced", enterprise: "Custom" },
                  { feature: "CRM Integration", starter: "Basic", growth: "Advanced", enterprise: "Custom" },
                  { feature: "SMS Follow-Up", starter: "✓", growth: "✓", enterprise: "✓" },
                  { feature: "Analytics", starter: "Basic", growth: "Advanced", enterprise: "Advanced+" },
                  { feature: "Support", starter: "Email", growth: "Priority", enterprise: "Dedicated" },
                  { feature: "SLA", starter: "—", growth: "—", enterprise: "99.99%" },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border/40 hover:bg-background/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-white">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{row.starter}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{row.growth}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-32">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "Can I change plans anytime?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
              },
              {
                q: "Is there a setup fee?",
                a: "No setup fees. You can be live in under 5 minutes. For Enterprise customers, we offer onboarding support at no additional cost.",
              },
              {
                q: "What if I need more calls than my plan includes?",
                a: "We'll notify you as you approach your limit. You can upgrade anytime, or we can discuss a custom plan for your needs.",
              },
              {
                q: "Do you offer annual discounts?",
                a: "Yes! Annual plans come with a 20% discount. Contact our sales team to learn more.",
              },
              {
                q: "Is there a free trial?",
                a: "Absolutely. Start your free trial today—no credit card required. Get live in under 5 minutes.",
              },
            ].map((item, idx) => (
              <Card key={idx} className="p-6 bg-card/50 border-border/40">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-muted-foreground text-sm">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-t border-border/40">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of high-growth teams that are already using ApexAI to capture every call and close more deals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Get Your First AI Call
            </Button>
            <Button size="lg" variant="outline" className="border-emerald-500/30 hover:border-emerald-400">
              Schedule a Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required. Live in under 5 minutes.
          </p>
        </div>
      </section>
    </div>
  );
}
