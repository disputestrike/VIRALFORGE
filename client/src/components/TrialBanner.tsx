import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Clock, Zap, X } from "lucide-react";
import { useState } from "react";

const TRIAL_DAYS = 7;

function getDaysRemaining(createdAt: string | Date | undefined): number {
  if (!createdAt) return TRIAL_DAYS;
  const created = new Date(createdAt);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
}

export default function TrialBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user) return null;

  const plan = (user as any)?.plan || "trial";
  // Don't show for paid users
  if (plan === "starter" || plan === "growth" || plan === "pro" || plan === "enterprise") return null;
  if (dismissed) return null;

  const daysLeft = getDaysRemaining((user as any)?.createdAt);
  const expired = daysLeft <= 0;

  if (expired) {
    return (
      <div className="mx-4 mt-3 mb-1 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Clock className="size-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Free trial expired</p>
            <p className="text-xs text-red-300/70 mt-0.5">
              Upgrade to keep using AI calls, campaigns, and all features.
            </p>
          </div>
          <Link href="/settings#billing">
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xs h-8 px-4">
              <Zap className="size-3 mr-1" /> Upgrade Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 mb-1 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Clock className="size-4 text-blue-400 shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-blue-300">
            <span className="font-semibold">{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span> on your free trial
          </p>
        </div>
        <Link href="/settings#billing">
          <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 text-xs h-7 px-3">
            Upgrade
          </Button>
        </Link>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
