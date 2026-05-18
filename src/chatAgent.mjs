import { connectorStatus, providerStatus } from "./config.mjs";

export async function forgeOpsReply({ repo, queue, message }) {
  const text = String(message || "").trim();
  const evidence = await repo.evidence();
  const lower = text.toLowerCase();

  if (/start|run|create|build/.test(lower)) {
    const job = await queue.enqueue({
      topic: text.replace(/^(start|run|create|build)\s*/i, "").trim() || "ForgeOps requested autonomous run",
      objective: "Operator requested run from ForgeOps chat.",
      budgetUsd: 120,
      risk: /strict|review|compliance/.test(lower) ? "strict" : "standard",
    });
    return {
      action: "run_enqueued",
      reply: `I queued a ViralForge run. Job ${job.id} is now processing through TrendScout, BriefForge, Scriptor, AssetGen, Renderer, PolicyOS, PulsePost, and SignalLoop.`,
      job,
    };
  }

  if (/key|credential|api|missing|connect/.test(lower)) {
    return {
      action: "connector_status",
      reply: "Here is what is missing or ready. Add these env vars in Railway, then restart the service.",
      providers: providerStatus(),
      connectors: connectorStatus(),
    };
  }

  if (/fail|error|why|blocked|hold/.test(lower)) {
    const latest = evidence.runs[0];
    const policies = evidence.policyEvents.slice(0, 10);
    const logs = evidence.jobLogs.slice(0, 10);
    return {
      action: "diagnosis",
      reply: latest
        ? `Latest run ${latest.id} is ${latest.status}. Decision: ${latest.decision || "none"}. Review recent policy events and job logs below.`
        : "No run exists yet. Start one from the console or ask me to run a topic.",
      latestRun: latest,
      policyEvents: policies,
      jobLogs: logs,
    };
  }

  if (/learn|winning|performance|better|recursive/.test(lower)) {
    return {
      action: "learning_summary",
      reply: `Recursive learning currently has ${evidence.learningSignals.length} learned signals. These weights influence future platform and pillar prioritization.`,
      learningSignals: evidence.learningSignals,
      analytics: evidence.analytics.slice(0, 20),
    };
  }

  return {
    action: "system_summary",
    reply: `ViralForge is online. Runs=${evidence.counts.runs}, assets=${evidence.counts.assets}, posts=${evidence.counts.posts}, learning_signals=${evidence.counts.learningSignals}. Ask me to start a run, diagnose failures, show missing API keys, or summarize learning.`,
    providers: providerStatus(),
    connectors: connectorStatus(),
    latestRun: evidence.runs[0] || null,
  };
}
