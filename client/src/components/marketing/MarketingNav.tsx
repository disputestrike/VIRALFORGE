import { useState, type ReactNode } from "react";
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
import { ChevronDown, Menu, X } from "lucide-react";
import { landingColors as C } from "./landingTheme";
import ApexLogo from "@/components/branding/ApexLogo";
import {
  channelFeatures,
  platformOverview,
  platformPillars,
  platformSecondary,
  productFeatures,
  resourcesNav,
  solutionsByIndustry,
  solutionsByMotion,
  type NavMegaItem,
} from "./siteContent";
import { cn } from "@/lib/utils";

function MegaLink({ item, onNavigate }: { item: NavMegaItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  const inner = (
    <>
      {Icon ? (
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
          <Icon className="size-4" aria-hidden />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{item.title}</div>
        <p className="mt-0.5 text-xs leading-snug text-zinc-400">{item.description}</p>
      </div>
    </>
  );

  const className = cn(
    "flex gap-3 rounded-lg p-2.5 outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/10",
    !Icon && "pl-2"
  );

  if (item.href.startsWith("/")) {
    return (
      <NavigationMenuLink asChild>
        <Link href={item.href} className={className} onClick={onNavigate}>
          {inner}
        </Link>
      </NavigationMenuLink>
    );
  }

  return (
    <NavigationMenuLink asChild>
      <a href={item.href} className={className} onClick={onNavigate}>
        {inner}
      </a>
    </NavigationMenuLink>
  );
}

function MegaPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-[min(100vw-2rem,720px)] p-4 md:w-[680px]">
      <div className="mb-3 border-b border-white/20 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">{title}</p>
        {subtitle ? <p className="mt-1 text-sm leading-snug text-zinc-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function MarketingNav() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileSection(null);
  };

  if (loading) {
    return (
      <nav
        className="sticky top-0 z-[100] h-16 border-b border-white/25 bg-black/95 backdrop-blur-md"
        aria-hidden
      />
    );
  }

  const MobileAccordion = ({
    id,
    label,
    items,
  }: {
    id: string;
    label: string;
    items: NavMegaItem[];
  }) => {
    const open = mobileSection === id;
    return (
      <div className="border-b border-white/15">
        <button
          type="button"
          className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-white"
          onClick={() => setMobileSection(open ? null : id)}
          aria-expanded={open}
        >
          {label}
          <ChevronDown className={cn("size-4 text-zinc-500 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="space-y-1 pb-3">
            {items.map((item) => {
              const Icon = item.icon;
              if (item.href.startsWith("/")) {
                return (
                  <Link
                    key={item.href + item.title}
                    href={item.href}
                    onClick={closeMobile}
                    className="flex gap-2 rounded-md px-2 py-2 text-sm text-zinc-300 hover:bg-white/10"
                  >
                    {Icon ? <Icon className="size-4 shrink-0 text-blue-400" /> : null}
                    <span>{item.title}</span>
                  </Link>
                );
              }
              return (
                <a
                  key={item.href + item.title}
                  href={item.href}
                  onClick={closeMobile}
                  className="flex gap-2 rounded-md px-2 py-2 text-sm text-zinc-300 hover:bg-white/10"
                >
                  {Icon ? <Icon className="size-4 shrink-0 text-blue-400" /> : null}
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.description}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      className="marketing-nav-landing sticky top-0 z-[100] border-b border-white/25 bg-black text-white shadow-[0_1px_0_rgba(255,255,255,0.06)]"
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      <style>{`
        .marketing-nav-landing [data-slot="navigation-menu-viewport"] {
          background: #000000 !important;
          border-color: rgba(255,255,255,0.25) !important;
          color: #ffffff !important;
        }
        .marketing-nav-landing [data-slot="navigation-menu-link"] {
          color: inherit;
        }
        .marketing-nav-landing [data-slot="navigation-menu-link"]:hover,
        .marketing-nav-landing [data-slot="navigation-menu-link"]:focus {
          background: rgba(255,255,255,0.08) !important;
          color: #ffffff !important;
        }
        .marketing-nav-landing [data-slot="navigation-menu-trigger"] {
          background: transparent !important;
        }
        .marketing-nav-landing [data-slot="navigation-menu-trigger"]:hover,
        .marketing-nav-landing [data-slot="navigation-menu-trigger"][data-state="open"] {
          background: rgba(255,255,255,0.06) !important;
          color: #ffffff !important;
        }
      `}</style>
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="ApexAI home">
          <ApexLogo variant="wordmark" size="md" />
        </Link>

        <div className="hide-mobile flex items-center gap-0">
          <NavigationMenu viewport>
            <NavigationMenuList className="gap-0">
              {/* Platform */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-300 data-[state=open]:text-white hover:bg-white/5 hover:text-white">
                  Platform
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaPanel title="Platform" subtitle={platformOverview.subtitle}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Product pillars</p>
                        <ul className="space-y-0.5">
                          {platformPillars.map((item) => (
                            <li key={item.href}>
                              <MegaLink item={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Architecture & trust</p>
                        <ul className="space-y-0.5">
                          {platformSecondary.map((item) => (
                            <li key={item.href}>
                              <MegaLink item={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg border border-white/15 bg-white/5 p-3 text-center">
                      <a
                        href="#platform"
                        className="text-sm font-semibold text-blue-400 hover:text-blue-300"
                      >
                        View full platform overview →
                      </a>
                    </div>
                  </MegaPanel>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Solutions */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-300 data-[state=open]:text-white hover:bg-white/5 hover:text-white">
                  Solutions
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaPanel
                    title="Solutions"
                    subtitle="Industry packs and motion-specific flows your team runs today — same ApexAI engine in production."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">By industry</p>
                        <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                          {solutionsByIndustry.map((item) => (
                            <li key={item.href}>
                              <MegaLink item={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Get started</p>
                        <ul className="space-y-0.5">
                          {solutionsByMotion.map((item) => (
                            <li key={item.href}>
                              <MegaLink item={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </MegaPanel>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Features */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-300 data-[state=open]:text-white hover:bg-white/5 hover:text-white">
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaPanel
                    title="Features"
                    subtitle="What the Voice AI and campaign stack actually does in your account — pulled from the product you ship to customers."
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      {productFeatures.map((item) => (
                        <MegaLink key={item.href} item={item} />
                      ))}
                    </div>
                    <div className="mt-3 border-t border-white/15 pt-3">
                      {channelFeatures.map((item) => (
                        <MegaLink key={item.href} item={item} />
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <a href="#features" className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                        Open full feature grid →
                      </a>
                    </div>
                  </MegaPanel>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-300 data-[state=open]:text-white hover:bg-white/5 hover:text-white">
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaPanel title="Resources" subtitle="Proof, pricing, and company context.">
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {resourcesNav.map((item) => (
                        <li key={item.href + item.title}>
                          <MegaLink item={item} />
                        </li>
                      ))}
                    </ul>
                  </MegaPanel>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <Link
            href="/pricing"
            className="px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
          >
            Pricing
          </Link>

          {user ? (
            <Link href="/dashboard">
              <Button size="sm" className="ml-1 font-bold shadow-sm" style={{ backgroundColor: C.blue, color: C.white }}>
                Dashboard
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="sm" className="ml-1 font-bold shadow-sm" style={{ backgroundColor: C.blue, color: C.white }}>
                Get started free
              </Button>
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="show-mobile flex size-10 items-center justify-center rounded-md text-white hover:bg-white/10"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="show-mobile max-h-[min(78vh,calc(100dvh-60px))] overflow-y-auto border-t border-white/20 bg-black px-4 pb-6">
          <MobileAccordion id="m-platform" label="Platform" items={[...platformPillars, ...platformSecondary]} />
          <MobileAccordion id="m-solutions" label="Solutions" items={[...solutionsByIndustry, ...solutionsByMotion]} />
          <MobileAccordion id="m-features" label="Features" items={[...productFeatures, ...channelFeatures]} />
          <MobileAccordion id="m-resources" label="Resources" items={resourcesNav} />
          <Link
            href="/pricing"
            onClick={closeMobile}
            className="mt-2 block py-3 text-sm font-semibold text-white"
          >
            Pricing
          </Link>
          <a href={getLoginUrl()} className="mt-2 block" onClick={closeMobile}>
            <Button className="w-full font-bold" style={{ backgroundColor: C.blue, color: C.white }}>
              {user ? "Open app" : "Get started free"}
            </Button>
          </a>
        </div>
      )}
    </nav>
  );
}
