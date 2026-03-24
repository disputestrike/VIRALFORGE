import { Shield, CheckCircle2 } from "lucide-react";

export default function RiskReversal() {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-blue-500/5 to-background border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border border-blue-500/30 rounded-xl p-12">
          <div className="flex items-start gap-6 mb-8">
            <Shield className="w-12 h-12 text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-4xl font-black text-foreground mb-3">
                Guaranteed Appointments or Your Money Back
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We're so confident ApexAI will book qualified appointments that we're willing to put our money where our mouth is.
              </p>

              <div className="bg-background rounded-lg p-8 border border-border mb-8">
                <p className="font-bold text-foreground mb-4">Here's the guarantee:</p>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  "If ApexAI doesn't book 1-3 qualified appointments in your first 30 days, 
                  we'll run month 2 completely free. No questions asked. No fine print."
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <span className="text-sm text-foreground">Zero financial risk</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <span className="text-sm text-foreground">Zero performance risk</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <span className="text-sm text-foreground">Worst case: You get a free month</span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground text-sm">
                Why are we this confident? Because 89% of our customers renew month 2. 
                Once you see what ApexAI can do, you'll never go back to cold calling.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="text-center">
            <p className="text-4xl font-black text-blue-400 mb-2">89%</p>
            <p className="text-sm text-muted-foreground">Renew After Month 1</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-blue-400 mb-2">1-3</p>
            <p className="text-sm text-muted-foreground">Qualified Appointments Guaranteed</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-blue-400 mb-2">30 Days</p>
            <p className="text-sm text-muted-foreground">Risk-Free Trial</p>
          </div>
        </div>
      </div>
    </section>
  );
}
