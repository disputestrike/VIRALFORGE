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
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
          <Icon className="size-4" aria-hidden />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
        <p className="mt-0.5 text-xs leading-snug text-zinc-500">{item.description}</p>
      </div>
    </>
  );

  const className = cn(
    "flex gap-3 rounded-lg p-2.5 outline-none transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100",
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
      <div className="mb-3 border-b border-zinc-100 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">{title}</p>
        {subtitle ? <p className="mt-1 text-sm leading-snug text-zinc-600">{subtitle}</p> : null}
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
        className="sticky top-0 z-[100] h-16 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md"
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
      <div className="border-b border-zinc-100">
        <button
          type="button"
          className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-zinc-900"
          onClick={() => setMobileSection(open ? null : id)}
          aria-expanded={open}
        >
          {label}
          <ChevronDown className={cn("size-4 text-zinc-400 transition-transform", open && "rotate-180")} />
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
                    className="flex gap-2 rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    {Icon ? <Icon className="size-4 shrink-0 text-blue-600" /> : null}
                    <span>{item.title}</span>
                  </Link>
                );
              }
              return (
                <a
                  key={item.href + item.title}
                  href={item.href}
                  onClick={closeMobile}
                  className="flex gap-2 rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {Icon ? <Icon className="size-4 shrink-0 text-blue-600" /> : null}
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
      className="sticky top-0 z-[100] border-b border-zinc-200/90 bg-white text-zinc-900 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
      style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
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

        <div className="hide-mobile flex items-center gap-0">
          <NavigationMenu viewport>
            <NavigationMenuList className="gap-0">
              {/* Platform */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-700 data-[state=open]:text-zinc-900">
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
                    <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-center">
                      <a
                        href="#platform"
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View full platform overview →
                      </a>
                    </div>
                  </MegaPanel>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Solutions */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-700 data-[state=open]:text-zinc-900">
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
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-700 data-[state=open]:text-zinc-900">
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
                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      {channelFeatures.map((item) => (
                        <MegaLink key={item.href} item={item} />
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <a href="#features" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        Open full feature grid →
                      </a>
                    </div>
                  </MegaPanel>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 bg-transparent px-3 text-sm font-medium text-zinc-700 data-[state=open]:text-zinc-900">
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
            className="px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
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
          className="show-mobile flex size-10 items-center justify-center rounded-md text-zinc-800 hover:bg-zinc-100"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="show-mobile max-h-[min(78vh,calc(100dvh-60px))] overflow-y-auto border-t border-zinc-200 bg-white px-4 pb-6">
          <MobileAccordion id="m-platform" label="Platform" items={[...platformPillars, ...platformSecondary]} />
          <MobileAccordion id="m-solutions" label="Solutions" items={[...solutionsByIndustry, ...solutionsByMotion]} />
          <MobileAccordion id="m-features" label="Features" items={[...productFeatures, ...channelFeatures]} />
          <MobileAccordion id="m-resources" label="Resources" items={resourcesNav} />
          <Link
            href="/pricing"
            onClick={closeMobile}
            className="mt-2 block py-3 text-sm font-semibold text-zinc-900"
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
