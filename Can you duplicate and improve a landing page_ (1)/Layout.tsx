import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Phone, Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="text-white">ApexAI</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Platform Dropdown */}
            <div className="relative group">
              <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white flex items-center gap-1 transition-colors">
                Platform
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="bg-card border border-border/40 rounded-lg shadow-lg p-2 w-48">
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Inbound AI</a>
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Outbound AI</a>
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Booking & SMS</a>
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Analytics</a>
                </div>
              </div>
            </div>

            {/* Solutions Dropdown */}
            <div className="relative group">
              <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white flex items-center gap-1 transition-colors">
                Solutions
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="bg-card border border-border/40 rounded-lg shadow-lg p-2 w-48">
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Solar</a>
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">HVAC</a>
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Roofing</a>
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Real Estate</a>
                  <a href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Insurance</a>
                </div>
              </div>
            </div>

            <Link href="/resources">
              <a className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                Resources
              </a>
            </Link>
            <Link href="/pricing">
              <a className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                Pricing
              </a>
            </Link>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Get Started Free
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-card">
            <nav className="container py-4 flex flex-col gap-4">
              <Link href="/platform">
                <a className="text-sm font-medium hover:text-emerald-400 transition-colors">
                  Platform
                </a>
              </Link>
              <Link href="/solutions">
                <a className="text-sm font-medium hover:text-emerald-400 transition-colors">
                  Solutions
                </a>
              </Link>
              <Link href="/resources">
                <a className="text-sm font-medium hover:text-emerald-400 transition-colors">
                  Resources
                </a>
              </Link>
              <Link href="/pricing">
                <a className="text-sm font-medium hover:text-emerald-400 transition-colors">
                  Pricing
                </a>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-400"
              >
                Get Started Free
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/50 text-muted-foreground">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">ApexAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The unified voice communication solution for high-growth teams.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Platform
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Live Demo
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Dashboard
                  </a>
                </li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Solutions</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Industry Packs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    ROI Calculator
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Case Studies
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Starlight Global. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Serving teams nationwide — Dallas · Phoenix · Tampa · Houston · Atlanta · Los Angeles · New York · Miami
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
