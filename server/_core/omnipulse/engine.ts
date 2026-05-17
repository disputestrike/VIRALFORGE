export type OmniPulseOutputProfile = "network-launch" | "daily-shorts" | "documentary-deep-dive";
export type OmniPulseRiskTolerance = "strict" | "balanced" | "aggressive";
export type GateStatus = "pass" | "warning" | "review" | "block";
export type CapabilityStatus =
  | "planned"
  | "manual_export_only"
  | "sandbox_ready"
  | "private_publish_ready"
  | "production_ready"
  | "paused"
  | "verification_required";

export interface OmniPulseRunInput {
  topic: string;
  objective: string;
  outputProfile: OmniPulseOutputProfile;
  targetMinutes: number;
  platforms: string[];
  languages: string[];
  riskTolerance: OmniPulseRiskTolerance;
  budgetCeilingUsd: number;
  tenantId?: string;
}

export interface ContentPillar {
  code: string;
  name: string;
  promise: string;
  defaultRisk: GateStatus;
  channels: string[];
}

export interface EngineModule {
  code: string;
  name: string;
  role: string;
  status: "ready" | "running" | "gated";
  outputs: string[];
}

export interface PlatformConnector {
  platform: string;
  status: CapabilityStatus;
  auth: string;
  capabilities: string[];
  aiLabelSupport: boolean;
  quotaStrategy: string;
  fallback: string;
  docsUrl: string;
}

export interface ProviderConnector {
  category: string;
  primary: string;
  fallbacks: string[];
  routingRule: string;
  riskControl: string;
}

export interface ChannelTemplate {
  code: string;
  name: string;
  pillar: string;
  audience: string;
  cadence: string;
  riskLevel: GateStatus;
  monetization: string[];
}

export interface PolicyEvent {
  module: string;
  ruleCode: string;
  status: GateStatus;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  correctiveAction: string;
}

export interface QaGate {
  name: string;
  dmaicPhase: "define" | "measure" | "analyze" | "improve" | "control" | "verify";
  ctq: string;
  status: GateStatus;
  score: number;
  defectCount: number;
  evidence: string[];
}

export interface ContentItem {
  id: string;
  title: string;
  pillar: string;
  format: string;
  targetPlatformPackages: string[];
  renderPath: "template" | "stock-hybrid" | "generative-hybrid" | "full-generative";
  estimatedCostUsd: number;
  status: "briefed" | "scripted" | "policy_review" | "packaged" | "ready";
  policyStatus: GateStatus;
}

export interface DocumentaryChapter {
  id: string;
  title: string;
  targetMinutes: number;
  researchQuestions: string[];
  claimCount: number;
  sourceRequirement: string;
  renderPath: "template" | "stock-hybrid" | "generative-hybrid" | "full-generative";
  qaStatus: GateStatus;
}

export interface DocumentaryPlan {
  enabled: boolean;
  title: string;
  targetMinutes: number;
  thesis: string;
  chapters: DocumentaryChapter[];
  cutdownCandidates: number;
  assemblyPlan: string[];
  complianceNotes: string[];
}

export interface PlatformPackage {
  id: string;
  platform: string;
  contentItemId: string;
  publishMode: "direct_private" | "direct_ready" | "manual_export" | "blocked";
  requiredLabels: string[];
  quotaBucket: string;
  schedulePolicy: string;
  idempotencyKey: string;
}

export interface FinancialModel {
  estimatedRunCostUsd: number;
  costPerFinishedMinuteUsd: number;
  monthlySeedBudgetUsd: number;
  planReadiness: string;
  revenueLayers: string[];
  payPal: {
    required: true;
    products: string[];
    webhookControls: string[];
  };
}

export interface OmniPulseRun {
  id: string;
  tenantId: string;
  generatedAt: string;
  input: OmniPulseRunInput;
  selectedPillar: ContentPillar;
  modules: EngineModule[];
  trendSignals: string[];
  channelPlan: ChannelTemplate[];
  contentItems: ContentItem[];
  documentary: DocumentaryPlan;
  policyEvents: PolicyEvent[];
  qaGates: QaGate[];
  platformPackages: PlatformPackage[];
  financialModel: FinancialModel;
  operatingDecision: {
    readyToPublish: boolean;
    requiresHumanExceptionQueue: boolean;
    nextBestAction: string;
    scaleDecision: "hold" | "test" | "scale";
  };
}

export interface OmniPulseSnapshot {
  brand: {
    name: string;
    palette: Record<string, string>;
    gradient: string;
  };
  pillars: ContentPillar[];
  modules: EngineModule[];
  connectors: PlatformConnector[];
  providers: ProviderConnector[];
  channelTemplates: ChannelTemplate[];
  sixSigmaCtqs: string[];
  payPalPlans: string[];
  latestRun: OmniPulseRun;
}

const brandPalette = {
  mainMagenta: "#CB19AF",
  deepViolet: "#AD10CF",
  midPurpleMagenta: "#BC12BD",
  hotPink: "#DA279B",
  brightRose: "#ED3782",
  electricViolet: "#9B0AE8",
  paleLavender: "#F3B5F3",
  white: "#FEFBFE",
};

export const contentPillars: ContentPillar[] = [
  {
    code: "provocative_fixes",
    name: "Provocative Fixes",
    promise: "Debate-safe tension, myth correction, and useful contradiction.",
    defaultRisk: "review",
    channels: ["RageFix", "WhyThough", "FixTheMyth"],
  },
  {
    code: "visual_addiction",
    name: "Visual Addiction",
    promise: "Satisfying loops, transformations, process visuals, and low-language global formats.",
    defaultRisk: "warning",
    channels: ["LoopLab", "SatisfyCore", "OddlySatisfy"],
  },
  {
    code: "curiosity_facts",
    name: "Curiosity and Facts",
    promise: "Sourced explainers, mysteries, fact reveals, and what-if formats.",
    defaultRisk: "warning",
    channels: ["FactQuest", "MindHook", "MysteryGrid"],
  },
  {
    code: "rankings_comparisons",
    name: "Rankings and Comparisons",
    promise: "Versus formats, scoreboards, product/category choices, and structured opinion.",
    defaultRisk: "warning",
    channels: ["RankIt", "CompareLab", "VersusWorld"],
  },
  {
    code: "practical_utility",
    name: "Practical Utility",
    promise: "Useful shortcuts, safe hacks, DIY steps, and save-worthy workflows.",
    defaultRisk: "warning",
    channels: ["QuickFix", "DailyShortcut", "UtilityLab"],
  },
  {
    code: "emotional_stories",
    name: "Emotional Stories",
    promise: "Micro-drama, fictional human moments, and cinematic narrative retention.",
    defaultRisk: "review",
    channels: ["StoryRush", "HeartToHeart", "TinyDrama"],
  },
  {
    code: "world_polls",
    name: "World Polls",
    promise: "PulseWorld questions, global choices, result maps, and participation loops.",
    defaultRisk: "warning",
    channels: ["PulseWorld", "VoteGlobal", "WorldSays"],
  },
];

export const engineModules: EngineModule[] = [
  { code: "trend_scout", name: "TrendScout", role: "Signal intake and opportunity scoring", status: "ready", outputs: ["trend_signals", "topic_clusters"] },
  { code: "brief_forge", name: "BriefForge", role: "Demand to structured content briefs", status: "ready", outputs: ["content_briefs", "hooks"] },
  { code: "scriptor", name: "Scriptor", role: "Scripts, captions, claims, CTAs, metadata", status: "ready", outputs: ["scene_timelines", "claim_lists"] },
  { code: "visual_planner", name: "Visual Planner", role: "Template, stock, generative, or documentary render plan", status: "ready", outputs: ["render_plan", "asset_requirements"] },
  { code: "asset_gen", name: "AssetGen", role: "Generated, licensed, or owned asset resolution", status: "ready", outputs: ["asset_records", "rights_records"] },
  { code: "renderer", name: "Renderer", role: "Remotion and FFmpeg output production", status: "ready", outputs: ["mp4", "captions", "thumbnails", "manifests"] },
  { code: "policy_os", name: "PolicyOS", role: "Originality, rights, fact, label, account health, and audit", status: "ready", outputs: ["policy_events", "risk_scores"] },
  { code: "pulse_post", name: "PulsePost", role: "Quota-aware publishing, export, retry, and scheduling", status: "gated", outputs: ["platform_packages", "post_ids"] },
  { code: "signal_loop", name: "SignalLoop", role: "Analytics, rewards, experiments, and optimization", status: "ready", outputs: ["analytics_snapshots", "variant_recommendations"] },
  { code: "model_mesh", name: "ModelMesh", role: "Provider routing by cost, quality, risk, and tenant plan", status: "ready", outputs: ["provider_calls", "usage_events"] },
  { code: "quota_broker", name: "QuotaBroker", role: "Rate-limit buckets, reservations, and cooldowns", status: "ready", outputs: ["quota_state", "throttle_decisions"] },
  { code: "idempotency_ledger", name: "IdempotencyLedger", role: "Duplicate render, publish, and webhook prevention", status: "ready", outputs: ["idempotency_keys", "conflict_decisions"] },
  { code: "human_exception_queue", name: "Human Exception Queue", role: "Bounded review for rights, claims, monetization, and account health", status: "ready", outputs: ["review_tasks", "sla_decisions"] },
];

export const platformConnectors: PlatformConnector[] = [
  {
    platform: "YouTube",
    status: "private_publish_ready",
    auth: "OAuth youtube.upload scope",
    capabilities: ["video_upload", "metadata", "thumbnail", "captions", "analytics_later"],
    aiLabelSupport: true,
    quotaStrategy: "QuotaBroker reads verified videos.insert cost and project daily quota.",
    fallback: "Manual export or private/unlisted upload until audit/account trust is complete.",
    docsUrl: "https://developers.google.com/youtube/v3/docs/videos/insert",
  },
  {
    platform: "TikTok",
    status: "sandbox_ready",
    auth: "OAuth video.publish scope",
    capabilities: ["direct_post_init", "privacy_options", "creator_info", "status_fetch"],
    aiLabelSupport: true,
    quotaStrategy: "Per-user token limits and init cooldowns held by QuotaBroker.",
    fallback: "Manual export when app review or public posting is unavailable.",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-reference-direct-post",
  },
  {
    platform: "Instagram/Reels",
    status: "verification_required",
    auth: "Meta Graph API business/professional account permissions",
    capabilities: ["media_container", "publish", "insights"],
    aiLabelSupport: true,
    quotaStrategy: "Verify current Graph API limits and container processing state.",
    fallback: "Manual Reels package.",
    docsUrl: "https://developers.facebook.com/docs/",
  },
  {
    platform: "X",
    status: "sandbox_ready",
    auth: "OAuth 2.0 user context",
    capabilities: ["post_create", "media_upload", "rate_limit_headers"],
    aiLabelSupport: true,
    quotaStrategy: "Parse endpoint rate-limit headers after every call.",
    fallback: "Manual export or hold when API plan economics are poor.",
    docsUrl: "https://docs.x.com/x-api/fundamentals/rate-limits",
  },
  {
    platform: "LinkedIn",
    status: "sandbox_ready",
    auth: "3-legged OAuth with versioned Marketing API headers",
    capabilities: ["video_initialize_upload", "post_create", "organization_posting"],
    aiLabelSupport: false,
    quotaStrategy: "Connector stores API version, token expiry, and org permissions.",
    fallback: "Manual professional package.",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api",
  },
  {
    platform: "Pinterest",
    status: "verification_required",
    auth: "Pinterest OAuth",
    capabilities: ["pin_create", "board_strategy", "analytics"],
    aiLabelSupport: false,
    quotaStrategy: "Universal and endpoint/category limits loaded from current docs.",
    fallback: "Manual pin package.",
    docsUrl: "https://developers.pinterest.com/docs/api/v5/",
  },
  {
    platform: "Reddit",
    status: "manual_export_only",
    auth: "OAuth with subreddit rule review",
    capabilities: ["submit", "rules_snapshot", "research_listening"],
    aiLabelSupport: false,
    quotaStrategy: "Manual review required before posting into any subreddit.",
    fallback: "Research/listening only.",
    docsUrl: "https://www.reddit.com/dev/api/",
  },
  {
    platform: "Telegram",
    status: "sandbox_ready",
    auth: "Bot token with channel admin rights",
    capabilities: ["send_message", "send_video", "send_document"],
    aiLabelSupport: false,
    quotaStrategy: "Channel posting queue with upload-size mode selection.",
    fallback: "Manual channel post.",
    docsUrl: "https://core.telegram.org/bots/api",
  },
  {
    platform: "Snapchat",
    status: "verification_required",
    auth: "Allowlist-sensitive OAuth/Public Profile API",
    capabilities: ["media_upload", "story", "spotlight"],
    aiLabelSupport: true,
    quotaStrategy: "Build only after allowlist/app eligibility is verified.",
    fallback: "Manual export.",
    docsUrl: "https://developers.snap.com/api/marketing-api/Public-Profile-API/GetStarted",
  },
];

export const providerConnectors: ProviderConnector[] = [
  {
    category: "Text and reasoning",
    primary: "OpenAI",
    fallbacks: ["Anthropic", "Groq", "Cerebras"],
    routingRule: "Use strongest model for policy-critical reasoning; use fast models for bulk drafts.",
    riskControl: "Log prompt version, model version, latency, cost, and eval score.",
  },
  {
    category: "Image",
    primary: "OpenAI image models",
    fallbacks: ["Flux", "SDXL"],
    routingRule: "Choose by commercial terms, quality, and cost per approved asset.",
    riskControl: "Rights ledger and prompt lineage required before render.",
  },
  {
    category: "Video",
    primary: "Template/stock-hybrid Renderer",
    fallbacks: ["Runway", "Luma", "Kling", "Sora/Veo where accessible"],
    routingRule: "Default to deterministic render; use generative video only for premium shots.",
    riskControl: "Cost ceiling, rights terms, synthetic label, visual QA.",
  },
  {
    category: "Voice",
    primary: "ElevenLabs",
    fallbacks: ["OpenAI TTS", "local TTS"],
    routingRule: "Use premium voice for documentaries; lower-cost voice for tests.",
    riskControl: "Voice consent, commercial license, and synthetic voice metadata.",
  },
  {
    category: "Payment",
    primary: "PayPal",
    fallbacks: [],
    routingRule: "Subscriptions, usage credits, webhooks, and reconciliation use PayPal.",
    riskControl: "Webhook signature verification and idempotency required.",
  },
];

export const channelTemplates: ChannelTemplate[] = [
  { code: "factquest", name: "FactQuest", pillar: "curiosity_facts", audience: "global curious viewers", cadence: "2-3/day", riskLevel: "warning", monetization: ["YouTube", "sponsorship", "newsletter"] },
  { code: "quickfix", name: "QuickFix", pillar: "practical_utility", audience: "save-first utility viewers", cadence: "1-3/day", riskLevel: "warning", monetization: ["affiliate", "sponsorship", "digital_products"] },
  { code: "rankit", name: "RankIt", pillar: "rankings_comparisons", audience: "choice and comparison seekers", cadence: "2-4/day", riskLevel: "warning", monetization: ["affiliate", "sponsor", "buyer_guides"] },
  { code: "looplab", name: "LoopLab", pillar: "visual_addiction", audience: "global low-language visual viewers", cadence: "3-5/day", riskLevel: "warning", monetization: ["platform_revenue", "licensing"] },
  { code: "pulseworld", name: "PulseWorld", pillar: "world_polls", audience: "participation and opinion viewers", cadence: "3-6/day", riskLevel: "warning", monetization: ["poll_reports", "sponsor", "SaaS_poll_tools"] },
];

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function makeId(prefix: string, seed: string): string {
  return `${prefix}_${stableHash(seed).toString(36).slice(0, 8)}`;
}

function normalizePlatform(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "YouTube";
  const lower = trimmed.toLowerCase();
  const connector = platformConnectors.find((c) => c.platform.toLowerCase().startsWith(lower));
  return connector?.platform ?? trimmed;
}

function normalizeInput(input: Partial<OmniPulseRunInput> = {}): OmniPulseRunInput {
  const topic = (input.topic ?? "Launch OmniPulse Network with FactQuest, QuickFix, RankIt, LoopLab, and PulseWorld").trim();
  const platforms = (input.platforms?.length ? input.platforms : ["YouTube", "TikTok", "Instagram/Reels", "Pinterest"]).map(normalizePlatform);
  return {
    topic,
    objective: (input.objective ?? "Generate a compliant media operating run that creates content, packages platforms, tracks QA, and prepares monetization.").trim(),
    outputProfile: input.outputProfile ?? "network-launch",
    targetMinutes: Math.max(1, Math.min(60, Math.round(input.targetMinutes ?? 12))),
    platforms,
    languages: input.languages?.length ? input.languages : ["en-US"],
    riskTolerance: input.riskTolerance ?? "balanced",
    budgetCeilingUsd: Math.max(5, Math.min(500, input.budgetCeilingUsd ?? 75)),
    tenantId: input.tenantId ?? "internal_phoenix",
  };
}

function selectPillar(input: OmniPulseRunInput): ContentPillar {
  const text = `${input.topic} ${input.objective}`.toLowerCase();
  if (/(poll|vote|world says|opinion|choice)/.test(text)) return contentPillars.find((p) => p.code === "world_polls")!;
  if (/(rank|versus|compare|best|worst|top)/.test(text)) return contentPillars.find((p) => p.code === "rankings_comparisons")!;
  if (/(fix|hack|shortcut|diy|utility|tool)/.test(text)) return contentPillars.find((p) => p.code === "practical_utility")!;
  if (/(loop|satisfying|visual|calm|transformation)/.test(text)) return contentPillars.find((p) => p.code === "visual_addiction")!;
  if (/(story|emotional|drama|heart)/.test(text)) return contentPillars.find((p) => p.code === "emotional_stories")!;
  if (/(rage|myth|wrong|mistake|provocative|debate)/.test(text)) return contentPillars.find((p) => p.code === "provocative_fixes")!;
  return contentPillars.find((p) => p.code === "curiosity_facts")!;
}

function isHighRiskTopic(input: OmniPulseRunInput): boolean {
  return /(medical|health|legal|law|finance|investment|election|politic|war|crisis|minor|children|allegation|crime)/i.test(
    `${input.topic} ${input.objective}`,
  );
}

function renderPathFor(itemIndex: number, profile: OmniPulseOutputProfile): ContentItem["renderPath"] {
  if (profile === "documentary-deep-dive") return itemIndex === 0 ? "stock-hybrid" : "template";
  if (itemIndex % 5 === 0) return "generative-hybrid";
  if (itemIndex % 3 === 0) return "stock-hybrid";
  return "template";
}

function estimateItemCost(path: ContentItem["renderPath"], profile: OmniPulseOutputProfile): number {
  const base = path === "template" ? 0.12 : path === "stock-hybrid" ? 0.45 : path === "generative-hybrid" ? 1.8 : 6.0;
  return Number((profile === "documentary-deep-dive" ? base * 1.4 : base).toFixed(2));
}

function buildContentItems(input: OmniPulseRunInput, pillar: ContentPillar): ContentItem[] {
  const count = input.outputProfile === "documentary-deep-dive" ? 4 : input.outputProfile === "daily-shorts" ? 8 : 12;
  return Array.from({ length: count }, (_, index) => {
    const path = renderPathFor(index, input.outputProfile);
    const format =
      input.outputProfile === "documentary-deep-dive"
        ? index === 0
          ? "long-form anchor"
          : "documentary cutdown"
        : index % 4 === 0
          ? "poll/result"
          : index % 3 === 0
            ? "ranking"
            : index % 2 === 0
              ? "utility short"
              : "curiosity short";
    const policyStatus: GateStatus = isHighRiskTopic(input) || pillar.defaultRisk === "review" ? "review" : "pass";
    return {
      id: makeId("cnt", `${input.topic}-${format}-${index}`),
      title: `${pillar.name}: ${input.topic} #${index + 1}`,
      pillar: pillar.code,
      format,
      targetPlatformPackages: input.platforms,
      renderPath: path,
      estimatedCostUsd: estimateItemCost(path, input.outputProfile),
      status: policyStatus === "pass" ? "ready" : "policy_review",
      policyStatus,
    };
  });
}

function buildDocumentary(input: OmniPulseRunInput): DocumentaryPlan {
  const enabled = input.outputProfile === "documentary-deep-dive" || input.targetMinutes >= 30;
  if (!enabled) {
    return {
      enabled: false,
      title: "",
      targetMinutes: 0,
      thesis: "",
      chapters: [],
      cutdownCandidates: 0,
      assemblyPlan: [],
      complianceNotes: [],
    };
  }
  const chapterCount = input.targetMinutes >= 50 ? 8 : input.targetMinutes >= 30 ? 6 : 4;
  const chapterMinutes = Math.max(4, Math.round(input.targetMinutes / chapterCount));
  const chapters = Array.from({ length: chapterCount }, (_, index): DocumentaryChapter => {
    const path: DocumentaryChapter["renderPath"] = index === 0 ? "generative-hybrid" : index % 2 === 0 ? "stock-hybrid" : "template";
    return {
      id: makeId("doc_ch", `${input.topic}-${index}`),
      title: `Chapter ${index + 1}: ${["Origin", "Momentum", "Conflict", "Turning Point", "Hidden System", "Global Impact", "Lessons", "Future"][index] ?? "Deep Dive"}`,
      targetMinutes: chapterMinutes,
      researchQuestions: [
        `What is the strongest source-backed explanation for ${input.topic}?`,
        "Which claims require explicit evidence before narration?",
        "What visual references can be recreated without rights risk?",
      ],
      claimCount: 8 + index * 3,
      sourceRequirement: "minimum 3 reputable sources and source snapshots per chapter",
      renderPath: path,
      qaStatus: isHighRiskTopic(input) ? "review" : "warning",
    };
  });
  return {
    enabled: true,
    title: `Deep Dive: ${input.topic}`,
    targetMinutes: input.targetMinutes,
    thesis: `${input.topic} explained through a sourced, chaptered narrative with reusable cutdowns.`,
    chapters,
    cutdownCandidates: chapterCount * 3,
    assemblyPlan: [
      "Generate chapter voiceover with one consistent narration profile.",
      "Render chapters independently with manifest and source ledger.",
      "Normalize audio, captions, chapter cards, color, and lower thirds.",
      "Assemble final 16:9 master plus short-form cutdowns through FFmpeg/Remotion.",
    ],
    complianceNotes: [
      "Do not invent citations.",
      "Synthetic reenactments must be labeled when realistic.",
      "Every factual chapter needs claim extraction and source mapping.",
    ],
  };
}

function buildPolicyEvents(input: OmniPulseRunInput, items: ContentItem[], documentary: DocumentaryPlan): PolicyEvent[] {
  const events: PolicyEvent[] = [
    {
      module: "Rights Engine",
      ruleCode: "RIGHTS_LEDGER_REQUIRED",
      status: "pass",
      severity: "critical",
      message: "All generated, licensed, and owned assets must carry provenance before render approval.",
      correctiveAction: "Block render if asset origin, provider, license, or prompt lineage is missing.",
    },
    {
      module: "Originality Engine",
      ruleCode: "NO_NEAR_DUPLICATE_SPAM",
      status: "pass",
      severity: "high",
      message: "Internal phash, transcript, title, and structure checks are required before package creation.",
      correctiveAction: "Require meaningful transformation before variants can be scheduled.",
    },
    {
      module: "AI Label Engine",
      ruleCode: "SYNTHETIC_DISCLOSURE",
      status: input.platforms.some((p) => ["TikTok", "X", "Snapchat"].includes(p)) ? "warning" : "pass",
      severity: "high",
      message: "AI-generated media needs platform-specific label handling where supported or required.",
      correctiveAction: "Set is_aigc, made_with_ai, or manual disclosure fields per connector capability.",
    },
    {
      module: "Account Health Engine",
      ruleCode: "CONTROLLED_SCALE_ONLY",
      status: "warning",
      severity: "medium",
      message: "Direct publishing is gated behind quota, app review, token, and account-health checks.",
      correctiveAction: "Use manual export or private/sandbox publish until platform readiness is proven.",
    },
  ];
  if (isHighRiskTopic(input)) {
    events.push({
      module: "Fact Engine",
      ruleCode: "HIGH_STAKES_REVIEW",
      status: "review",
      severity: "critical",
      message: "High-stakes or sensitive topic language detected.",
      correctiveAction: "Route scripts, claims, sources, titles, and thumbnails to the Human Exception Queue.",
    });
  } else {
    events.push({
      module: "Fact Engine",
      ruleCode: "CLAIM_SOURCE_COVERAGE",
      status: documentary.enabled || items.some((item) => item.format.includes("curiosity")) ? "warning" : "pass",
      severity: "medium",
      message: "Factual formats need source coverage and stale-date checks before publishing.",
      correctiveAction: "Attach sources to claims or soften unsupported language.",
    });
  }
  return events;
}

function worstStatus(statuses: GateStatus[]): GateStatus {
  if (statuses.includes("block")) return "block";
  if (statuses.includes("review")) return "review";
  if (statuses.includes("warning")) return "warning";
  return "pass";
}

function buildQaGates(input: OmniPulseRunInput, events: PolicyEvent[], items: ContentItem[], documentary: DocumentaryPlan): QaGate[] {
  const policyStatus = worstStatus(events.map((event) => event.status));
  const publishDefects = input.platforms.filter((platform) => {
    const connector = platformConnectors.find((c) => c.platform === platform);
    return !connector || connector.status === "verification_required" || connector.status === "manual_export_only";
  }).length;
  return [
    {
      name: "Define Gate",
      dmaicPhase: "define",
      ctq: "Clear audience, pillar, output profile, and platform targets.",
      status: "pass",
      score: 96,
      defectCount: 0,
      evidence: [input.topic, input.objective, input.outputProfile],
    },
    {
      name: "Measure Gate",
      dmaicPhase: "measure",
      ctq: "Every item has estimated cost, render path, and platform package intent.",
      status: "pass",
      score: 92,
      defectCount: 0,
      evidence: [`${items.length} content items`, `${input.platforms.length} platforms`],
    },
    {
      name: "Analyze Gate",
      dmaicPhase: "analyze",
      ctq: "PolicyOS reviews rights, originality, claims, labels, and account health.",
      status: policyStatus,
      score: policyStatus === "pass" ? 94 : policyStatus === "warning" ? 82 : 68,
      defectCount: events.filter((event) => event.status !== "pass").length,
      evidence: events.map((event) => `${event.ruleCode}:${event.status}`),
    },
    {
      name: "Improve Gate",
      dmaicPhase: "improve",
      ctq: "SignalLoop recommends variants only after policy-safe learning.",
      status: "warning",
      score: 84,
      defectCount: 1,
      evidence: ["Synthetic analytics ready; live platform analytics awaits connected accounts."],
    },
    {
      name: "Control Gate",
      dmaicPhase: "control",
      ctq: "QuotaBroker, IdempotencyLedger, and audit logs prevent uncontrolled scale.",
      status: publishDefects > 0 ? "warning" : "pass",
      score: publishDefects > 0 ? 80 : 94,
      defectCount: publishDefects,
      evidence: input.platforms.map((platform) => `${platform}: ${platformConnectors.find((c) => c.platform === platform)?.status ?? "unregistered"}`),
    },
    {
      name: "Verify Gate",
      dmaicPhase: "verify",
      ctq: "Documentary chapters and long-form assembly must pass source, caption, render, and audio QA.",
      status: documentary.enabled ? "warning" : "pass",
      score: documentary.enabled ? 78 : 95,
      defectCount: documentary.enabled ? documentary.chapters.filter((chapter) => chapter.qaStatus !== "pass").length : 0,
      evidence: documentary.enabled ? [`${documentary.chapters.length} chapters planned`, `${documentary.cutdownCandidates} cutdowns`] : ["Short-form run only"],
    },
  ];
}

function buildPlatformPackages(input: OmniPulseRunInput, items: ContentItem[]): PlatformPackage[] {
  return items.flatMap((item) =>
    input.platforms.map((platform) => {
      const connector = platformConnectors.find((c) => c.platform === platform);
      const publishMode: PlatformPackage["publishMode"] =
        !connector
          ? "blocked"
          : connector.status === "production_ready"
            ? "direct_ready"
            : connector.status === "private_publish_ready" || connector.status === "sandbox_ready"
              ? "direct_private"
              : connector.status === "manual_export_only" || connector.status === "verification_required"
                ? "manual_export"
                : "blocked";
      return {
        id: makeId("pkg", `${item.id}-${platform}`),
        platform,
        contentItemId: item.id,
        publishMode,
        requiredLabels: connector?.aiLabelSupport ? ["ai_generated_content"] : [],
        quotaBucket: `${input.tenantId}:${platform.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        schedulePolicy: "local_prime_time_with_quota_hold",
        idempotencyKey: makeId("idem", `${input.tenantId}-${item.id}-${platform}`),
      };
    }),
  );
}

function buildFinancialModel(input: OmniPulseRunInput, items: ContentItem[], documentary: DocumentaryPlan): FinancialModel {
  const contentCost = items.reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  const documentaryCost = documentary.enabled
    ? documentary.chapters.reduce((sum, chapter) => {
        const base = chapter.renderPath === "template" ? 1.5 : chapter.renderPath === "stock-hybrid" ? 4.5 : 12;
        return sum + base;
      }, 0)
    : 0;
  const estimated = Number((contentCost + documentaryCost).toFixed(2));
  const minutes = documentary.enabled ? documentary.targetMinutes : Math.max(1, input.targetMinutes);
  return {
    estimatedRunCostUsd: estimated,
    costPerFinishedMinuteUsd: Number((estimated / minutes).toFixed(2)),
    monthlySeedBudgetUsd: 2500,
    planReadiness: estimated <= input.budgetCeilingUsd ? "inside_budget" : "requires_budget_approval",
    revenueLayers: ["platform_revenue", "affiliate", "sponsorship", "licensing", "owned_funnels", "SaaS_subscriptions"],
    payPal: {
      required: true,
      products: ["Starter", "Growth", "Agency", "Scale", "Enterprise"],
      webhookControls: ["signature_verification", "event_dedupe", "subscription_reconciliation", "usage_credit_ledger"],
    },
  };
}

function buildTrendSignals(input: OmniPulseRunInput, pillar: ContentPillar): string[] {
  return [
    `${pillar.name} demand mapped to ${input.languages.join(", ")} locale pack.`,
    `${input.platforms.join(", ")} package rules loaded through PulsePost capability registry.`,
    "Template/stock-hybrid rendering preferred for cost, QA, and monetization control.",
    "PolicyOS gates are active before render, package, publish, analytics, and variant generation.",
    input.outputProfile === "documentary-deep-dive"
      ? "Documentary mode enabled: chaptered research, claims, sources, voice, assembly, and cutdowns."
      : "Short-form network mode enabled: briefs, variants, packages, and SignalLoop learning.",
  ];
}

export function runOmniPulseEngine(partialInput: Partial<OmniPulseRunInput> = {}): OmniPulseRun {
  const input = normalizeInput(partialInput);
  const selectedPillar = selectPillar(input);
  const contentItems = buildContentItems(input, selectedPillar);
  const documentary = buildDocumentary(input);
  const policyEvents = buildPolicyEvents(input, contentItems, documentary);
  const qaGates = buildQaGates(input, policyEvents, contentItems, documentary);
  const platformPackages = buildPlatformPackages(input, contentItems);
  const financialModel = buildFinancialModel(input, contentItems, documentary);
  const worstGate = worstStatus(qaGates.map((gate) => gate.status));
  const requiresReview = policyEvents.some((event) => event.status === "review" || event.status === "block");
  const directPackagesReady = platformPackages.some((pkg) => pkg.publishMode === "direct_ready" || pkg.publishMode === "direct_private");

  return {
    id: makeId("run", `${input.tenantId}-${input.topic}-${Date.UTC(2026, 4, 17)}`),
    tenantId: input.tenantId ?? "internal_phoenix",
    generatedAt: new Date().toISOString(),
    input,
    selectedPillar,
    modules: engineModules,
    trendSignals: buildTrendSignals(input, selectedPillar),
    channelPlan: channelTemplates,
    contentItems,
    documentary,
    policyEvents,
    qaGates,
    platformPackages,
    financialModel,
    operatingDecision: {
      readyToPublish: worstGate === "pass" && directPackagesReady && !requiresReview,
      requiresHumanExceptionQueue: requiresReview || worstGate === "review" || worstGate === "block",
      nextBestAction: requiresReview
        ? "Resolve Human Exception Queue items before publish or scale."
        : directPackagesReady
          ? "Run private/sandbox publish and collect first analytics snapshots."
          : "Export manual platform packages while connector verification completes.",
      scaleDecision: worstGate === "pass" ? "scale" : worstGate === "warning" ? "test" : "hold",
    },
  };
}

export function createOmniPulseSnapshot(): OmniPulseSnapshot {
  return {
    brand: {
      name: "OmniPulse OS",
      palette: brandPalette,
      gradient: "linear-gradient(135deg, #9B0AE8 0%, #BC12BD 45%, #ED3782 100%)",
    },
    pillars: contentPillars,
    modules: engineModules,
    connectors: platformConnectors,
    providers: providerConnectors,
    channelTemplates,
    sixSigmaCtqs: [
      "originality score",
      "rights completeness",
      "policy pass rate",
      "render success rate",
      "publish success rate",
      "cost per finished minute",
      "tenant isolation",
      "PayPal webhook accuracy",
      "analytics freshness",
      "account health",
    ],
    payPalPlans: ["Starter", "Growth", "Agency", "Scale", "Enterprise"],
    latestRun: runOmniPulseEngine({
      topic: "Launch OmniPulse Network with FactQuest, QuickFix, RankIt, LoopLab, PulseWorld, and Documentary Engine",
      outputProfile: "network-launch",
      targetMinutes: 12,
    }),
  };
}
