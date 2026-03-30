import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Zap, Phone, Megaphone } from "lucide-react";
import { Link } from "wouter";

const inboundTiers = [
  {
    name: "Starter",
    price: 149,
    minutes: 500,
    numbers: 1,
    industries: 1,
    desc: "Perfect for small businesses",
    popular: false,
  },
  {
    name: "Growth",
    price: 299,
    minutes: 1500,
    numbers: 1,
    industries: 1,
    desc: "Scale your AI assistant",
    popular: true,
  },
  {
    name: "Pro",
    price: 599,
    minutes: 4000,
    numbers: 3,
    industries: "All",
    desc: "For high-volume operations",
    popular: false,
  },
  {
    name: "Enterprise",
    price: null,
    minutes: "Custom",
    numbers: "Custom",
    industries: "All",
    desc: "Custom for your business",
    popular: false,
  },
];

const outboundTiers = [
  { name: "Starter", leads: 50, price: 249, desc: "Test the waters" },
  { name: "Growth", leads: 100, price: 498, desc: "Scale your reach", popular: true },
  { name: "Pro", leads: 250, price: 1245, desc: "High-volume outreach" },
  { name: "Enterprise", leads: 500, price: 2490, desc: "Full-scale operations" },
];

const inboundFeatures = [
  "24/7 AI phone answering",
  "Natural conversation (not a robot)",
  "Lead qualification & scoring",
  "Appointment booking",
  "Call recordings & transcripts",
  "SMS follow-up automation",
  "Real-time dashboard",
  "Your own phone number included",
];

const outboundFeatures = [
  "AI voice outbound calls",
  "SMS + Email outreach",
  "Lead qualification engine",
  "Appointment scheduling",
  "Real-time analytics",
  "Campaign management",
  "Custom templates",
  "30-day dedicated support",
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">ApexAI</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors text-foreground font-medium">Pricing</Link>
          </nav>
          <Link href="/dashboard">
            <Button size="sm">Get Started <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>
      </header>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">Simple Pricing</Badge>
            <h1 className="text-5xl font-black mb-4">Two Products, One Platform</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              24/7 inbound AI assistant with a phone number included, or outbound campaign engine — or both.
            </p>
          </div>

          {/* INBOUND AI ASSISTANT */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Inbound AI Assistant</h2>
                <p className="text-muted-foreground text-sm">24/7 AI answers your calls, qualifies leads, books appointments. Phone number included.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {inboundTiers.map((tier) => (
                <div key={tier.name} className={`relative p-6 rounded-xl border transition-all ${
                  tier.popular
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}>
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">{tier.name}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      {tier.price ? (
                        <>
                          <span className="text-3xl font-black">${tier.price}</span>
                          <span className="text-muted-foreground text-sm">/mo</span>
                        </>
                      ) : (
                        <span className="text-3xl font-black">Custom</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tier.desc}</p>
                  </div>
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minutes/mo</span>
                      <span className="font-medium">{typeof tier.minutes === 'number' ? tier.minutes.toLocaleString() : tier.minutes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone numbers</span>
                      <span className="font-medium">{tier.numbers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Industries</span>
                      <span className="font-medium">{tier.industries}</span>
                    </div>
                  </div>
                  <Link href="/dashboard">
                    <Button variant={tier.popular ? "default" : "outline"} size="sm" className="w-full">
                      {tier.price ? "Get Started" : "Contact Sales"}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Everything Included</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {inboundFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-center">
              <span className="text-primary font-medium">+$49/mo</span>
              <span className="text-muted-foreground"> per additional industry pack (HVAC, Roofing, Insurance, Real Estate)</span>
            </div>
          </div>

          {/* OUTBOUND CAMPAIGNS */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Outbound Campaign Engine</h2>
                <p className="text-muted-foreground text-sm">AI-powered outbound calls, SMS, and email. Pay per lead, scale as you grow.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {outboundTiers.map((tier) => (
                <div key={tier.name} className={`relative p-6 rounded-xl border transition-all ${
                  tier.popular
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}>
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">{tier.name}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black">${tier.price.toLocaleString()}</span>
                      <span className="text-muted-foreground text-sm">/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tier.leads} leads · {tier.desc}</p>
                  </div>
                  <Link href="/dashboard">
                    <Button variant={tier.popular ? "default" : "outline"} size="sm" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Everything Included</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {outboundFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COMPARISON TO COMPETITORS */}
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold mb-2">Why ApexAI vs Retell, Bland, or Vapi?</h3>
            <p className="text-muted-foreground text-sm mb-6">Same AI quality. Full CRM dashboard included. No per-minute billing surprises.</p>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Retell AI</p>
                <p className="font-bold text-lg">$0.07/min</p>
                <p className="text-muted-foreground text-xs">No CRM, API-only</p>
              </div>
              <div className="border-x border-border px-6">
                <p className="text-primary mb-1 font-medium">ApexAI</p>
                <p className="font-bold text-lg text-primary">$149/mo flat</p>
                <p className="text-muted-foreground text-xs">Full CRM + Dashboard</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Bland AI</p>
                <p className="font-bold text-lg">$0.09/min</p>
                <p className="text-muted-foreground text-xs">No dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
