import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Phone, BarChart3, Zap, Users, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const WORKFLOW_STEPS = [
  { title: "INBOUND", description: "Answer every call instantly" },
  { title: "QUALIFY", description: "AI analyzes fit in real-time" },
  { title: "BOOK", description: "Direct calendar integration" },
  { title: "FOLLOW-UP", description: "SMS confirmations auto-sent" },
];

export default function Home() {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  return (
    <div className="w-full">
      {/* Hero Section with Real Image */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663389251174/VmVDhHe7bCzbKconZQSYkA/apexai-hero-businessman-call-TwMVnVJjPLDL5N2657x7rw.webp"
            alt="Professional on call with analytics"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
        </div>

        <div className="container relative z-10">
          <div className="max-w-2xl">
            <div className="mb-6 inline-block px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40">
              <p className="text-sm font-semibold text-emerald-400">
                ✓ Live — answering calls right now
              </p>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              The Unified Voice Solution for High-Growth Teams
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-xl">
              One stack for inbound answering, outbound campaigns, booking, and SMS follow-up. Built for businesses that live on the phone.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Phone className="w-4 h-4 mr-2" />
                Hear It Live — Call Me Now
              </Button>
              <Button size="lg" variant="outline" className="border-emerald-500/30 hover:border-emerald-400">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Social Proof */}
            <div className="grid grid-cols-3 gap-8">
              {[
                { metric: "< 1s", label: "Pickup time" },
                { metric: "24/7", label: "Always available" },
                { metric: "8+", label: "Voice options" },
              ].map((item, idx) => (
                <div key={idx}>
                  <p className="text-2xl font-bold text-emerald-400">{item.metric}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Integration Section */}
      <section className="py-20 md:py-32 bg-card/30 border-y border-border/40">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              How ApexAI Powers Your Revenue
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12">
              From first ring to closed deal. Integrated with Salesforce, HubSpot, Google Calendar, and Twilio.
            </p>

            <div className="mb-12">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663389251174/VmVDhHe7bCzbKconZQSYkA/apexai-workflow-integration-fDoWWpqQgycDQGqMNVwekk.webp"
                alt="Workflow: Inbound → Qualify → Book → Follow-up"
                className="w-full rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {WORKFLOW_STEPS.map((step, idx) => (
                <Card key={idx} className="p-6 bg-card/50 border-border/40 text-center">
                  <h3 className="font-bold text-emerald-400 mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Results Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                See Your Team's Impact in Real-Time
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Dashboard shows live metrics: calls answered, conversion rates, revenue generated, and lead qualification scores. Everything your team needs to optimize performance.
              </p>

              <div className="space-y-4">
                {[
                  "Real-time call metrics and analytics",
                  "Conversion funnel visibility",
                  "Revenue impact tracking",
                  "Lead qualification scoring",
                  "Calendar integration preview",
                  "SMS follow-up templates",
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-border/40">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663389251174/VmVDhHe7bCzbKconZQSYkA/apexai-team-collaboration-gvs8hjTFkLjBxqpGdobgZJ.webp"
                alt="Team collaborating on ApexAI dashboard"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Platform Dashboard Section */}
      <section className="py-20 md:py-32 bg-card/30 border-y border-border/40">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
            Enterprise-Grade Platform
          </h2>

          <div className="rounded-lg overflow-hidden border border-border/40 mb-12">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663389251174/VmVDhHe7bCzbKconZQSYkA/apexai-platform-dashboard-QVNcRjDL4h7ZB4GfdbDu8T.webp"
              alt="ApexAI platform dashboard interface"
              className="w-full h-auto"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "Real-Time Analytics",
                description: "Live dashboards with call volume, conversion rates, and revenue metrics.",
              },
              {
                icon: Zap,
                title: "Instant Integrations",
                description: "Connect to Salesforce, HubSpot, Google Calendar, Twilio, and more.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Share insights, manage campaigns, and optimize performance together.",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="p-6 bg-card/50 border-border/40">
                  <Icon className="w-8 h-8 text-emerald-400 mb-4" />
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
            Built for Every Industry
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { industry: "Solar", description: "Qualify homeowners for solar savings" },
              { industry: "HVAC", description: "Book service calls and estimates" },
              { industry: "Roofing", description: "Convert storm leads into estimates" },
              { industry: "Real Estate", description: "Qualify buyers and sellers instantly" },
              { industry: "Insurance", description: "Book consultations and handle renewals" },
              { industry: "Spanish", description: "Full conversations en Español" },
            ].map((item, idx) => (
              <Card key={idx} className="p-6 bg-card/50 border-border/40 hover:border-emerald-500/30 transition-all cursor-pointer">
                <h3 className="font-semibold text-white mb-2">{item.industry}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-20 md:py-32 bg-card/30 border-y border-border/40">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
            Enterprise-Grade Security & Compliance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { badge: "SOC 2", description: "Security controls aligned with enterprise standards" },
              { badge: "TCPA", description: "Built-in compliance for outbound campaigns" },
              { badge: "99.9%", description: "Uptime with redundant cloud infrastructure" },
              { badge: "Human", description: "Seamless handoff to live agents anytime" },
            ].map((item, idx) => (
              <Card key={idx} className="p-6 bg-card/50 border-border/40 text-center">
                <p className="text-2xl font-bold text-emerald-400 mb-2">{item.badge}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-t border-border/40">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Revenue Operation?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of high-growth teams already using ApexAI to capture every call and close more deals.
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
