import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import {
  DEFAULT_ROI_PLAN_TIER,
  getPublicPlanById,
  getSelfServePlanByCheckoutTier,
  recommendPlanForMonthlyConversations,
} from "@/lib/pricing";

const D3 = "#000000";
const BLUE = "#1d6ff4";
const GREEN = "#34d399";
const AMBER = "#fbbf24";
const DIM2 = "rgba(255,255,255,0.6)";
const DIM3 = "rgba(255,255,255,0.22)";

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
  const monthlyConversations = Math.round(aiContacts * 30);
  const recommendedPlan = getPublicPlanById(recommendPlanForMonthlyConversations(monthlyConversations));

  const apexCost = getSelfServePlanByCheckoutTier(DEFAULT_ROI_PLAN_TIER).price;
  const annualCost = apexCost * 12;
  const netAnnualProfit = annualGap - annualCost;
  const roi = annualCost > 0 ? Math.round((netAnnualProfit / annualCost) * 100) : 0;

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="w-full max-w-[1280px] mx-auto min-w-0 px-1 sm:px-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start lg:items-stretch">
        <div
          className="space-y-8 sm:space-y-9 p-8 sm:p-10 md:p-12 lg:p-14 rounded-2xl sm:rounded-3xl min-w-0 w-full"
          style={{ backgroundColor: D3, border: `1px solid ${DIM3}`, boxSizing: "border-box" }}
        >
          <h3 className="font-bold text-white text-xl tracking-tight">Your business today</h3>

          {[
            { label: `New leads per day`, suffix: `${leadsPerDay}`, min: 5, max: 200, val: leadsPerDay, set: setLeadsPerDay, unit: "" as const },
            { label: `Current contact rate`, suffix: `${contactRate}%`, min: 5, max: 80, val: contactRate, set: setContactRate, unit: "%" as const },
            { label: `Booking rate (of contacts)`, suffix: `${bookingRate}%`, min: 5, max: 70, val: bookingRate, set: setBookingRate, unit: "%" as const },
            { label: `Close rate (of bookings)`, suffix: `${closeRate}%`, min: 5, max: 70, val: closeRate, set: setCloseRate, unit: "%" as const },
          ].map(({ label, suffix, min, max, val, set, unit }) => (
            <div key={label} className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3 pr-1">
                <p className="text-sm sm:text-base font-medium text-white leading-snug">{label}</p>
                <p className="text-sm sm:text-base font-bold tabular-nums shrink-0" style={{ color: BLUE }}>{suffix}</p>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={val}
                onChange={e => set(Number(e.target.value))}
                className="w-full max-w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-white/10"
                style={{ accentColor: BLUE }}
              />
              <p className="text-xs leading-relaxed pb-1" style={{ color: DIM2 }}>
                Range: {min}{unit} – {max}{unit}
              </p>
            </div>
          ))}

          <div className="space-y-3 pt-1">
            <p className="text-sm sm:text-base font-medium text-white">Average deal value ($)</p>
            <input
              type="number"
              min={500}
              max={50000}
              step={500}
              value={dealValue}
              onChange={e => setDealValue(Number(e.target.value))}
              className="w-full min-h-[52px] px-4 py-3 rounded-xl text-white box-border"
              style={{ backgroundColor: "#000000", border: `1px solid ${DIM3}`, outline: "none", fontSize: "16px" }}
            />
          </div>

          <div className="space-y-4 pt-4 mt-2 border-t" style={{ borderColor: DIM3 }}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 pr-1">
              <p className="text-sm sm:text-base font-medium leading-snug" style={{ color: GREEN }}>With ApexAI — contact rate</p>
              <p className="text-sm sm:text-base font-bold tabular-nums shrink-0" style={{ color: GREEN }}>{aiContactRate}%</p>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: DIM2 }}>
              Typical range after automation: 60–80% (vs {contactRate}% today). Drag to model your scenario.
            </p>
            <input
              type="range"
              min={contactRate}
              max={95}
              value={aiContactRate}
              onChange={e => setAiContactRate(Number(e.target.value))}
              className="w-full max-w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-white/10"
              style={{ accentColor: GREEN }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5 w-full min-w-0 self-stretch">
          <div className="grid grid-cols-2 gap-4 w-full min-w-0 box-border">
            <div className="p-6 sm:p-7 rounded-2xl min-h-[200px] flex flex-col w-full min-w-0 box-border" style={{ backgroundColor: D3, border: `1px solid ${DIM3}` }}>
              <p className="text-xs mb-3 font-semibold uppercase tracking-wide" style={{ color: DIM2 }}>Without ApexAI</p>
              <p className="text-2xl sm:text-3xl font-black text-white">${fmt(currentDailyRevenue)}</p>
              <p className="text-sm mt-1" style={{ color: DIM2 }}>daily revenue</p>
              <div className="mt-auto pt-4 space-y-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: DIM2 }}>
                <p>{currentContacts.toFixed(1)} contacts/day</p>
                <p>{currentBookings.toFixed(1)} bookings/day</p>
                <p>{currentSales.toFixed(2)} sales/day</p>
              </div>
            </div>
            <div className="p-6 sm:p-7 rounded-2xl min-h-[200px] flex flex-col" style={{ backgroundColor: D3, border: `1px solid ${GREEN}35` }}>
              <p className="text-xs mb-3 font-semibold uppercase tracking-wide" style={{ color: GREEN }}>With ApexAI</p>
              <p className="text-2xl sm:text-3xl font-black" style={{ color: GREEN }}>${fmt(aiDailyRevenue)}</p>
              <p className="text-sm mt-1" style={{ color: DIM2 }}>daily revenue</p>
              <div className="mt-auto pt-4 space-y-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: DIM2 }}>
                <p>{aiContacts.toFixed(1)} contacts/day</p>
                <p>{aiBookings.toFixed(1)} bookings/day</p>
                <p>{aiSales.toFixed(2)} sales/day</p>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-8 rounded-2xl w-full min-w-0 box-border" style={{ backgroundColor: "rgba(251,191,36,0.08)", border: `1px solid ${AMBER}35` }}>
            <div className="flex items-start gap-3 mb-3">
              <TrendingUp className="w-5 h-5 shrink-0 mt-0.5" style={{ color: AMBER }} />
              <p className="text-base font-bold leading-snug" style={{ color: AMBER }}>Estimated revenue left on the table (daily)</p>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white">${fmt(dailyGap)}<span className="text-xl font-bold text-white/60">/day</span></p>
            <p className="text-sm mt-3" style={{ color: DIM2 }}>
              ${fmt(monthlyGap)}/mo · ${fmt(annualGap)}/yr
            </p>
          </div>

          <div className="p-7 sm:p-8 rounded-2xl w-full" style={{ backgroundColor: `${GREEN}0d`, border: `1px solid ${GREEN}35` }}>
            <p className="text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: `${GREEN}cc` }}>
              Illustrative net vs Growth plan (${apexCost}/mo)
            </p>
            <p className="text-3xl sm:text-4xl font-black" style={{ color: GREEN }}>${fmt(netAnnualProfit)}</p>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: DIM2 }}>
              <span className="text-xl font-black" style={{ color: GREEN }}>{roi}%</span> illustrative ROI on subscription (your mileage varies)
            </p>
          </div>

          <div className="p-7 sm:p-8 rounded-2xl w-full min-w-0 box-border" style={{ backgroundColor: "rgba(29,111,244,0.08)", border: `1px solid ${BLUE}35` }}>
            <p className="text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: `${BLUE}dd` }}>
              Suggested starting plan
            </p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">{recommendedPlan.name}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: DIM2 }}>
                  Based on roughly {fmt(monthlyConversations)} conversations per month, most teams like yours start here.
                </p>
              </div>
              <p className="text-sm font-semibold" style={{ color: BLUE }}>
                {recommendedPlan.conversationEstimate}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/pricing" className="w-full min-w-0 block box-border">
              <Button variant="outline" className="w-full min-w-0 min-h-[52px] text-base font-semibold rounded-xl box-border border-white/20 bg-transparent text-white hover:bg-white/10">
                Review pricing guidance
              </Button>
            </a>
            <Link href="/dashboard" className="w-full min-w-0 block box-border">
              <Button className="w-full min-w-0 min-h-[52px] text-base font-bold rounded-xl box-border" style={{ backgroundColor: BLUE }}>
                Start free — see your dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-center mt-10 sm:mt-12 px-4 leading-relaxed max-w-2xl mx-auto" style={{ color: DIM2 }}>
        Illustrative calculator — not a guarantee. Conservative assumptions; many teams see stronger booking lift once qualification is automated.
      </p>
    </div>
  );
}
