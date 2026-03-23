import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  const tiers = [
    { name: "Starter", leads: 50, price: 249, desc: "Perfect for testing" },
    { name: "Growth", leads: 100, price: 498, desc: "Scaling your campaigns", popular: true },
    { name: "Pro", leads: 250, price: 1245, desc: "Mid-market volume" },
    { name: "Enterprise", leads: 500, price: 2490, desc: "Full-scale operations" },
  ];

  const features = [
    "AI voice calls (human-sounding)",
    "SMS outreach",
    "Email automation",
    "Lead qualification engine",
    "Real-time analytics",
    "24/7 automation",
    "30-day dedicated support",
    "Custom templates",
  ];

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
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </nav>
        </div>
      </header>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-black mb-4">Simple, Linear Pricing</h1>
            <p className="text-xl text-muted-foreground">
              $249 per 50 leads per month. Scale as you grow. No surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {tiers.map((tier) => (
              <div key={tier.name} className={`relative p-6 rounded-xl border transition-all ${
                tier.popular 
                  ? "border-primary bg-primary/5 ring-2 ring-primary" 
                  : "border-border bg-card"
              }`}>
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Most Popular</Badge>
                )}
                <h3 className="font-bold text-lg mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{tier.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black">${tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{tier.leads} leads/month</p>
                <Link href="/">
                  <Button className="w-full" variant={tier.popular ? "default" : "outline"}>
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <div className="mt-6 space-y-3">
                  {features.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border p-8 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">All plans include:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold mb-8">How Pricing Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold mb-3">Linear Scaling</h3>
                <p className="text-muted-foreground mb-4">
                  Need 150 leads? (150/50) × $249 = $747/month. Need 200? (200/50) × $249 = $996/month.
                  It scales perfectly with your business.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-3">No Hidden Fees</h3>
                <p className="text-muted-foreground mb-4">
                  What you see is what you pay. API costs, support, everything is included. We don't charge extra for 
                  usage or per-lead fees.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-3">30-Day Free Trial</h3>
                <p className="text-muted-foreground mb-4">
                  Start with our Starter tier free for 30 days. No credit card required. If it doesn't work, we'll refund 100%.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-3">Custom Enterprise Pricing</h3>
                <p className="text-muted-foreground mb-4">
                  Processing 1,000+ leads/month? Let's talk. We offer volume discounts and custom SLAs for enterprise customers.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold mb-4">ROI Calculator</h2>
            <p className="text-muted-foreground mb-8">
              Most customers report a 3-5x ROI within 90 days. If you're booking 100 appointments/month at an average value of $300, that's $30,000 in monthly revenue.
              ApexAI's cost? Just $498/month. That's a 60:1 ROI.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/20 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Scale Your Sales?</h2>
          <p className="text-muted-foreground mb-8">
            Pick a plan and get started. We'll handle the rest.
          </p>
          <Link href="/">
            <Button size="lg">
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">ApexAI</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 ApexAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
