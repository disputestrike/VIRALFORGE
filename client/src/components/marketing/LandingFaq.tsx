import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { landingColors as C } from "./landingTheme";

const items: { q: string; a: string }[] = [
  {
    q: "Is ApexAI a chatbot?",
    a: "No. It is built for live phone calls — sub-second responses, natural turn-taking, barge-in, and telephony-grade audio (8 kHz mu-law) end to end.",
  },
  {
    q: "How fast can we go live?",
    a: "Most teams connect a number, pick an industry pack, and test inbound or outbound flows the same day. No credit card is required for the live demo call on this page.",
  },
  {
    q: "Does it work with my CRM or calendar?",
    a: "ApexAI captures structured lead data, bookings, and transcripts so you can sync to your stack. Exact integrations depend on your plan — we focus on clean handoffs and exports.",
  },
  {
    q: "What about TCPA and compliance?",
    a: "Outbound features are designed with compliance in mind: opt-out handling, calling windows, and audit-friendly logs. You remain responsible for list consent and campaign rules.",
  },
  {
    q: "Can callers reach a human?",
    a: "Yes. You can configure transfer numbers and hand off anytime. The AI is meant to qualify and book — not trap callers.",
  },
  {
    q: "Which industries do you support?",
    a: "Solar, roofing, HVAC, insurance, real estate, and similar high-intent phone businesses ship first. Scripts and qualification flows are customizable per vertical.",
  },
];

type FaqVariant = "dark" | "light";

export default function LandingFaq({ variant = "dark" }: { variant?: FaqVariant }) {
  const light = variant === "light";

  return (
    <section
      id="faq"
      className={light ? "scroll-mt-24 border-b border-zinc-200 bg-white px-6 py-20 md:py-24" : ""}
      style={
        light
          ? { fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }
          : {
              backgroundColor: C.bg2,
              padding: "88px 24px",
              borderTop: `1px solid ${C.borderW}`,
              fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif",
            }
      }
    >
      <div className="mx-auto max-w-2xl" style={light ? undefined : { maxWidth: 720, margin: "0 auto" }}>
        <div className={light ? "mb-10 text-center" : undefined} style={light ? undefined : { textAlign: "center", marginBottom: 40 }}>
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
            FAQ
          </div>
          <h2
            className={light ? "mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl" : ""}
            style={
              light
                ? undefined
                : {
                    color: C.white,
                    fontSize: "clamp(26px,4vw,40px)",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    marginBottom: 12,
                  }
            }
          >
            Common questions
          </h2>
          <p
            className={light ? "mt-4 text-lg text-zinc-600" : ""}
            style={
              light
                ? undefined
                : { color: C.dim, fontSize: 17, lineHeight: 1.65, maxWidth: 520, margin: "0 auto" }
            }
          >
            Straight answers about voice AI, rollout, and how ApexAI fits your phone channel.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className={
            light
              ? "w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-2 shadow-sm"
              : "w-full rounded-xl border border-white/[0.08] bg-[#141820] px-2"
          }
        >
          {items.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`item-${i}`}
              className={light ? "border-zinc-200 px-2" : "border-white/[0.07] px-2"}
            >
              <AccordionTrigger
                className={
                  light
                    ? "text-left text-[15px] font-semibold text-zinc-900 hover:no-underline [&[data-state=open]]:text-blue-600"
                    : "text-left text-[15px] font-semibold text-white hover:no-underline [&[data-state=open]]:text-blue-300"
                }
              >
                {item.q}
              </AccordionTrigger>
              <AccordionContent
                className={
                  light
                    ? "pb-4 text-[15px] leading-relaxed text-zinc-600"
                    : "pb-4 text-[15px] leading-relaxed text-[rgba(255,255,255,0.65)]"
                }
              >
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
