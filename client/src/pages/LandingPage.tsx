import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MessageSquare,
  Mail,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Zap,
  BarChart3,
  Clock,
  Bot,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="w-full bg-white">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">ApexAI</div>
          <div className="hidden md:flex gap-8 items-center">
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600">How It Works</a>
            <a href="#pricing" className="text-gray-700 hover:text-blue-600">Pricing</a>
            <a href="#contact" className="text-gray-700 hover:text-blue-600">Contact</a>
            <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-blue-100 text-blue-700 mb-6">AI Sales Automation</Badge>
            
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Your AI Sales Team.<br/>
              <span className="text-blue-600">Working While You Sleep.</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Lead ingestion. AI qualification. Multi-channel outreach. Appointment booking.
              <br/>
              <span className="font-semibold">Fully automated. Any industry. Proven results.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Claim Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-gray-300">
                Watch Demo Video
              </Button>
            </div>

            {/* Hero Stats */}
            <div className="mt-12 pt-12 border-t border-gray-200">
              <p className="text-gray-600 mb-6">Trusted by sales teams across industries</p>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                  <p className="text-gray-600 text-sm">Leads Processed</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">47%</div>
                  <p className="text-gray-600 text-sm">Avg Response Rate</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">24/7</div>
                  <p className="text-gray-600 text-sm">Automated Outreach</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How ApexAI Works</h2>
            <p className="text-xl text-gray-600">Four simple steps to automate your sales</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Leads</h3>
              <p className="text-gray-600">
                Import from Google Ads, Facebook, Angi, or upload CSV. We handle any lead source.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-lg">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Configure Templates</h3>
              <p className="text-gray-600">
                Answer 5 questions about your business. We generate your sales scripts, SMS, email templates.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Qualifies & Contacts</h3>
              <p className="text-gray-600">
                Our AI scores leads, makes calls, sends SMS/email, and books appointments 24/7.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-lg">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Results</h3>
              <p className="text-gray-600">
                Watch your dashboard. See appointments booked, response rates, and ROI in real-time.
              </p>
            </div>
          </div>

          {/* Architecture Diagram */}
          <div className="mt-16 bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">ApexAI Architecture</h3>
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <div className="text-center text-gray-600">
                <div className="mb-4 font-mono text-sm">
                  Lead Sources (Google Ads, Facebook, Angi, CSV)
                  <br/>
                  ↓
                  <br/>
                  <span className="text-blue-600 font-bold">Lead Ingestion & Qualification</span>
                  <br/>
                  ↓
                  <br/>
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded mx-2">Voice AI</span>
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded mx-2">SMS</span>
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded mx-2">Email</span>
                  <br/>
                  ↓
                  <br/>
                  <span className="text-blue-600 font-bold">Appointment Booking</span>
                  <br/>
                  ↓
                  <br/>
                  Calendar Integration
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-12">Powerful Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <Phone className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Voice AI Calls</h3>
                <p className="text-gray-600">Human-sounding AI makes calls, qualifies leads, books appointments 24/7.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <MessageSquare className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">SMS Automation</h3>
                <p className="text-gray-600">Personalized SMS sequences with intelligent follow-up logic.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Mail className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Email Campaigns</h3>
                <p className="text-gray-600">Multi-step email sequences with dynamic personalization.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <BarChart3 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Real-Time Analytics</h3>
                <p className="text-gray-600">Live dashboards tracking leads, calls, appointments, and ROI.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">24/7 Automation</h3>
                <p className="text-gray-600">AI works while you sleep. Leads contacted instantly, anytime.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Zap className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Smart Integration</h3>
                <p className="text-gray-600">Connects to Google Ads, Facebook, Angi, calendars, and more.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple Linear Pricing</h2>
            <p className="text-xl text-gray-600">$249 per 50 leads per month. Scale as you grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Starter */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Starter</h3>
              <p className="text-gray-600 text-sm mb-4">50 leads/month</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">$249</span>
                <span className="text-gray-600">/mo</span>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mb-4">Choose Plan</Button>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  AI qualification
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Voice + SMS + Email
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Dashboard
                </li>
              </ul>
            </div>

            {/* Growth */}
            <div className="bg-white rounded-lg p-6 border border-blue-600 ring-1 ring-blue-100">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-2 w-fit">Popular</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Growth</h3>
              <p className="text-gray-600 text-sm mb-4">100 leads/month</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">$498</span>
                <span className="text-gray-600">/mo</span>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mb-4">Choose Plan</Button>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Everything in Starter
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Priority support
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Advanced analytics
                </li>
              </ul>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Pro</h3>
              <p className="text-gray-600 text-sm mb-4">250 leads/month</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">$1,245</span>
                <span className="text-gray-600">/mo</span>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mb-4">Choose Plan</Button>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Everything in Growth
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Custom integrations
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Dedicated onboarding
                </li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 text-sm mb-4">500 leads/month</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">$2,490</span>
                <span className="text-gray-600">/mo</span>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mb-4">Choose Plan</Button>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Everything in Pro
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  API access
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Account manager
                </li>
              </ul>
            </div>

            {/* Custom */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Custom</h3>
              <p className="text-gray-600 text-sm mb-4">1,000+ leads/month</p>
              <div className="mb-6">
                <span className="text-2xl font-bold text-gray-900">Let's Talk</span>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mb-4">Contact Sales</Button>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Custom volume pricing
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Commission model option
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  White-label available
                </li>
              </ul>
            </div>
          </div>

          <p className="text-center text-gray-600 mt-8">
            Need a custom volume? Contact our sales team for commission-based pricing options.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Automate Your Sales?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Button size="lg" className="bg-white hover:bg-gray-100 text-blue-600 font-bold">
            Claim Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">ApexAI</h3>
            <p className="text-gray-400">Your AI sales team. Working while you sleep.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Features</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="#" className="hover:text-white">How It Works</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">About</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Privacy</a></li>
              <li><a href="#" className="hover:text-white">Terms</a></li>
              <li><a href="#" className="hover:text-white">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2026 ApexAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
