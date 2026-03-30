import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const D2 = "#141820";
const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const GREEN = "#34d399";
const DIM2 = "rgba(255,255,255,0.4)";
const DIM3 = "rgba(255,255,255,0.08)";

export default function ROICalculator() {
  const [appointments, setAppointments] = useState(50);
  const [closeRate, setCloseRate] = useState(25);
  const [dealValue, setDealValue] = useState(5000);

  const getTierPrice = (appts: number) => {
    if (appts <= 50) return 249;
    if (appts <= 100) return 498;
    if (appts <= 250) return 1245;
    return 2490;
  };

  const monthlyClosedDeals = (appointments * closeRate) / 100;
  const monthlyRevenue = monthlyClosedDeals * dealValue;
  const annualRevenue = monthlyRevenue * 12;
  const monthlyPrice = getTierPrice(appointments);
  const annualCost = monthlyPrice * 12;
  const netProfit = annualRevenue - annualCost;
  const roi = annualCost > 0 ? ((netProfit / annualCost) * 100).toFixed(0) : 0;

  return (
    <section className="py-20 px-6" style={{ backgroundColor: D2, borderTop: `1px solid ${DIM3}`, borderBottom: `1px solid ${DIM3}` }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-3 text-white">Calculate Your Revenue Potential</h2>
          <p className="text-xl" style={{ color: DIM2 }}>See how much ApexAI can generate for your business</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Inputs */}
          <div className="space-y-8">
            {[
              { label: `Appointments per month: ${appointments}`, min: 20, max: 500, value: appointments, setter: setAppointments, suffix: "" },
              { label: `Your close rate: ${closeRate}%`, min: 5, max: 80, value: closeRate, setter: setCloseRate, suffix: "%" },
            ].map(({ label, min, max, value, setter }) => (
              <div key={label}>
                <label className="text-sm font-semibold text-white mb-3 block">{label}</label>
                <input type="range" min={min} max={max} value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ backgroundColor: D3, accentColor: BLUE }} />
                <div className="flex justify-between text-xs mt-2" style={{ color: DIM2 }}>
                  <span>{min}</span><span>{max}{label.includes("%") ? "%" : ""}</span>
                </div>
              </div>
            ))}
            <div>
              <label className="text-sm font-semibold text-white mb-3 block">Average deal value</label>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: DIM2 }}>$</span>
                <input type="number" min={1000} max={50000} step={500} value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="flex-1 px-4 py-2 rounded-lg text-white text-sm"
                  style={{ backgroundColor: D3, border: `1px solid ${DIM3}`, outline: "none" }} />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-8 rounded-xl" style={{ backgroundColor: D3, border: `1px solid rgba(52,211,153,0.2)` }}>
            <div className="space-y-5">
              {[
                { label: "Monthly Closed Deals", value: monthlyClosedDeals.toFixed(1), color: "white" },
                { label: "Monthly Revenue", value: `$${monthlyRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: GREEN },
                { label: "Annual Revenue", value: `$${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: GREEN },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs mb-1" style={{ color: DIM2 }}>{label}</p>
                  <p className="text-3xl font-black" style={{ color }}>{value}</p>
                </div>
              ))}

              <div className="pt-4" style={{ borderTop: `1px solid ${DIM3}` }}>
                <p className="text-xs mb-1" style={{ color: DIM2 }}>ApexAI Investment</p>
                <p className="text-sm font-semibold text-white mb-4">
                  ${monthlyPrice}/mo · ${annualCost.toLocaleString()}/year
                </p>
                <div className="rounded-xl p-5" style={{ backgroundColor: `${GREEN}12`, border: `1px solid ${GREEN}30` }}>
                  <p className="text-xs mb-2" style={{ color: `${GREEN}99` }}>NET ANNUAL PROFIT</p>
                  <p className="text-4xl font-black mb-2" style={{ color: GREEN }}>
                    ${netProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm" style={{ color: DIM2 }}>
                    <span className="text-xl font-black" style={{ color: GREEN }}>{roi}%</span> ROI on your investment
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={() => window.location.href = "/dashboard"}
                style={{ backgroundColor: BLUE, borderColor: BLUE }}>
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <p className="text-sm text-center mt-10" style={{ color: DIM2 }}>
          Conservative estimate. Most customers see 2–3x higher close rates with qualified AI appointments.
        </p>
      </div>
    </section>
  );
}
