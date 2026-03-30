import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const D  = "#0f1117";
const D2 = "#141820";
const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const GREEN = "#34d399";
const RED = "#f87171";
const DIM2 = "rgba(255,255,255,0.4)";
const DIM3 = "rgba(255,255,255,0.08)";

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
    <section className="py-20 px-6" style={{ backgroundColor: D2, borderTop: `1px solid ${DIM3}`, borderBottom: `1px solid ${DIM3}` }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-3 text-white">Calculate What You're Leaving on the Table</h2>
          <p className="text-lg" style={{ color: DIM2 }}>
            See the daily revenue gap between your current contact rate and what AI can achieve.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6 p-6 rounded-2xl" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
            <h3 className="font-bold text-white text-lg">Your Business Today</h3>

            {[
              { label: `New leads per day: ${leadsPerDay}`, min: 5, max: 200, val: leadsPerDay, set: setLeadsPerDay },
              { label: `Current contact rate: ${contactRate}%`, min: 5, max: 80, val: contactRate, set: setContactRate },
              { label: `Booking rate (of contacts): ${bookingRate}%`, min: 5, max: 70, val: bookingRate, set: setBookingRate },
              { label: `Close rate (of bookings): ${closeRate}%`, min: 5, max: 70, val: closeRate, set: setCloseRate },
            ].map(({ label, min, max, val, set }) => (
              <div key={label}>
                <p className="text-sm font-medium text-white mb-2">{label}</p>
                <input type="range" min={min} max={max} value={val}
                  onChange={e => set(Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: BLUE }} />
                <div className="flex justify-between text-xs mt-1" style={{ color: DIM2 }}>
                  <span>{min}{label.includes("%") ? "%" : ""}</span>
                  <span>{max}{label.includes("%") ? "%" : ""}</span>
                </div>
              </div>
            ))}

            <div>
              <p className="text-sm font-medium text-white mb-2">Average deal value ($)</p>
              <input type="number" min={500} max={50000} step={500} value={dealValue}
                onChange={e => setDealValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: "#0f1117", border: `1px solid ${DIM3}`, outline: "none", fontSize: "16px" }} />
            </div>

            <div style={{ borderTop: `1px solid ${DIM3}`, paddingTop: "1rem" }}>
              <p className="text-sm font-medium mb-2" style={{ color: GREEN }}>
                With AI — new contact rate: {aiContactRate}%
              </p>
              <p className="text-xs mb-2" style={{ color: DIM2 }}>Most clients see 60–80% contact rate with AI (vs {contactRate}% today)</p>
              <input type="range" min={contactRate} max={95} value={aiContactRate}
                onChange={e => setAiContactRate(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: GREEN }} />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
                <p className="text-xs mb-2 font-medium" style={{ color: DIM2 }}>WITHOUT ApexAI</p>
                <p className="text-2xl font-black text-white">${fmt(currentDailyRevenue)}</p>
                <p className="text-xs" style={{ color: DIM2 }}>daily revenue</p>
                <div className="mt-3 space-y-1 text-xs" style={{ color: DIM2 }}>
                  <p>{currentContacts.toFixed(1)} contacts/day</p>
                  <p>{currentBookings.toFixed(1)} bookings/day</p>
                  <p>{currentSales.toFixed(2)} sales/day</p>
                </div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: D3, border: `1px solid ${GREEN}30` }}>
                <p className="text-xs mb-2 font-medium" style={{ color: GREEN }}>WITH ApexAI</p>
                <p className="text-2xl font-black" style={{ color: GREEN }}>${fmt(aiDailyRevenue)}</p>
                <p className="text-xs" style={{ color: DIM2 }}>daily revenue</p>
                <div className="mt-3 space-y-1 text-xs" style={{ color: DIM2 }}>
                  <p>{aiContacts.toFixed(1)} contacts/day</p>
                  <p>{aiBookings.toFixed(1)} bookings/day</p>
                  <p>{aiSales.toFixed(2)} sales/day</p>
                </div>
              </div>
            </div>

            {/* Gap — the money left on table */}
            <div className="p-5 rounded-xl" style={{ backgroundColor: `${RED}10`, border: `1px solid ${RED}30` }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: RED }} />
                <p className="text-sm font-bold" style={{ color: RED }}>Revenue You're Leaving on the Table Daily</p>
              </div>
              <p className="text-4xl font-black" style={{ color: RED }}>${fmt(dailyGap)}/day</p>
              <p className="text-sm mt-1" style={{ color: DIM2 }}>
                ${fmt(monthlyGap)}/month · ${fmt(annualGap)}/year
              </p>
            </div>

            {/* ROI */}
            <div className="p-5 rounded-xl" style={{ backgroundColor: `${GREEN}10`, border: `1px solid ${GREEN}30` }}>
              <p className="text-xs mb-1 font-medium uppercase tracking-wider" style={{ color: `${GREEN}99` }}>
                Net Annual Profit with ApexAI Growth Plan (${apexCost}/mo)
              </p>
              <p className="text-4xl font-black" style={{ color: GREEN }}>${fmt(netAnnualProfit)}</p>
              <p className="text-sm mt-1" style={{ color: DIM2 }}>
                <span className="text-xl font-black" style={{ color: GREEN }}>{roi}%</span> ROI on ${apexCost}/mo investment
              </p>
            </div>

            <Link href="/dashboard">
              <Button className="w-full h-12" style={{ backgroundColor: BLUE }}>
                Start Free — Lock In These Numbers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-sm text-center mt-8" style={{ color: DIM2 }}>
          Conservative estimates using industry averages. Most clients see 2–3x more bookings with qualified AI appointments.
        </p>
      </div>
    </section>
  );
}
