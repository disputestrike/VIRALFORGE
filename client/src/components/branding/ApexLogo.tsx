import { cn } from "@/lib/utils";

type ApexLogoVariant = "full" | "mark" | "wordmark";
export type ApexLogoSize = "xs" | "sm" | "md" | "lg";

const MARK_SIZES: Record<ApexLogoSize, string> = {
  xs: "h-6 sm:h-7",
  sm: "h-8 sm:h-9",
  md: "h-11 sm:h-14",
  lg: "h-14 sm:h-20",
};

const FULL_SIZES: Record<ApexLogoSize, string> = {
  xs: "h-8 sm:h-9",
  sm: "h-10 sm:h-12",
  md: "h-14 sm:h-16",
  lg: "h-20 sm:h-24",
};

const WORDMARK_SIZES: Record<ApexLogoSize, string> = {
  xs: "text-xs font-extrabold tracking-tight leading-none",
  sm: "text-sm font-extrabold tracking-tight leading-none",
  md: "text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none",
  lg: "text-2xl sm:text-3xl font-extrabold tracking-tight leading-none",
};

function WordmarkText({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <span className="text-foreground">Apex</span>
      <span className="text-blue-500">AI</span>
    </span>
  );
}

export default function ApexLogo({
  variant = "full",
  size = "md",
  className,
  imgClassName,
}: {
  variant?: ApexLogoVariant;
  size?: ApexLogoSize;
  className?: string;
  imgClassName?: string;
}) {
  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <img
          src="/branding/apex-logo-mark.png"
          alt="ApexAI"
          className={cn(MARK_SIZES[size], "w-auto object-contain", imgClassName)}
        />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <WordmarkText className={cn(WORDMARK_SIZES[size], imgClassName)} />
      </span>
    );
  }

  // Full logo — use the PNG with text
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/branding/apex-logo-full.png"
        alt="ApexAI"
        className={cn(FULL_SIZES[size], "w-auto object-contain", imgClassName)}
      />
    </span>
  );
}
