import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { landingColors as C } from "./landingTheme";

export type LandingTestimonial = {
  name: string;
  co: string;
  quote: string;
  before: string;
  after: string;
  icon: string;
};

type Props = { testimonials: LandingTestimonial[] };

export default function LandingTestimonialCarousel({ testimonials }: Props) {
  const [i, setI] = useState(0);
  const n = testimonials.length;
  const t = testimonials[i]!;

  const prev = () => setI((x) => (x - 1 + n) % n);
  const next = () => setI((x) => (x + 1) % n);

  return (
    <section
      id="results"
      style={{
        backgroundColor: C.bg,
        padding: "80px 24px",
        borderTop: `1px solid ${C.borderW}`,
        fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              color: C.blue2,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 16,
            }}
          >
            Case studies
          </div>
          <h2
            style={{
              color: C.white,
              fontSize: "clamp(26px,4vw,44px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Teams using ApexAI
          </h2>
        </div>

        <div
          className="hover-card relative overflow-hidden rounded-[20px] border p-8 sm:p-10"
          style={{
            backgroundColor: C.bg3,
            borderColor: C.borderW,
            minHeight: 320,
            transition: "border-color 0.2s, transform 0.2s",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 16 }}>{t.icon}</div>
          <p
            style={{
              color: C.white,
              fontSize: "clamp(16px,2.5vw,18px)",
              lineHeight: 1.65,
              marginBottom: 24,
              fontStyle: "italic",
              opacity: 0.92,
            }}
          >
            &ldquo;{t.quote}&rdquo;
          </p>
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 140px", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ color: "rgba(248,113,113,0.9)", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>BEFORE</div>
              <div style={{ color: C.dim2, fontSize: 13 }}>{t.before}</div>
            </div>
            <div style={{ flex: "1 1 140px", backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ color: C.green, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>AFTER</div>
              <div style={{ color: C.dim, fontSize: 13, fontWeight: 600 }}>{t.after}</div>
            </div>
          </div>
          <div>
            <div style={{ color: C.blue3, fontWeight: 700, fontSize: 15 }}>{t.name}</div>
            <div style={{ color: C.dim2, fontSize: 14 }}>{t.co}</div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={prev}
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
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
                    backgroundColor: idx === i ? C.blue2 : "rgba(255,255,255,0.2)",
                  }}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
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
