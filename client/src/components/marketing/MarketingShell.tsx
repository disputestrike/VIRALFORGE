import MarketingNav from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";
import type { ReactNode } from "react";

/**
 * Shared shell for all public marketing pages (Pricing, About, Platform, Solutions, Resources).
 * Provides consistent dark theme, nav, footer, and mobile sticky bar matching the Landing page.
 */
export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-w-0 bg-black pb-24 text-white antialiased md:pb-0"
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      <style>{`
        .show-mobile{display:none!important}
        @media(max-width:768px){
          .show-mobile{display:flex!important}
          .hide-mobile{display:none!important}
        }
      `}</style>

      <MarketingNav />

      {children}

      <MarketingFooter />
    </div>
  );
}
