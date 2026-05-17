const palette = {
  mainMagenta: "#CB19AF",
  deepViolet: "#AD10CF",
  brandBase: "#BC12BD",
  hotPink: "#DA279B",
  brightRose: "#ED3782",
  electricViolet: "#9B0AE8",
  paleLavender: "#F3B5F3",
  white: "#FEFBFE",
};

const defaultPlatforms = ["YouTube", "TikTok", "Instagram", "X", "LinkedIn", "Pinterest", "Reddit", "Telegram"];

const modules = [
  "TrendScout",
  "BriefForge",
  "Scriptor",
  "VisualPlanner",
  "AssetGen",
  "Renderer",
  "PolicyOS",
  "PulsePost",
  "SignalLoop",
  "DocumentaryEngine",
  "QuotaBroker",
  "IdempotencyLedger",
];

const qaGates = [
  "Define CTQ",
  "Source evidence",
  "Rights check",
  "Platform policy check",
  "Brand voice check",
  "Caption readability",
  "Visual continuity",
  "Audio loudness",
  "Thumbnail clarity",
  "Cost ceiling",
  "Quota check",
  "Human exception routing",
];

function normalizeInput(input = {}) {
  const topic = String(input.topic || "Launch an AI-powered global media network").trim();
  const objective = String(input.objective || "Build audience, trust, and monetizable distribution").trim();
  const length = Number(input.lengthMinutes || 12);
  const budget = Number(input.budgetUsd || 75);
  const risk = String(input.risk || "standard");
  const platforms = Array.isArray(input.platforms) && input.platforms.length ? input.platforms : defaultPlatforms;

  return {
    topic,
    objective,
    lengthMinutes: Number.isFinite(length) ? Math.max(1, Math.min(60, length)) : 12,
    budgetUsd: Number.isFinite(budget) ? Math.max(0, budget) : 75,
    risk,
    platforms,
  };
}

export function createRun(input = {}) {
  const normalized = normalizeInput(input);
  const riskMultiplier = normalized.risk === "strict" ? 1.35 : normalized.risk === "aggressive" ? 0.85 : 1;
  const estimatedCost = Math.round((normalized.lengthMinutes * 1.85 + normalized.platforms.length * 1.2) * riskMultiplier);
  const needsHuman = normalized.risk === "strict" || /medical|legal|finance|politics|election|health/i.test(normalized.topic);
  const decision = needsHuman ? "Hold for human approval" : estimatedCost > normalized.budgetUsd ? "Revise to fit budget" : "Ready for controlled production";

  return {
    id: `vf-${Date.now()}`,
    createdAt: new Date().toISOString(),
    input: normalized,
    brand: {
      name: "ViralForge",
      tagline: "One AI media engine for the whole network.",
      palette,
      gradient: "linear-gradient(135deg, #9B0AE8 0%, #BC12BD 45%, #ED3782 100%)",
    },
    brief: {
      title: normalized.topic,
      objective: normalized.objective,
      hook: `Why ${normalized.topic.toLowerCase()} is becoming impossible to ignore.`,
      audience: "Creators, operators, founders, and media teams building AI-first distribution.",
      promise: "Turn one idea into a governed, platform-ready content package.",
    },
    modules: modules.map((name, index) => ({
      name,
      status: needsHuman && name === "PolicyOS" ? "review" : "ready",
      score: Math.max(82, 99 - index),
    })),
    qa: qaGates.map((name, index) => ({
      name,
      status: needsHuman && index >= 2 ? "review" : "pass",
    })),
    policy: {
      mode: needsHuman ? "human-review" : "auto-controlled",
      events: needsHuman
        ? ["High-risk topic detected", "Human approval required before publishing", "Claims and source evidence must be reviewed"]
        : ["No high-risk category detected", "Platform policy gates passed", "Ready for non-live package generation"],
    },
    documentary: {
      enabled: normalized.lengthMinutes >= 20,
      chapters: Array.from({ length: normalized.lengthMinutes >= 45 ? 6 : normalized.lengthMinutes >= 20 ? 4 : 2 }, (_, index) => ({
        chapter: index + 1,
        title: `Chapter ${index + 1}: ${["The signal", "The system", "The proof", "The scale", "The risks", "The future"][index] || "The next move"}`,
        minutes: Math.ceil(normalized.lengthMinutes / (normalized.lengthMinutes >= 45 ? 6 : normalized.lengthMinutes >= 20 ? 4 : 2)),
      })),
    },
    packages: normalized.platforms.map(platform => ({
      platform,
      status: "package-ready",
      assets: platform === "YouTube" ? ["title", "description", "thumbnail", "chapters", "shorts"] : ["caption", "hook", "hashtags", "creative brief"],
    })),
    saas: {
      tenantReady: true,
      paypalReady: "sandbox-gated",
      usageLedger: true,
      quotaBroker: true,
    },
    finance: {
      estimatedCost,
      budgetUsd: normalized.budgetUsd,
      marginSignal: normalized.budgetUsd > estimatedCost ? "healthy" : "tight",
    },
    decision,
  };
}

export function createSnapshot() {
  return createRun({
    topic: "ViralForge launch: AI content empire operating system",
    objective: "Prove the complete website, login, app console, QA gates, and network engine",
    lengthMinutes: 30,
    budgetUsd: 120,
    risk: "standard",
    platforms: defaultPlatforms,
  });
}
