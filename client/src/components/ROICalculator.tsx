import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const GREEN = "#34d399";
const AMBER = "#fbbf24";
const DIM2 = "rgba(255,255,255,0.5)";
const DIM3 = "rgba(255,255,255,0.1)";

export default function ROICalculator() {
  const [leadsPerDay, setLeadsPerDay] = useState(20);
  const [contactRate, setContactRate] = useState(30); // current %
  const [bookingRate, setBookingRate] = useState(25); // % of contacts
  const [closeRate, setCloseRate] = useState(20);    // % of bookings
  const [dealValue, setDealValue] = useState(5000);
  const [aiContactRate, setAiContactRate] = useState(70); // AI improved %

  // Current earnings
  const currentContacts = (leadsPerDay * contactRate) / 100;
  const currentBookings = (currentContacts * bookingRate) / 100;
  const currentSales = (currentBookings * closeRate) / 100;
  const currentDailyRevenue = currentSales * dealValue;

  // AI earnings
  const aiContacts = (leadsPerDay * aiContactRate) / 100;
  const aiBookings = (aiContacts * bookingRate) / 100;
  const aiSales = (aiBookings * closeRate) / 100;
  const aiDailyRevenue = aiSales * dealValue;

  // Gap
  const dailyGap = aiDailyRevenue - currentDailyRevenue;
  const monthlyGap = dailyGap * 30;
  const annualGap = dailyGap * 365;

  const apexCost = 299; // Growth plan
  const annualCost = apexCost * 12;
  const netAnnualProfit = annualGap - annualCost;
  const roi = annualCost > 0 ? Math.round((netAnnualProfit / annualCost) * 100) : 0;

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="w-full max-w-5xl mx-auto min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        {/* Inputs — min-w-0 prevents range labels from breaking layout */}
        <div className="space-y-7 p-6 sm:p-8 rounded-2xl min-w-0" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
          <h3 className="font-bold text-white text-lg tracking-tight">Your business today</h3>

          {[
            { label: `New leads per day`, suffix: `${leadsPerDay}`, min: 5, max: 200, val: leadsPerDay, set: setLeadsPerDay, unit: "" as const },
            { label: `Current contact rate`, suffix: `${contactRate}%`, min: 5, max: 80, val: contactRate, set: setContactRate, unit: "%" as const },
            { label: `Booking rate (of contacts)`, suffix: `${bookingRate}%`, min: 5, max: 70, val: bookingRate, set: setBookingRate, unit: "%" as const },
            { label: `Close rate (of bookings)`, suffix: `${closeRate}%`, min: 5, max: 70, val: closeRate, set: setCloseRate, unit: "%" as const },
          ].map(({ label, suffix, min, max, val, set, unit }) => (
            <div key={label} className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-sm font-bold tabular-nums" style={{ color: BLUE }}>{suffix}</p>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={val}
                onChange={e => set(Number(e.target.value))}
                className="w-full max-w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
                style={{ accentColor: BLUE }}
              />
              <p className="text-[11px] leading-snug" style={{ color: DIM2 }}>
                Adjust between {min}{unit} and {max}{unit}
              </p>
            </div>
          ))}

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Average deal value ($)</p>
            <input
              type="number"
              min={500}
              max={50000}
              step={500}
              value={dealValue}
              onChange={e => setDealValue(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-white"
              style={{ backgroundColor: "#0a0c12", border: `1px solid ${DIM3}`, outline: "none", fontSize: "16px" }}
            />
          </div>

          <div className="space-y-3 pt-2 border-t" style={{ borderColor: DIM3 }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: GREEN }}>With ApexAI — contact rate</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: GREEN }}>{aiContactRate}%</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: DIM2 }}>
              Typical range after automation: 60–80% (vs {contactRate}% today). Drag to model your scenario.
            </p>
            <input
              type="range"
              min={contactRate}
              max={95}
              value={aiContactRate}
              onChange={e => setAiContactRate(Number(e.target.value))}
              className="w-full max-w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
              style={{ accentColor: GREEN }}
            />
          </div>
        </div>

        {/* Results — softer accent than pure red/green walls */}
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 sm:p-5 rounded-xl" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
              <p className="text-[11px] mb-2 font-semibold uppercase tracking-wide" style={{ color: DIM2 }}>Without ApexAI</p>
              <p className="text-xl sm:text-2xl font-black text-white">${fmt(currentDailyRevenue)}</p>
              <p className="text-xs mt-0.5" style={{ color: DIM2 }}>daily revenue</p>
              <div className="mt-3 space-y-1 text-[11px] sm:text-xs leading-relaxed" style={{ color: DIM2 }}>
                <p>{currentContacts.toFixed(1)} contacts/day</p>
                <p>{currentBookings.toFixed(1)} bookings/day</p>
                <p>{currentSales.toFixed(2)} sales/day</p>
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-xl" style={{ backgroundColor: D3, border: `1px solid ${GREEN}35` }}>
              <p className="text-[11px] mb-2 font-semibold uppercase tracking-wide" style={{ color: GREEN }}>With ApexAI</p>
              <p className="text-xl sm:text-2xl font-black" style={{ color: GREEN }}>${fmt(aiDailyRevenue)}</p>
              <p className="text-xs mt-0.5" style={{ color: DIM2 }}>daily revenue</p>
              <div className="mt-3 space-y-1 text-[11px] sm:text-xs leading-relaxed" style={{ color: DIM2 }}>
                <p>{aiContacts.toFixed(1)} contacts/day</p>
                <p>{aiBookings.toFixed(1)} bookings/day</p>
                <p>{aiSales.toFixed(2)} sales/day</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-xl" style={{ backgroundColor: "rgba(251,191,36,0.08)", border: `1px solid ${AMBER}35` }}>
            <div className="flex items-start gap-2 mb-2">
              <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AMBER }} />
              <p className="text-sm font-bold leading-snug" style={{ color: AMBER }}>Estimated revenue left on the table (daily)</p>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white">${fmt(dailyGap)}<span className="text-lg font-bold text-white/60">/day</span></p>
            <p className="text-sm mt-2" style={{ color: DIM2 }}>
              ${fmt(monthlyGap)}/mo · ${fmt(annualGap)}/yr
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-xl" style={{ backgroundColor: `${GREEN}0d`, border: `1px solid ${GREEN}35` }}>
            <p className="text-[11px] mb-1 font-semibold uppercase tracking-wider" style={{ color: `${GREEN}cc` }}>
              Illustrative net vs Growth plan (${apexCost}/mo)
            </p>
            <p className="text-3xl sm:text-4xl font-black" style={{ color: GREEN }}>${fmt(netAnnualProfit)}</p>
            <p className="text-sm mt-2" style={{ color: DIM2 }}>
              <span className="text-lg font-black" style={{ color: GREEN }}>{roi}%</span> illustrative ROI on subscription (your mileage varies)
            </p>
          </div>

          <Link href="/dashboard">
            <Button className="w-full h-12 font-bold" style={{ backgroundColor: BLUE }}>
              Start free — see your dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-center mt-8 px-2 leading-relaxed" style={{ color: DIM2 }}>
        Illustrative calculator — not a guarantee. Conservative assumptions; many teams see stronger booking lift once qualification is automated.
      </p>
    </div>
  );
}
