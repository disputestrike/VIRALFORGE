import { cn } from "@/lib/utils";

type ApexLogoVariant = "full" | "mark" | "wordmark";
export type ApexLogoSize = "xs" | "sm" | "md" | "lg";

const MARK: Record<ApexLogoSize, string> = {
  xs: "size-6 sm:size-7",
  sm: "size-8 sm:size-9",
  md: "size-11 sm:size-14",
  lg: "size-14 sm:size-20",
};

const FULL_TEXT: Record<ApexLogoSize, string> = {
  xs: "text-[10px] sm:text-xs",
  sm: "text-sm sm:text-base",
  md: "text-xl sm:text-2xl",
  lg: "text-3xl sm:text-5xl",
};

const WORDMARK: Record<ApexLogoSize, string> = {
  xs: "text-xs font-extrabold tracking-tight leading-none",
  sm: "text-sm font-extrabold tracking-tight leading-none",
  md: "text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none",
  lg: "text-2xl sm:text-3xl font-extrabold tracking-tight leading-none",
};

/** Same mark as `client/src/pages/login.tsx` — vector, not placeholder PNGs. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={cn("block shrink-0", className)} width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1d6ff4" />
      <path d="M16 6L26 24H6L16 6Z" fill="white" opacity="0.95" />
      <path d="M16 12L21 22H11L16 12Z" fill="#1d6ff4" />
    </svg>
  );
}

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
        <LogoMark className={cn(MARK[size], imgClassName)} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <WordmarkText className={cn(WORDMARK[size], imgClassName)} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className={cn("inline-flex min-w-0 items-center gap-2 sm:gap-3", imgClassName)}>
        <LogoMark className={MARK[size]} />
        <WordmarkText className={cn("font-black tracking-tight", FULL_TEXT[size])} />
      </span>
    </span>
  );
}
