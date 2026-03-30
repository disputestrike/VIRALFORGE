import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight, CheckCircle2, Loader2, Mic } from "lucide-react";

const D2 = "#141820";
const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const BLUE_LIGHT = "#60a5fa";
const GREEN = "#34d399";
const DIM2 = "rgba(255,255,255,0.45)";
const DIM3 = "rgba(255,255,255,0.08)";

const INDUSTRIES = [
  { value: "solar",       label: "Solar" },
  { value: "hvac",        label: "HVAC" },
  { value: "roofing",     label: "Roofing" },
  { value: "insurance",   label: "Insurance" },
  { value: "realestate",  label: "Real Estate" },
  { value: "general",     label: "Other" },
];

export default function DemoCallWidget() {
  const [form, setForm] = useState({ firstName: "", phone: "", email: "", industry: "solar" });
  const [step, setStep] = useState<"form" | "calling" | "done">("form");
  const [error, setError] = useState("");

  const demoMutation = trpc.demoCall.request.useMutation({
    onSuccess: () => setStep("done"),
    onError: (e) => {
      setError(e.message || "Something went wrong. Please try again.");
      setStep("form");
    },
  });

  const handleSubmit = () => {
    setError("");
    if (!form.firstName.trim()) { setError("Please enter your name."); return; }
    if (!form.phone.replace(/\D/g, "") || form.phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit phone number."); return;
    }
    setStep("calling");
    demoMutation.mutate({
      firstName: form.firstName.trim(),
      phone: form.phone.replace(/\D/g, "").startsWith("1")
        ? `+${form.phone.replace(/\D/g, "")}`
        : `+1${form.phone.replace(/\D/g, "")}`,
      email: form.email || undefined,
      industry: form.industry,
    });
  };

  return (
    <section id="try-it" className="py-20 px-6" style={{ backgroundColor: D2 }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{ backgroundColor: `${GREEN}15`, border: `1px solid ${GREEN}30` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
            <span className="text-sm font-semibold" style={{ color: GREEN }}>Live Demo Available Now</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Experience the AI Firsthand
          </h2>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: DIM2 }}>
            Enter your number and our AI will call you within seconds. Hear exactly what your customers hear.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="p-8 rounded-2xl" style={{ backgroundColor: D3, border: `1px solid ${BLUE}30` }}>

            {step === "form" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-white">Your First Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah"
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm"
                      style={{ backgroundColor: D2, border: `1px solid ${DIM3}`, outline: "none", fontSize: "16px" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-white">Your Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm"
                      style={{ backgroundColor: D2, border: `1px solid ${DIM3}`, outline: "none", fontSize: "16px" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-white">Your Email (optional)</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm"
                    style={{ backgroundColor: D2, border: `1px solid ${DIM3}`, outline: "none", fontSize: "16px" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-white">Your Industry</label>
                  <select
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm"
                    style={{ backgroundColor: D2, border: `1px solid ${DIM3}`, outline: "none", fontSize: "16px" }}
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <Button
                  className="w-full h-14 text-base font-bold"
                  onClick={handleSubmit}
                  style={{ backgroundColor: BLUE, borderColor: BLUE }}
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Me Now — It's Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-center text-xs" style={{ color: DIM2 }}>
                  By submitting you agree to receive a demo call. No spam. No obligation.
                </p>
              </div>
            )}

            {step === "calling" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center relative"
                  style={{ backgroundColor: `${BLUE}20`, border: `2px solid ${BLUE}` }}>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: BLUE }} />
                  <Phone className="w-8 h-8" style={{ color: BLUE_LIGHT }} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Connecting Your Call...</h3>
                <p className="text-sm mb-6" style={{ color: DIM2 }}>
                  Our AI is dialing <strong className="text-white">{form.phone}</strong> right now.
                  <br />Pick up in the next 30 seconds.
                </p>
                <div className="flex items-center justify-center gap-2" style={{ color: DIM2 }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Routing through SignalWire...</span>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${GREEN}20`, border: `2px solid ${GREEN}` }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: GREEN }} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Call Connected!</h3>
                <p className="text-sm mb-6" style={{ color: DIM2 }}>
                  Your phone should be ringing now. The AI will introduce itself and demonstrate a{" "}
                  <strong className="text-white">{form.industry}</strong> sales conversation.
                </p>
                <div className="p-4 rounded-xl mb-6 text-left space-y-2"
                  style={{ backgroundColor: D2, border: `1px solid ${GREEN}20` }}>
                  <p className="text-xs font-semibold" style={{ color: GREEN }}>What happens next:</p>
                  {["AI introduces itself naturally", "Qualifies you as a lead", "Answers questions about your industry", "Attempts to book an appointment"].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs" style={{ color: DIM2 }}>
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: GREEN }} />
                      {s}
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="text-white border-white/20"
                  onClick={() => { setStep("form"); setForm({ firstName: "", phone: "", email: "", industry: "solar" }); }}>
                  Try Another Number
                </Button>
              </div>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {["No credit card required", "Call in under 30 seconds", "Real AI — not a recording"].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: DIM2 }}>
                <CheckCircle2 className="w-3 h-3" style={{ color: GREEN }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
