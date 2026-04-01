import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Menu, X } from "lucide-react";
import { landingColors as C } from "./landingTheme";

const menuLinkClass =
  "block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";

export default function MarketingNav() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  if (loading) {
    return (
      <nav
        className="sticky top-0 z-[100] h-16 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md"
        aria-hidden
      />
    );
  }

  return (
    <nav
      className="sticky top-0 z-[100] border-b border-zinc-200/80 bg-white/95 text-zinc-900 shadow-sm backdrop-blur-md"
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="flex size-[34px] items-center justify-center rounded-[9px]"
            style={{ backgroundColor: C.blue }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M9 2L15.5 14H2.5L9 2Z" fill="white" />
            </svg>
          </div>
          <span className="text-[19px] font-extrabold tracking-tight text-zinc-900">
            Apex<span style={{ color: C.blue2 }}>AI</span>
          </span>
        </Link>

        <div className="hide-mobile flex items-center gap-1">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="flex-wrap gap-0">
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">
                  Platform
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid min-w-[220px] gap-1 p-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#platform" className={menuLinkClass}>
                          <div className="text-sm font-semibold">The platform</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Inbound, outbound, booking, analytics — one stack.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#how-it-works" className={menuLinkClass}>
                          <div className="text-sm font-semibold">How it works</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Real-time voice, not a chatbot.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#different" className={menuLinkClass}>
                          <div className="text-sm font-semibold">ApexAI vs legacy IVR</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Why teams switch.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">
                  Solutions
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid min-w-[220px] gap-1 p-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#solutions" className={menuLinkClass}>
                          <div className="text-sm font-semibold">Industry packs</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Solar, roofing, HVAC, insurance, and more.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#demo" className={menuLinkClass}>
                          <div className="text-sm font-semibold">Live demo</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Hear the agent on a real call.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#calculator" className={menuLinkClass}>
                          <div className="text-sm font-semibold">ROI calculator</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Model missed-call cost vs automation.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid min-w-[220px] gap-1 p-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#results" className={menuLinkClass}>
                          <div className="text-sm font-semibold">Case studies</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Outcomes by vertical.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#faq" className={menuLinkClass}>
                          <div className="text-sm font-semibold">FAQ</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Pricing, compliance, setup.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link href="/pricing" className={menuLinkClass}>
                          <div className="text-sm font-semibold">Pricing</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Plans and limits.
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link href="/about" className={menuLinkClass}>
                          <div className="text-sm font-semibold">About</div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                            Company and mission.
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <a
            href="/pricing"
            className="px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Pricing
          </a>

          {user ? (
            <Link href="/dashboard">
              <Button size="sm" className="font-bold" style={{ backgroundColor: C.blue, color: C.white }}>
                Dashboard
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="sm" className="font-bold" style={{ backgroundColor: C.blue, color: C.white }}>
                Get started free
              </Button>
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="show-mobile flex items-center justify-center rounded-md p-2 text-zinc-800 hover:bg-zinc-100"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="show-mobile border-t border-zinc-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3 text-sm font-semibold text-zinc-500">
            Platform
          </div>
          <a href="#platform" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            The platform
          </a>
          <a href="#how-it-works" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            How it works
          </a>
          <a href="#different" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            ApexAI vs legacy IVR
          </a>

          <div className="mt-3 flex flex-col gap-1 border-b border-zinc-100 pb-3 pt-2 text-sm font-semibold text-zinc-500">
            Solutions
          </div>
          <a href="#solutions" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            Industry packs
          </a>
          <a href="#demo" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            Live demo
          </a>
          <a href="#calculator" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            ROI calculator
          </a>

          <div className="mt-3 flex flex-col gap-1 border-b border-zinc-100 pb-3 pt-2 text-sm font-semibold text-zinc-500">
            Resources
          </div>
          <a href="#results" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            Case studies
          </a>
          <a href="#faq" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            FAQ
          </a>
          <Link href="/pricing" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            Pricing
          </Link>
          <Link href="/about" onClick={closeMobile} className="block py-2.5 text-zinc-800">
            About
          </Link>

          <a href={getLoginUrl()} className="mt-4 block" onClick={closeMobile}>
            <Button className="w-full font-bold" style={{ backgroundColor: C.blue, color: C.white }}>
              {user ? "Open app" : "Get started free"}
            </Button>
          </a>
        </div>
      )}
    </nav>
  );
}
