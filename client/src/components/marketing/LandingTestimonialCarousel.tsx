import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { landingColors as C } from "./landingTheme";
import { cn } from "@/lib/utils";

export type LandingTestimonial = {
  name: string;
  co: string;
  quote: string;
  before: string;
  after: string;
  icon: string;
};

type Props = { testimonials: LandingTestimonial[]; variant?: "dark" | "light" };

export default function LandingTestimonialCarousel({ testimonials, variant = "dark" }: Props) {
  const [i, setI] = useState(0);
  const n = testimonials.length;
  const t = testimonials[i]!;
  const light = variant === "light";

  const prev = () => setI((x) => (x - 1 + n) % n);
  const next = () => setI((x) => (x + 1) % n);

  return (
    <section
      id="results"
      className={light ? "scroll-mt-24 border-b border-zinc-200 bg-white px-6 py-16 md:py-24" : undefined}
      style={
        light
          ? { fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }
          : {
              backgroundColor: C.bg,
              padding: "80px 24px",
              borderTop: `1px solid ${C.borderW}`,
              fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif",
            }
      }
    >
      <div className="mx-auto max-w-2xl" style={light ? undefined : { maxWidth: 720, margin: "0 auto" }}>
        <div className={cn("mb-9", light && "text-center")} style={light ? undefined : { textAlign: "center", marginBottom: 36 }}>
          <div
            className={light ? "text-xs font-bold uppercase tracking-wider text-blue-600" : ""}
            style={
              light
                ? undefined
                : {
                    color: C.blue2,
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 16,
                  }
            }
          >
            Case studies
          </div>
          <h2
            className={light ? "mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl" : ""}
            style={
              light
                ? undefined
                : {
                    color: C.white,
                    fontSize: "clamp(26px,4vw,44px)",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                  }
            }
          >
            Teams using ApexAI
          </h2>
        </div>

        <div
          className={cn(
            "relative min-h-[320px] overflow-hidden rounded-[20px] border p-8 sm:p-10",
            light
              ? "border-zinc-200 bg-zinc-50 shadow-sm"
              : "hover-card border-[color:var(--border)]"
          )}
          style={
            light
              ? undefined
              : {
                  backgroundColor: C.bg3,
                  borderColor: C.borderW,
                  transition: "border-color 0.2s, transform 0.2s",
                }
          }
        >
          <div className="mb-4 text-4xl">{t.icon}</div>
          <p
            className={cn("mb-6 text-lg italic leading-relaxed", light ? "text-zinc-800" : "")}
            style={light ? undefined : { color: C.white, opacity: 0.92 }}
          >
            &ldquo;{t.quote}&rdquo;
          </p>
          <div className="mb-5 flex flex-wrap gap-4">
            <div
              className={cn(
                "min-w-[140px] flex-1 rounded-lg p-3",
                light ? "bg-red-50" : ""
              )}
              style={light ? undefined : { backgroundColor: "rgba(239,68,68,0.1)" }}
            >
              <div
                className={cn("mb-1 text-[10px] font-bold", light ? "text-red-600" : "")}
                style={light ? undefined : { color: "rgba(248,113,113,0.9)" }}
              >
                BEFORE
              </div>
              <div className={cn("text-sm", light ? "text-zinc-600" : "")} style={light ? undefined : { color: C.dim2 }}>
                {t.before}
              </div>
            </div>
            <div
              className={cn("min-w-[140px] flex-1 rounded-lg p-3", light ? "bg-emerald-50" : "")}
              style={light ? undefined : { backgroundColor: "rgba(34,197,94,0.1)" }}
            >
              <div
                className={cn("mb-1 text-[10px] font-bold", light ? "text-emerald-700" : "")}
                style={light ? undefined : { color: C.green }}
              >
                AFTER
              </div>
              <div className={cn("text-sm font-semibold", light ? "text-zinc-800" : "")} style={light ? undefined : { color: C.dim }}>
                {t.after}
              </div>
            </div>
          </div>
          <div>
            <div className={cn("font-bold", light ? "text-blue-600" : "")} style={light ? undefined : { color: C.blue3, fontSize: 15 }}>
              {t.name}
            </div>
            <div className={cn("text-sm", light ? "text-zinc-500" : "")} style={light ? undefined : { color: C.dim2, fontSize: 14 }}>
              {t.co}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={prev}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border transition-colors",
                light
                  ? "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              )}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setI(idx)}
                  className="size-2 rounded-full transition-colors"
                  style={{
                    backgroundColor: idx === i ? C.blue2 : light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
                  }}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border transition-colors",
                light
                  ? "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              )}
              aria-label="Next testimonial"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
