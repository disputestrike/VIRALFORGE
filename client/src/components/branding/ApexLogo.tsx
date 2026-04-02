import { cn } from "@/lib/utils";

type ApexLogoVariant = "full" | "mark" | "wordmark";
export type ApexLogoSize = "xs" | "sm" | "md" | "lg";

const MARK_SIZES: Record<ApexLogoSize, string> = {
  xs: "h-7",
  sm: "h-9",
  md: "h-12",
  lg: "h-16",
};

const FULL_SIZES: Record<ApexLogoSize, string> = {
  xs: "h-8",
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
};

const TEXT_SIZES: Record<ApexLogoSize, string> = {
  xs: "text-sm",
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

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
          src="/branding/apex-logo-mark.jpg"
          alt="ApexAI"
          className={cn(MARK_SIZES[size], "w-auto object-contain rounded", imgClassName)}
        />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={cn("inline-flex items-baseline gap-0 font-extrabold tracking-tight", TEXT_SIZES[size], className, imgClassName)}>
        <span className="text-white">Apex</span>
        <span className="text-blue-500">AI</span>
      </span>
    );
  }

  // Full — image logo with text
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/branding/apex-logo-full.jpg"
        alt="ApexAI"
        className={cn(FULL_SIZES[size], "w-auto object-contain rounded", imgClassName)}
      />
    </span>
  );
}
