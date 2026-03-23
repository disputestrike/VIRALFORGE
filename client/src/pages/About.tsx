import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "wouter";

export default function About() {
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-black mb-6">We're Building the Future of Sales Automation</h1>
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
            ApexAI started with a simple observation: Sales teams waste 80% of their time on tasks a machine can handle better.
            We're eliminating that waste.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div>
              <h3 className="font-bold text-2xl text-primary mb-2">Our Mission</h3>
              <p className="text-muted-foreground">
                Make world-class AI sales automation accessible to every business, regardless of size or industry.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-2xl text-primary mb-2">Our Vision</h3>
              <p className="text-muted-foreground">
                A world where sales teams focus on closing deals, not dialing phones. Where AI handles the noise, humans close the deals.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-2xl text-primary mb-2">Our Values</h3>
              <p className="text-muted-foreground">
                Transparency. Speed. Results. We measure success by your success: more appointments, more revenue, more freedom.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="text-3xl font-bold mb-8">The Team</h2>
            <p className="text-muted-foreground mb-12">
              ApexAI is built by AI engineers, sales ops experts, and startup founders who've been in the trenches.
              We understand the problems we're solving because we've lived them.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: "Ben Adayehi", role: "CEO & Founder", bio: "15+ years building AI platforms. Previously led sales at 3 startups to exit." },
                { name: "Engineering Team", role: "AI & Infrastructure", bio: "Ex-Google, Ex-OpenAI engineers. Built systems that process 100M+ leads per month." },
              ].map((member) => (
                <div key={member.name} className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-bold text-lg mb-1">{member.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 pt-12 border-t border-border">
            <h2 className="text-3xl font-bold mb-6">Why ApexAI?</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">1. We've Built This Before</h3>
                <p className="text-muted-foreground">
                  Our team has shipped 50+ AI products. We know what works and what doesn't. ApexAI is the culmination of everything we learned.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">2. We're Obsessed With Results</h3>
                <p className="text-muted-foreground">
                  We don't measure success by features shipped. We measure it by appointments booked and revenue generated for our customers.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">3. We're In It For The Long Haul</h3>
                <p className="text-muted-foreground">
                  ApexAI isn't a side project. It's our entire focus. We're investing $5M+ to make this the default platform for outbound sales automation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/20 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to See ApexAI in Action?</h2>
          <p className="text-muted-foreground mb-8">
            Join 100+ companies using ApexAI to automate outreach and close more deals.
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
