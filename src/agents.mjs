import { createHash } from "node:crypto";
import { generateWithLLM } from "./providers/llm.mjs";
import { generateImageAsset } from "./providers/images.mjs";
import { generateVoiceAsset } from "./providers/audio.mjs";
import { renderTemplateVideo } from "./render/renderer.mjs";
import { runPolicyOS } from "./policy.mjs";
import { distribute } from "./connectors/index.mjs";
import { updateRecursiveLearning, scoreTopic } from "./learning.mjs";

const pillars = [
  { name: "rage_bait", trigger: "anger/disbelief", platformFit: ["TikTok", "YouTube", "Instagram"] },
  { name: "visual_addiction", trigger: "satisfaction/ASMR", platformFit: ["YouTube", "TikTok", "Pinterest"] },
  { name: "curiosity_gap", trigger: "mystery/reveal", platformFit: ["YouTube", "X", "LinkedIn"] },
  { name: "ranking", trigger: "debate/list", platformFit: ["YouTube", "TikTok", "Instagram"] },
  { name: "life_hack", trigger: "utility/save", platformFit: ["Pinterest", "Instagram", "YouTube"] },
  { name: "emotional_story", trigger: "empathy/share", platformFit: ["YouTube", "Instagram", "Telegram"] },
  { name: "global_poll", trigger: "participation/identity", platformFit: ["X", "Instagram", "TikTok", "YouTube"] },
];

const fallbackTrendSeeds = [
  ["Why everyone is using AI to make videos wrong", "curiosity_gap", 91],
  ["Satisfying kitchen reset in 30 seconds", "visual_addiction", 86],
  ["Top 7 jobs AI will not replace first", "ranking", 84],
  ["The five minute phone cleanup hack", "life_hack", 82],
  ["Africa vs world: who works hardest online", "global_poll", 79],
  ["This productivity trick looks fake but works", "rage_bait", 77],
  ["A founder lost everything then rebuilt with AI", "emotional_story", 73],
];

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function log(repo, runId, agent, status, message, metadata = {}) {
  await repo.addJobLog({ run_id: runId, agent, status, message, metadata });
}

export async function trendScout({ repo, run }) {
  await log(repo, run.id, "TrendScout", "started", "Collecting trend candidates.");
  const trends = [];
  for (const [topic, pillar, baseScore] of fallbackTrendSeeds) {
    const trend = await repo.addTrend({
      source: "local_seeded_trend_engine",
      topic,
      pillar,
      region: "global",
      score: scoreTopic({ topic, pillar, score: baseScore }),
      metadata: {
        fallback: true,
        reason: "Live trend provider keys are not configured yet.",
        trendVelocity: baseScore / 100,
      },
    });
    trends.push(trend);
  }
  await log(repo, run.id, "TrendScout", "completed", `Ranked ${trends.length} trend candidates.`, { topTopic: trends[0]?.topic });
  return trends;
}

export async function briefForge({ repo, run, trend }) {
  await log(repo, run.id, "BriefForge", "started", "Generating content brief.", { topic: trend.topic });
  const fallback = {
    title: trend.topic,
    pillar: trend.pillar,
    hook: `Most people miss this: ${trend.topic}.`,
    audience: "Global short-form viewers who respond to curiosity, practical value, and visual payoff.",
    emotionalTrigger: pillars.find(item => item.name === trend.pillar)?.trigger || "curiosity",
    targetPlatforms: run.input.platforms || pillars.find(item => item.name === trend.pillar)?.platformFit || ["YouTube", "TikTok"],
    estimatedEngagement: Math.round(trend.score),
    promise: "Deliver one sharp idea with a clear visual payoff in under 45 seconds.",
  };
  const result = await generateWithLLM({
    system: "You are BriefForge, an AI content strategist. Return compact JSON only.",
    prompt: `Create a viral content brief for topic "${trend.topic}" in pillar "${trend.pillar}".`,
    fallback,
  });
  await log(repo, run.id, "BriefForge", "completed", "Brief generated.", { provider: result.provider });
  return result.output;
}

export async function scriptor({ repo, run, brief }) {
  await log(repo, run.id, "Scriptor", "started", "Generating scene-by-scene script.");
  const fallback = {
    voiceover: [
      brief.hook,
      "Here is the part that makes people stop scrolling.",
      "The pattern is simple once you see it.",
      "Save this before it disappears from your feed.",
    ],
    scenes: [
      { second: 0, visual: "Fast moving gradient title card", overlay: brief.title },
      { second: 2, visual: "Close-up visual proof or transformation", overlay: "Wait for it" },
      { second: 5, visual: "Before and after comparison", overlay: "Most people miss this" },
      { second: 8, visual: "Final reveal and CTA", overlay: "Follow for the next one" },
    ],
    caption: `${brief.title} #viralforge #aitools #shorts`,
    hashtags: ["#viralforge", "#shorts", "#ai", "#learn"],
  };
  const result = await generateWithLLM({
    system: "You are Scriptor. Write concise JSON scripts for faceless short-form video.",
    prompt: `Create a scene-by-scene script for this brief: ${JSON.stringify(brief)}`,
    fallback,
  });
  await log(repo, run.id, "Scriptor", "completed", "Script generated.", { provider: result.provider });
  return result.output;
}

export async function visualPlanner({ repo, run, brief, script }) {
  await log(repo, run.id, "VisualPlanner", "started", "Choosing render path and media plan.");
  const costCeiling = Number(run.input.budgetUsd || 100);
  const renderPath = costCeiling >= 200 && process.env.RUNWAY_API_KEY ? "premium_ai_video" : "ffmpeg_template";
  const plan = {
    renderPath,
    aspectRatios: ["9:16", "16:9", "1:1"],
    imagePrompt: `Electric magenta-violet faceless viral video thumbnail for: ${brief.title}`,
    voiceText: script.voiceover.join(" "),
    budgetUsd: costCeiling,
    aiVideoProviders: {
      runway: Boolean(process.env.RUNWAY_API_KEY),
      luma: Boolean(process.env.LUMA_API_KEY),
      kling: Boolean(process.env.KLING_API_KEY),
      note: "Premium providers are optional upgrades; FFmpeg/Remotion path is required.",
    },
  };
  await log(repo, run.id, "VisualPlanner", "completed", `Render path selected: ${renderPath}.`, plan);
  return plan;
}

export async function assetGen({ repo, storage, run, content, brief, plan }) {
  await log(repo, run.id, "AssetGen", "started", "Generating image and voice assets.");
  const image = await generateImageAsset({ storage, runId: run.id, title: brief.title, prompt: plan.imagePrompt });
  const imageAsset = await repo.addAsset({
    run_id: run.id,
    content_id: content.id,
    type: "image",
    uri: image.uri,
    source: image.storage === "local_file" ? "local_generated" : "generated",
    hash: image.hash,
    metadata: { key: image.key, storage: image.storage, prompt: plan.imagePrompt },
  });
  const voice = await generateVoiceAsset({ storage, runId: run.id, text: plan.voiceText });
  const voiceAsset = await repo.addAsset({
    run_id: run.id,
    content_id: content.id,
    type: "audio",
    uri: voice.uri,
    source: voice.storage === "local_file" ? "local_generated" : "generated",
    hash: voice.hash,
    metadata: { key: voice.key, storage: voice.storage, provider: "deepgram_or_local_fallback" },
  });
  await log(repo, run.id, "AssetGen", "completed", "Assets generated and stored.", { assets: [imageAsset.id, voiceAsset.id] });
  return [imageAsset, voiceAsset];
}

export async function renderer({ repo, storage, run, content, brief, script, assets }) {
  await log(repo, run.id, "Renderer", "started", "Rendering MP4 with FFmpeg template path.");
  const rendered = await renderTemplateVideo({ storage, runId: run.id, title: brief.title, script, assets, durationSeconds: 10 });
  const asset = await repo.addAsset({
    run_id: run.id,
    content_id: content.id,
    type: "video",
    uri: rendered.uri,
    source: rendered.storage === "local_file" ? "local_generated" : "generated",
    hash: rendered.hash,
    metadata: rendered,
  });
  await log(repo, run.id, "Renderer", "completed", "Video rendered.", { assetId: asset.id, uri: asset.uri });
  return asset;
}

export async function runPipeline({ repo, storage, input = {} }) {
  const run = await repo.createRun({
    topic: input.topic || "Autonomous ViralForge launch run",
    objective: input.objective || "Create a governed viral short and package it for every configured platform.",
    budgetUsd: Number(input.budgetUsd || 120),
    risk: input.risk || "standard",
    platforms: input.platforms || ["YouTube", "TikTok", "Instagram", "X", "LinkedIn", "Pinterest", "Reddit", "Telegram"],
    requestedAt: new Date().toISOString(),
  });

  try {
    await repo.updateRun(run.id, { status: "running" });
    await log(repo, run.id, "Orchestrator", "started", "Pipeline started.", { inputHash: hash(run.input) });
    const trends = await trendScout({ repo, run });
    const selectedTrend = input.topic
      ? { topic: input.topic, pillar: input.pillar || "curiosity_gap", score: 85, metadata: { operatorProvided: true } }
      : trends[0];
    const brief = await briefForge({ repo, run, trend: selectedTrend });
    const script = await scriptor({ repo, run, brief });
    const score = scoreTopic({ topic: brief.title, pillar: brief.pillar, score: selectedTrend.score });
    const content = await repo.addContent({
      run_id: run.id,
      status: "scripted",
      brief,
      script,
      metadata: { selectedTrend, viralScore: score },
    });
    const plan = await visualPlanner({ repo, run, brief, script });
    const generatedAssets = await assetGen({ repo, storage, run, content, brief, plan });
    const videoAsset = await renderer({ repo, storage, run, content, brief, script, assets: generatedAssets });
    const policy = await runPolicyOS({ repo, run: { ...run, output: { finance: { estimatedCost: Math.round(score / 2) } } }, content, assets: [...generatedAssets, videoAsset] });
    const posts = policy.approved || !policy.gates.some(gate => gate.status === "block")
      ? await distribute({ repo, run, content, videoAsset })
      : [];
    const metrics = await updateRecursiveLearning({ repo, run: { ...run, score, output: { brief } }, posts });
    const output = {
      selectedTrend,
      brief,
      script,
      plan,
      contentId: content.id,
      videoAssetId: videoAsset.id,
      policy,
      posts: posts.map(post => ({ id: post.id, platform: post.platform, status: post.status })),
      recursiveLearning: metrics,
      finance: { estimatedCost: Math.round(score / 2), budgetUsd: run.input.budgetUsd },
    };
    await repo.updateContent(content.id, { status: policy.held ? "reviewing" : "packaged", metadata: { ...content.metadata, policy } });
    const finalStatus = policy.held ? "held" : "completed";
    const updated = await repo.updateRun(run.id, {
      status: finalStatus,
      decision: policy.held ? "Hold for human approval" : "Ready/exported; live publish waits for connector readiness",
      score,
      output,
    });
    await log(repo, run.id, "Orchestrator", "completed", `Pipeline ${finalStatus}.`, { score, posts: posts.length });
    return updated;
  } catch (error) {
    await log(repo, run.id, "Orchestrator", "failed", error.message, { stack: error.stack });
    await repo.updateRun(run.id, { status: "failed", decision: "Corrective action required", output: { error: error.message } });
    throw error;
  }
}

export async function runAutopilotTick({ repo, storage }) {
  const run = await runPipeline({
    repo,
    storage,
    input: {
      topic: "",
      objective: "Autonomous hourly trend-to-video production cycle.",
      budgetUsd: 120,
      risk: "standard",
    },
  });
  return run;
}
