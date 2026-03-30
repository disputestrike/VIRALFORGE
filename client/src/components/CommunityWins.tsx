import { Zap, TrendingUp, Calendar, DollarSign } from "lucide-react";

const D2 = "#141820";
const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const BLUE_LIGHT = "#60a5fa";
const DIM2 = "rgba(255,255,255,0.4)";
const DIM3 = "rgba(255,255,255,0.08)";

export default function CommunityWins() {
  const wins = [
    { icon: Calendar, text: "26 appointments booked today", user: "Sarah K.", industry: "Solar" },
    { icon: DollarSign, text: "Just hit $147K revenue this week", user: "Marcus T.", industry: "HVAC" },
    { icon: TrendingUp, text: "4x increase in pipeline value", user: "James R.", industry: "Roofing" },
    { icon: Calendar, text: "Calendar booked 3 weeks out", user: "Elena M.", industry: "Insurance" },
    { icon: Zap, text: "Can't keep up with the appointments", user: "David P.", industry: "Solar" },
    { icon: DollarSign, text: "$890K in qualified leads, 30 days", user: "Lisa W.", industry: "Real Estate" },
    { icon: TrendingUp, text: "First listing signed in under 2 weeks", user: "Parm M.", industry: "Real Estate" },
    { icon: Calendar, text: "12 solid appointments in first week", user: "John T.", industry: "Roofing" },
  ];

  return (
    <section className="py-20 px-6" style={{ backgroundColor: D2, borderTop: `1px solid ${DIM3}` }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-3 text-white">What Our Customers Are Saying</h2>
          <p className="text-lg" style={{ color: DIM2 }}>Real wins from real ApexAI customers happening right now</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {wins.map((win, i) => {
            const Icon = win.icon;
            return (
              <div key={i} className="p-5 rounded-xl transition-all"
                style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${BLUE}20` }}>
                  <Icon className="w-4 h-4" style={{ color: BLUE_LIGHT }} />
                </div>
                <p className="font-semibold text-white mb-3 text-sm leading-snug">{win.text}</p>
                <p className="text-xs" style={{ color: DIM2 }}>— {win.user}</p>
                <p className="text-xs mt-1" style={{ color: `${BLUE_LIGHT}80` }}>{win.industry}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block px-8 py-5 rounded-xl"
            style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
            <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: DIM2 }}>
              STRAIGHT FROM OUR CUSTOMERS
            </p>
            <p className="text-base font-bold text-white">
              Unfiltered. Unedited. Real results from ApexAI customers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
