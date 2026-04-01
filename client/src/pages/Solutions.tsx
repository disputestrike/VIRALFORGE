import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sun, Thermometer, Home, Building2, Shield, Globe } from "lucide-react";

const INDUSTRIES = [
  {
    icon: Sun,
    title: "Solar",
    description: "Qualify homeowners for solar savings",
    sample: '"Hi! I\'m calling about your interest in going solar. Do you own your home?"',
    benefits: [
      "Instant lead qualification",
      "ROI calculations on the fly",
      "Direct appointment booking",
    ],
  },
  {
    icon: Thermometer,
    title: "HVAC",
    description: "Book service calls and estimates",
    sample: '"Hi! I saw you reached out about your HVAC system. Is this an emergency or routine maintenance?"',
    benefits: [
      "Emergency vs. routine triage",
      "Technician dispatch automation",
      "Service call scheduling",
    ],
  },
  {
    icon: Home,
    title: "Roofing",
    description: "Convert storm leads into estimates",
    sample: '"Hi! I\'m following up about storm damage in your area. Have you had your roof inspected recently?"',
    benefits: [
      "Storm lead follow-up",
      "Damage assessment qualification",
      "Estimate scheduling",
    ],
  },
  {
    icon: Building2,
    title: "Real Estate",
    description: "Qualify buyers and sellers instantly",
    sample: '"Hi! I\'m calling about the property you were interested in. Are you pre-approved for financing?"',
    benefits: [
      "Buyer pre-qualification",
      "Seller motivation assessment",
      "Property inquiry handling",
    ],
  },
  {
    icon: Shield,
    title: "Insurance",
    description: "Book consultations and handle renewals",
    sample: '"Hi! I\'m calling about your insurance quote request. Are you currently covered or shopping for new coverage?"',
    benefits: [
      "Quote request handling",
      "Renewal reminders",
      "Agent scheduling",
    ],
  },
  {
    icon: Globe,
    title: "Spanish",
    description: "Full conversations en Español",
    sample: '"¡Hola! Le llamo sobre su interés en paneles solares. ¿Es usted el propietario de su casa?"',
    benefits: [
      "Native Spanish fluency",
      "Cultural context awareness",
      "Bilingual lead capture",
    ],
  },
];

export default function Solutions() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-emerald-500/10 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Industry-Specific Solutions
            </h1>
            <p className="text-lg text-muted-foreground">
              Pre-configured scripts, qualification flows, and integrations tailored to your industry. Start in minutes, not months.
            </p>
          </div>
        </div>
      </section>

      {/* Industry Packs */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {INDUSTRIES.map((industry, idx) => {
              const Icon = industry.icon;
              return (
                <Card
                  key={idx}
                  className="p-8 bg-card/50 border-border/40 hover:border-emerald-500/30 transition-all hover:shadow-lg"
                >
                  <Icon className="w-8 h-8 text-emerald-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{industry.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{industry.description}</p>

                  <div className="mb-6 p-4 bg-background/50 rounded-lg border border-border/40">
                    <p className="text-xs text-muted-foreground italic">
                      Sample: {industry.sample}
                    </p>
                  </div>

                  <div className="space-y-2 mb-6">
                    {industry.benefits.map((benefit, bidx) => (
                      <div key={bidx} className="flex gap-2">
                        <span className="text-emerald-400 text-sm">✓</span>
                        <span className="text-sm text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-400"
                  >
                    Play Sample
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Customization */}
      <section className="py-20 md:py-32 bg-card/30 border-y border-border/40">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Fully Customizable
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12">
              Every industry pack is a starting point. Customize scripts, qualification flows, and integrations to match your exact business process.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Custom Scripts",
                  description: "Write your own dialogue or let our team help you craft the perfect script.",
                },
                {
                  title: "Qualification Logic",
                  description: "Define your own qualification criteria and scoring rules.",
                },
                {
                  title: "CRM Integration",
                  description: "Connect to Salesforce, HubSpot, Zoho, or any custom system.",
                },
              ].map((item, idx) => (
                <Card key={idx} className="p-6 bg-card/50 border-border/40">
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Case Study */}
      <section className="py-20 md:py-32">
        <div className="container">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Real Results from Real Teams
          </h2>

          <Card className="p-12 bg-card/50 border-border/40 max-w-2xl mx-auto">
            <div className="mb-6">
              <p className="text-2xl font-bold text-emerald-400 mb-2">
                "200+ appointments, 160 contracts, $2M revenue in two weeks."
              </p>
              <p className="text-muted-foreground">
                Moises R. · Roofing — Dallas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground mb-1">BEFORE</p>
                <p className="text-2xl font-bold text-white">5%</p>
                <p className="text-sm text-muted-foreground">Response rate (manual)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">AFTER</p>
                <p className="text-2xl font-bold text-emerald-400">47%</p>
                <p className="text-sm text-muted-foreground">Response rate (ApexAI)</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ROI Calculator CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-t border-border/40">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            See Your Revenue Potential
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Use our interactive ROI calculator to model the impact of ApexAI on your specific business metrics.
          </p>
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Try ROI Calculator <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
