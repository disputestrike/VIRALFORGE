import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  Star,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Clock,
  Target,
  Headphones,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import LiveTicker from "@/components/LiveTicker";
import ROICalculator from "@/components/ROICalculator";
import RiskReversal from "@/components/RiskReversal";
import CommunityWins from "@/components/CommunityWins";

const features = [
  { icon: Phone, title: "Voice AI Calls", desc: "Human-sounding AI that books appointments on autopilot across any industry." },
  { icon: MessageSquare, title: "SMS Outreach", desc: "Personalized SMS campaigns with intelligent follow-up sequences." },
  { icon: Mail, title: "Email Automation", desc: "Multi-step email sequences with dynamic personalization at scale." },
  { icon: Share2, title: "Lead Scoring", desc: "AI qualifies leads before contact. Focus only on buyers." },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Live dashboards tracking response rate, show rate, and ROI." },
  { icon: Clock, title: "24/7 Automation", desc: "Your AI works while you sleep. Leads contacted instantly." },
];

const staticTestimonials = [
  { name: "Moises R.", industry: "Roofing", result: "200+ appointments, 160 contracts, $2M in two weeks", before: "Manual cold calling, 5% response rate", after: "AI-driven outreach, 47% response rate" },
  { name: "Sarah K.", industry: "Solar", result: "312 qualified leads in 30 days, $890K pipeline", before: "3 SDRs, 40 calls/day", after: "AI handles 500+ touchpoints daily" },
  { name: "Marcus T.", industry: "HVAC", result: "89 booked appointments, $240K closed in 6 weeks", before: "Struggling to fill calendar", after: "Calendar fully booked 3 weeks out" },
];

const pricingTiers = [
  { name: "Starter", leads: 50, price: 249, desc: "Perfect for testing" },
  { name: "Growth", leads: 100, price: 498, desc: "Scaling your campaigns", popular: true },
  { name: "Pro", leads: 250, price: 1245, desc: "Mid-market volume" },
  { name: "Enterprise", leads: 500, price: 2490, desc: "Full-scale operations" },
];

export default function LandingPageFull() {
  const { isAuthenticated } = useAuth();
  const { data: testimonials } = trpc.testimonials.list.useQuery({ featuredOnly: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayTestimonials = testimonials && testimonials.length > 0
    ? testimonials.slice(0, 3)
    : staticTestimonials;

  const handleGetStarted = () => {
    window.location.href = isAuthenticated ? "/dashboard" : getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">ApexAI</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#results" className="hover:text-foreground transition-colors">Results</a>
            <a href="#case-studies" className="hover:text-foreground transition-colors">Case Studies</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleGetStarted}>
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card p-4 space-y-3">
            <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#results" className="block text-sm text-muted-foreground hover:text-foreground">Results</a>
            <a href="#case-studies" className="block text-sm text-muted-foreground hover:text-foreground">Case Studies</a>
            <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="#about" className="block text-sm text-muted-foreground hover:text-foreground">About</a>
            <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground">Contact</a>
          </div>
        )}
      </header>

      {/* SECTION 1: Hero */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5 px-4 py-1.5 text-xs font-medium">
            <Zap className="w-3 h-3 mr-1.5" />
            AI-Powered Sales Automation
          </Badge>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
            Stop Chasing Leads.
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Start Closing Deals.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered outbound calling, SMS, email, and social outreach that books appointments on autopilot — for any industry.
            <span className="text-foreground font-semibold"> We handle everything. You just close deals.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button size="lg" className="text-base px-8 h-12" onClick={handleGetStarted}>
              Launch Your Campaign
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-12">
              Watch Demo (Coming Soon)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Expert setup day one · 30-day dedicated support · $249/month to start
          </p>

          {/* Hero Image - AI Sales Agent */}
          <div className="mt-16 p-0 rounded-xl border border-primary/20 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop" 
              alt="AI Sales Dashboard"
              className="w-full h-auto object-cover rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* SECTION 1.5: LIVE TICKER */}
      <LiveTicker />

      {/* SECTION 2: Performance Metrics */}
      <section id="results" className="py-16 px-6 border-y border-border bg-card/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-10 uppercase tracking-widest font-medium">Platform Performance Metrics</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Avg Response Rate", value: "47%", color: "text-blue-400", desc: "vs 5% industry avg" },
              { label: "Avg Schedule Rate", value: "68%", color: "text-green-400", desc: "of all responses" },
              { label: "Avg Show Rate", value: "82%", color: "text-orange-400", desc: "appointment attendance" },
              { label: "Avg Increase In Sales", value: "312%", color: "text-purple-400", desc: "within 90 days" },
            ].map((m) => (
              <div key={m.label} className="text-center p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                <div className={`text-4xl font-black ${m.color} mb-2`}>{m.value}</div>
                <div className="text-sm font-semibold text-foreground mb-1">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Features */}
      <section id="features" className="py-20 px-6 bg-card/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything in One Native Platform</h2>
            <p className="text-muted-foreground text-lg">No integrations. No Zapier. No outside tools. Pure, native AI automation.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/20 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=600&fit=crop" 
                alt="ApexAI Dashboard"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Competitive Advantage */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Other tools connect 100+ integrations.</h2>
              <p className="text-4xl font-black text-primary mb-12">ApexAI is your entire stack.</p>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: "Voice AI Calls", desc: "Human-like, no voicemail bombing" },
                  { title: "Smart Lead Qualification", desc: "AI pre-scores every lead" },
                  { title: "Multi-Channel Outreach", desc: "Voice + SMS + Email in one platform" },
                  { title: "30-Day Done-For-You", desc: "We set it up, optimize it, hand it off" },
                  { title: "Real-Time Analytics", desc: "See every metric live" },
                  { title: "Expert Support", desc: "Dedicated team for 30 days" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border text-left hover:border-primary/30 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-adf4ee868993?w=600&h=600&fit=crop" 
                alt="Integration Ecosystem"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Case Studies */}
      <section id="case-studies" className="py-20 px-6 bg-card/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Real Results, Real Industries</h2>
            <p className="text-muted-foreground text-lg">Every result follows the same pattern: specific numbers, before and after.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-12">
            <div className="rounded-xl border border-primary/20 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=600&fit=crop" 
                alt="Sales Growth Metrics"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {displayTestimonials.map((t: any, i: number) => (
                <div key={i} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  <p className="font-bold text-primary text-lg mb-4 leading-relaxed">
                    {t.resultValue ?? t.result}
                  </p>

                  <div className="space-y-3 mb-6 p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="text-xs">
                      <span className="text-red-400 font-semibold">Before: </span>
                      <span className="text-muted-foreground">{t.beforeMetric ?? t.before}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-green-400 font-semibold">After: </span>
                      <span className="text-muted-foreground">{t.afterMetric ?? t.after}</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-semibold">{t.clientName ?? t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.industry} Industry</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Not Just Software. A Done-For-You System.</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A dedicated specialist sets up your entire system on day one, optimizes it for 30 days, and hands off a fully working machine.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="grid grid-cols-1 gap-6">
              {[
                { day: "Day 1", title: "Expert Setup", desc: "WE configure everything: campaigns, templates, targeting, and AI scripts. Zero work on your end." },
                { day: "Days 2–14", title: "Sales Optimization", desc: "WE analyze data, refine messaging, optimize conversions. YOU focus on closing." },
                { day: "Days 15–30", title: "Scale & Handoff", desc: "System running at peak performance. WE hand you a fully built, proven machine. YOU just scale." },
              ].map((step) => (
                <div key={step.day} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                  <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
                    {step.day}
                  </Badge>
                  <h3 className="font-bold text-lg mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/20 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1516321554475-5fefbe802b06?w=600&h=600&fit=crop" 
                alt="Onboarding Process"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Pricing */}
      <section id="pricing" className="py-20 px-6 bg-card/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple, Linear Pricing</h2>
            <p className="text-muted-foreground text-lg">$249 per 50 leads per month. Fully managed. No surprises.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative p-6 rounded-xl border transition-all ${
                  tier.popular
                    ? "border-primary bg-primary/5 ring-2 ring-primary scale-105"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <h3 className="font-bold text-lg mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{tier.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black">${tier.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 font-medium">{tier.leads} leads/month</p>
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  onClick={handleGetStarted}
                >
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border p-8 rounded-xl">
            <h3 className="text-xl font-bold mb-6">All plans include:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "✓ Fully managed setup & optimization",
                "AI voice calls (human-sounding)",
                "SMS outreach & automation",
                "Email automation",
                "Lead qualification engine",
                "Real-time analytics",
                "24/7 automation",
                "30-day dedicated support",
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7.5: ROI CALCULATOR */}
      <ROICalculator />

      {/* SECTION 8: About */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="rounded-xl border border-primary/20 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=600&fit=crop" 
                alt="ApexAI Team"
                className="w-full h-auto object-cover"
              />
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Built by Sales People. For Sales People.</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                ApexAI was built by founders who've been in the trenches. We've cold called. We've managed SDRs. We know the grind.
                That's why ApexAI eliminates 80% of it.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Our team has shipped 50+ AI products. We know what works. ApexAI is the culmination of everything we learned.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We're not a side project. We're investing $5M+ to make ApexAI the default platform for outbound sales automation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-bold text-lg mb-2 text-primary">Our Mission</h3>
              <p className="text-sm text-muted-foreground">
                Make world-class AI sales automation accessible to every business, regardless of size or industry.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-bold text-lg mb-2 text-primary">Our Vision</h3>
              <p className="text-sm text-muted-foreground">
                A world where sales teams focus on closing deals, not dialing phones. AI handles the noise. Humans close the deals.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-bold text-lg mb-2 text-primary">Our Values</h3>
              <p className="text-sm text-muted-foreground">
                Transparency. Speed. Results. We measure success by your success: more appointments, more revenue, more freedom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8.5: RISK REVERSAL */}
      <RiskReversal />

      {/* SECTION 8.75: COMMUNITY WINS */}
      <CommunityWins />

      {/* SECTION 9: Contact */}
      <section id="contact" className="py-20 px-6 bg-card/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Questions? We're Here to Help.</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Our team is available for calls, emails, and detailed consultations. Let's talk about your specific use case.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-xl bg-card border border-border text-center">
              <Headphones className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Phone Support</h3>
              <p className="text-sm text-muted-foreground mb-4">Available 9am–6pm EST</p>
              <p className="text-sm font-mono text-primary">Coming Soon</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border text-center">
              <Mail className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-4">Within 24 hours</p>
              <a href="mailto:support@apexai.io" className="text-sm font-mono text-primary hover:underline">
                support@apexai.io
              </a>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border text-center">
              <Bot className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">On this website</p>
              <p className="text-sm font-mono text-primary">Chat Widget</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20">
            <h2 className="text-4xl font-black mb-4">Ready to Close More Deals?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join 100+ businesses using ApexAI to automate outreach and fill their calendars.
            </p>
            <Button size="lg" className="text-base px-10 h-12" onClick={handleGetStarted}>
              Start Your Campaign Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground mt-6">
              30-day free trial. No credit card required. Money-back guarantee.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="font-bold">ApexAI</span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI-powered sales automation for every industry.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><a href="#case-studies" className="hover:text-foreground">Case Studies</a></li>
                <li><a href="#" className="hover:text-foreground">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#contact" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-foreground">Security & Compliance</Link></li>
                <li><a href="mailto:legal@apexai.io" className="hover:text-foreground">DPA Request</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">✓ SOC 2 Type II</span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">✓ GDPR</span>
              <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">✓ TCPA</span>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 ApexAI. All rights reserved. Built by CrucibAI.</p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground">Twitter</a>
              <a href="#" className="hover:text-foreground">LinkedIn</a>
              <a href="#" className="hover:text-foreground">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
