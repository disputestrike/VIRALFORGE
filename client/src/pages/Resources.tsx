import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";

const CASE_STUDIES = [
  {
    company: "RoofRight",
    industry: "Roofing",
    location: "Dallas, TX",
    quote: "200+ appointments, 160 contracts, $2M revenue in two weeks.",
    metrics: [
      { label: "Response Rate", before: "5%", after: "47%" },
      { label: "Conversion Rate", before: "12%", after: "38%" },
      { label: "Revenue Impact", before: "—", after: "$2M/2 weeks" },
    ],
  },
  {
    company: "Solar Pro",
    industry: "Solar",
    location: "Phoenix, AZ",
    quote: "ApexAI handles 80% of our inbound leads automatically. Our team focuses on closing deals.",
    metrics: [
      { label: "Lead Volume", before: "50/day", after: "150/day" },
      { label: "Contact Rate", before: "30%", after: "85%" },
      { label: "Booking Rate", before: "20%", after: "65%" },
    ],
  },
  {
    company: "HVAC Masters",
    industry: "HVAC",
    location: "Houston, TX",
    quote: "We've cut our missed calls to zero. Every customer gets an immediate response.",
    metrics: [
      { label: "Missed Calls", before: "40%", after: "0%" },
      { label: "Avg Response Time", before: "4 hours", after: "&lt; 1 second" },
      { label: "Customer Satisfaction", before: "72%", after: "94%" },
    ],
  },
];

const FAQS = [
  {
    q: "Is ApexAI a chatbot?",
    a: "No. ApexAI is a high-performance voice communication platform designed for real-time, natural phone conversations. Unlike chatbots, it specializes in complex, dynamic interactions that drive sales and service outcomes.",
  },
  {
    q: "How fast can we go live?",
    a: "ApexAI can be configured and live in under 5 minutes. Our intuitive setup process requires no credit card for initial activation, allowing you to experience the benefits immediately.",
  },
  {
    q: "Does it work with my CRM or calendar?",
    a: "Yes, ApexAI integrates seamlessly with popular CRM systems (Salesforce, HubSpot, Zoho) and calendar platforms (Google Calendar, Outlook, Calendly) for automated updates and appointment bookings.",
  },
  {
    q: "What about TCPA and compliance?",
    a: "ApexAI is built with TCPA awareness, providing tools and controls to help you manage consent and ensure your outbound campaigns remain compliant with regulatory standards.",
  },
  {
    q: "Can callers reach a human?",
    a: "Absolutely. ApexAI is designed for intelligent human handoff. At any point in a conversation, the AI can seamlessly transfer the caller to a live agent, providing the agent with the full conversation transcript.",
  },
  {
    q: "Which industries do you support?",
    a: "We support a wide range of industries, including Solar, HVAC, Roofing, Real Estate, Insurance, and more. Our customizable Industry Packs allow for tailored solutions to meet specific sector needs.",
  },
  {
    q: "What languages does ApexAI support?",
    a: "ApexAI supports 12+ languages including English, Spanish, French, German, Portuguese, and more, enabling global reach and diverse customer engagement.",
  },
  {
    q: "How do you handle data security?",
    a: "We maintain SOC 2 Type II compliance, end-to-end encryption for all conversation data, and redundant cloud infrastructure with continuous monitoring and failover.",
  },
];

export default function Resources() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-emerald-500/10 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Resources & Support
            </h1>
            <p className="text-lg text-muted-foreground">
              Learn how leading teams are using ApexAI to transform their revenue operations.
            </p>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-20 md:py-32">
        <div className="container">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Case Studies: Real Results
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CASE_STUDIES.map((study, idx) => (
              <Card key={idx} className="p-8 bg-card/50 border-border/40">
                <div className="mb-6">
                  <p className="text-sm text-emerald-400 font-semibold mb-1">{study.industry}</p>
                  <h3 className="text-xl font-bold text-white mb-1">{study.company}</h3>
                  <p className="text-xs text-muted-foreground">{study.location}</p>
                </div>

                <blockquote className="mb-6 p-4 border-l-2 border-emerald-500/50 bg-background/50 rounded">
                  <p className="text-sm italic text-muted-foreground">"{study.quote}"</p>
                </blockquote>

                <div className="space-y-4">
                  {study.metrics.map((metric, midx) => (
                    <div key={midx} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground">{metric.before}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs font-semibold text-emerald-400">{metric.after}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-32 bg-card/30 border-y border-border/40">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <Card
                key={idx}
                className="p-6 bg-card/50 border-border/40 cursor-pointer hover:border-emerald-500/30 transition-colors"
                onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{faq.q}</h3>
                  <ChevronDown
                    className={`w-5 h-5 text-emerald-400 transition-transform ${
                      expandedFAQ === idx ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {expandedFAQ === idx && (
                  <p className="text-muted-foreground text-sm mt-4">{faq.a}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section className="py-20 md:py-32">
        <div className="container">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Documentation & Guides
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: "Getting Started Guide",
                description: "Step-by-step instructions to set up your first AI voice agent in minutes.",
              },
              {
                title: "Industry Best Practices",
                description: "Learn how leading teams in your industry are using ApexAI to maximize revenue.",
              },
              {
                title: "Integration Guide",
                description: "Connect ApexAI to your CRM, calendar, and other business tools.",
              },
              {
                title: "Compliance & Security",
                description: "Understand our SOC 2, TCPA, and data security practices.",
              },
              {
                title: "API Documentation",
                description: "Build custom integrations and workflows with our REST API.",
              },
              {
                title: "Support & Troubleshooting",
                description: "Find answers to common issues and get help from our support team.",
              },
            ].map((doc, idx) => (
              <Card key={idx} className="p-6 bg-card/50 border-border/40 hover:border-emerald-500/30 transition-colors">
                <h3 className="font-semibold text-white mb-2">{doc.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{doc.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-400"
                >
                  Read More <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="py-20 md:py-32 bg-card/30 border-t border-border/40">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Need Help?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Our support team is here to help you succeed. Reach out anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Contact Support
              </Button>
              <Button size="lg" variant="outline" className="border-emerald-500/30 hover:border-emerald-400">
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
