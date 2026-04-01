import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Phone, MessageSquare, Calendar, BarChart3, Zap, Lock, Headphones, ShieldAlert } from "lucide-react";

export default function Platform() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-emerald-500/10 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              The Unified Voice Platform
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Everything you need to manage inbound calls, outbound campaigns, booking, and SMS follow-up in one integrated platform.
            </p>
          </div>
        </div>
      </section>

      {/* Inbound AI */}
      <section className="py-20 md:py-32 border-b border-border/40">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Inbound AI</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Answer every call. Capture every lead. ApexAI picks up in under a second, qualifies the caller, and books the appointment — without a human ever picking up the phone.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Instant pickup — zero calls to voicemail",
                  "Real-time lead qualification",
                  "Books directly to your calendar",
                  "Auto SMS confirmation sent",
                  "Full transcript and recording",
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Learn More <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="bg-card/50 border border-border/40 rounded-2xl p-8 h-96 flex items-center justify-center">
              <div className="text-center">
                <Phone className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Live Call Visualization</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outbound AI */}
      <section className="py-20 md:py-32 border-b border-border/40 bg-card/30">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <h2 className="text-3xl font-bold text-white mb-6">Outbound AI</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Scale your reach without scaling your team. Run high-volume outbound campaigns with intelligent pacing, lead prioritization, and real-time analytics.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Campaign automation at scale",
                  "Intelligent lead prioritization",
                  "Proactive engagement workflows",
                  "TCPA-aware compliance controls",
                  "Real-time performance metrics",
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Learn More <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="lg:order-1 bg-card/50 border border-border/40 rounded-2xl p-8 h-96 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Campaign Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking & SMS */}
      <section className="py-20 md:py-32 border-b border-border/40">
        <div className="container">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Booking & SMS Follow-Up
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 bg-card/50 border-border/40">
              <Calendar className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Seamless Booking</h3>
              <p className="text-muted-foreground mb-4">
                Direct integration with Google Calendar, Outlook, and Calendly. Appointments are booked in real-time while you're on the call.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Real-time calendar sync</li>
                <li>✓ Availability-aware scheduling</li>
                <li>✓ Automatic conflict detection</li>
              </ul>
            </Card>
            <Card className="p-8 bg-card/50 border-border/40">
              <MessageSquare className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">SMS Follow-Up</h3>
              <p className="text-muted-foreground mb-4">
                Automatic SMS confirmations, reminders, and follow-up sequences. Keep leads engaged and reduce no-shows.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Instant confirmations</li>
                <li>✓ Appointment reminders</li>
                <li>✓ Custom follow-up sequences</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="py-20 md:py-32 bg-card/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Deep Analytics & Insights
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12">
              Move beyond basic call logs. Access AI-driven insights that help you optimize your revenue operation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: BarChart3,
                  title: "Real-Time Metrics",
                  description: "Live dashboards showing calls, conversions, and revenue impact.",
                },
                {
                  icon: Zap,
                  title: "Sentiment Analysis",
                  description: "Understand market response through aggregate call sentiment.",
                },
                {
                  icon: Phone,
                  title: "Conversion Funnel",
                  description: "See exactly where leads are dropping off and optimize.",
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
        </div>
      </section>

      {/* Enterprise Trust */}
      <section className="py-20 md:py-32 border-t border-border/40">
        <div className="container">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Enterprise-Grade Reliability
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Lock,
                title: "SOC 2 Ready",
                description: "Security controls aligned with enterprise standards.",
              },
              {
                icon: ShieldAlert,
                title: "TCPA-Aware",
                description: "Built-in compliance controls for outbound campaigns.",
              },
              {
                icon: Zap,
                title: "99.9% Uptime",
                description: "Redundant cloud infrastructure with failover.",
              },
              {
                icon: Headphones,
                title: "Human Handoff",
                description: "Seamless transfer to live agents anytime.",
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

      {/* CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-t border-border/40">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Upgrade Your Voice Channel?
          </h2>
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  );
}
