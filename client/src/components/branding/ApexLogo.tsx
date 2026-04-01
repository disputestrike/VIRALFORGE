import { cn } from "@/lib/utils";

type ApexLogoVariant = "full" | "mark" | "wordmark";

const LOGO_SRC: Record<ApexLogoVariant, string> = {
  full: "/branding/apex-logo-full.png",
  mark: "/branding/apex-logo-mark.png",
  wordmark: "/branding/apex-logo-wordmark.png",
};

const LOGO_ALT: Record<ApexLogoVariant, string> = {
  full: "ApexAI logo",
  mark: "ApexAI symbol",
  wordmark: "ApexAI wordmark",
};

function withBaseUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${path.replace(/^\/+/, "")}`;
}

export default function ApexLogo({
  variant = "full",
  className,
  imgClassName,
}: {
  variant?: ApexLogoVariant;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={withBaseUrl(LOGO_SRC[variant])}
        alt={LOGO_ALT[variant]}
        className={cn("block h-auto w-auto max-w-full object-contain", imgClassName)}
        loading="eager"
      />
    </span>
  );
}
