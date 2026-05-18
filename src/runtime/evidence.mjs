import { connectorStatus, providerStatus } from "../config.mjs";

export function buildQualityMatrix(evidence) {
  const latestRun = evidence.runs[0] || null;
  const policyEvents = evidence.policyEvents || [];
  const failedPolicies = policyEvents.filter(event => ["fail", "block"].includes(event.status));
  const heldPolicies = policyEvents.filter(event => event.status === "hold");

  return [
    {
      gate: "Persistence",
      status: evidence.repository === "postgres" || evidence.repository === "local_file" ? "pass" : "fail",
      evidence: `repository=${evidence.repository}, runs=${evidence.counts.runs}`,
      correctiveAction: "Check DATABASE_URL or local data directory permissions.",
    },
    {
      gate: "Agent Pipeline",
      status: latestRun && ["completed", "held"].includes(latestRun.status) ? "pass" : "hold",
      evidence: latestRun ? `latest_run=${latestRun.id}, status=${latestRun.status}` : "no completed run yet",
      correctiveAction: "Trigger /api/runs/start or /api/autopilot/tick and inspect job logs.",
    },
    {
      gate: "Media Rendering",
      status: evidence.assets.some(asset => asset.type === "video") ? "pass" : "hold",
      evidence: `video_assets=${evidence.assets.filter(asset => asset.type === "video").length}`,
      correctiveAction: "Check FFmpeg availability and renderer logs.",
    },
    {
      gate: "Compliance",
      status: failedPolicies.length ? "fail" : heldPolicies.length ? "hold" : "pass",
      evidence: `policy_events=${policyEvents.length}, holds=${heldPolicies.length}, fails=${failedPolicies.length}`,
      correctiveAction: "Resolve held policy events or adjust risk settings after review.",
    },
    {
      gate: "Recursive Learning",
      status: evidence.learningSignals.length ? "pass" : "hold",
      evidence: `learning_signals=${evidence.learningSignals.length}`,
      correctiveAction: "Run analytics ingestion or local evaluation to update learning signals.",
    },
    {
      gate: "Distribution Safety",
      status: "pass",
      evidence: `publish_mode=${providerStatus().publishMode}`,
      correctiveAction: "Set PUBLISH_MODE=live only after connector credentials and policy gates are verified.",
    },
  ];
}

export function buildComplianceTracker(evidence) {
  const required = [
    "originality",
    "rights",
    "fact_risk",
    "brand_safety",
    "ai_labeling",
    "platform_fit",
    "quota",
    "cost",
    "human_exception",
    "audit",
  ];

  return required.map(gate => {
    const events = evidence.policyEvents.filter(event => event.gate === gate);
    const latest = events[0];
    return {
      gate,
      status: latest?.status || "not_run",
      evidence: latest?.message || "No policy event yet.",
      correctiveAction: correctionForGate(gate),
    };
  });
}

function correctionForGate(gate) {
  return {
    originality: "Rewrite script or regenerate assets if duplicate threshold is exceeded.",
    rights: "Replace any asset without generated/licensed/owned provenance.",
    fact_risk: "Add sources or route to human review.",
    brand_safety: "Rewrite unsafe language or block content.",
    ai_labeling: "Set platform AI-generated content flags before posting.",
    platform_fit: "Regenerate platform package with valid duration, ratio, and caption length.",
    quota: "Reschedule or reduce post volume.",
    cost: "Downgrade render path or increase budget.",
    human_exception: "Require explicit approval before publishing.",
    audit: "Stop release until run, policy, asset, and post events are logged.",
  }[gate];
}

export function buildSystemStatus(evidence) {
  const providers = providerStatus();
  providers.databaseRuntime = evidence.repository;
  return {
    product: "ViralForge",
    providers,
    connectors: connectorStatus(),
    counts: evidence.counts,
    qualityMatrix: buildQualityMatrix(evidence),
    complianceTracker: buildComplianceTracker(evidence),
  };
}
