import { getLoginUrl } from "@/const";
import { landingColors as C } from "./landingTheme";
import ApexLogo from "@/components/branding/ApexLogo";

export default function MarketingFooter() {
  const link = "text-sm text-[rgba(255,255,255,0.62)] transition-colors hover:text-white";

  return (
    <footer
      style={{
        backgroundColor: "#000000",
        borderTop: `1px solid ${C.borderW}`,
        padding: "48px 24px 32px",
        fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          className="footer-cols grid gap-9"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.2fr) repeat(4, minmax(0,1fr))",
            marginBottom: 40,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <ApexLogo variant="full" size="md" imgClassName="rounded-md border border-white/10 px-2 py-1" />
            </div>
            <p style={{ color: C.dim2, fontSize: 13, lineHeight: 1.65, maxWidth: 280 }}>
              AI phone agents for inbound and outbound. Book more appointments without scaling headcount.
            </p>
            <p style={{ color: C.dim2, fontSize: 12, marginTop: 16 }}>© {new Date().getFullYear()} Starlight Global</p>
          </div>

          <div>
            <div
              style={{
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Product
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="#platform" className={link}>
                Platform
              </a>
              <a href="#features" className={link}>
                Features
              </a>
              <a href="#demo" className={link}>
                Live demo
              </a>
              <a href="#capabilities" className={link}>
                Platform stack
              </a>
              <a href="/pricing" className={link}>
                Pricing
              </a>
              <a href={getLoginUrl()} className={link}>
                Sign in
              </a>
            </div>
          </div>

          <div>
            <div
              style={{
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Solutions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="#solutions" className={link}>
                Industry packs
              </a>
              <a href="#calculator" className={link}>
                ROI calculator
              </a>
              <a href="#how-it-works" className={link}>
                How it works
              </a>
              <a href="#different" className={link}>
                vs legacy IVR
              </a>
            </div>
          </div>

          <div>
            <div
              style={{
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Resources
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="#results" className={link}>
                Case studies
              </a>
              <a href="#faq" className={link}>
                FAQ
              </a>
              <a href="/about" className={link}>
                About
              </a>
              <a href="mailto:support@apexai.io" className={link}>
                Contact
              </a>
            </div>
          </div>

          <div>
            <div
              style={{
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Legal
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="/privacy" className={link}>
                Privacy
              </a>
              <a href="/terms" className={link}>
                Terms
              </a>
              <a href="/security" className={link}>
                Security
              </a>
              <a href="/admin" className={link}>
                Admin
              </a>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.borderW}`, paddingTop: 24 }}>
          <p style={{ color: C.dim2, fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
            Serving teams nationwide — Dallas · Phoenix · Tampa · Houston · Atlanta · Los Angeles · New York · Miami
          </p>
        </div>
      </div>
    </footer>
  );
}
