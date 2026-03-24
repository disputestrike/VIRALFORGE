import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function ROICalculator() {
  const [appointments, setAppointments] = useState(50);
  const [closeRate, setCloseRate] = useState(25);
  const [dealValue, setDealValue] = useState(5000);

  // Pricing tiers
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
    <section className="py-20 px-6 bg-card/20 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-3">Calculate Your Potential Revenue</h2>
          <p className="text-xl text-muted-foreground">See how much money ApexAI can make for you</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Inputs */}
          <div className="space-y-8">
            <div>
              <label className="text-sm font-semibold text-foreground mb-3 block">
                How many appointments/month? {appointments}
              </label>
              <input
                type="range"
                min="20"
                max="500"
                value={appointments}
                onChange={(e) => setAppointments(Number(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>20</span>
                <span>500</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-3 block">
                Your close rate? {closeRate}%
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={closeRate}
                onChange={(e) => setCloseRate(Number(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-3 block">
                Average deal value?
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>$1,000</span>
                <span>$50,000</span>
              </div>
            </div>
          </div>

          {/* Outputs */}
          <div className="bg-card border border-green-500/20 rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Closed Deals</p>
                <p className="text-3xl font-bold text-green-400">{monthlyClosedDeals.toFixed(1)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold text-green-400">
                  ${monthlyRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Annual Revenue</p>
                <p className="text-3xl font-bold text-green-400">
                  ${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-sm text-muted-foreground mb-1">ApexAI Cost</p>
                <p className="text-sm font-semibold text-foreground mb-4">
                  ${monthlyPrice}/month (${annualCost.toLocaleString()}/year)
                </p>

                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-6 border border-green-500/30">
                  <p className="text-xs text-green-400/70 mb-2">NET ANNUAL PROFIT</p>
                  <p className="text-4xl font-black text-green-400 mb-4">
                    ${netProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-green-400/70">
                    <span className="text-lg font-black text-green-400">{roi}%</span> ROI
                  </p>
                </div>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                See if you qualify <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            This is conservative. Most customers see 2-3x higher close rates with qualified appointments. 
            Your actual revenue could be $2M+/year.
          </p>
        </div>
      </div>
    </section>
  );
}
