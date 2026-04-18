/**
 * metricsRouter.ts — tRPC router for voice latency and call quality metrics.
 *
 * Endpoints:
 *   getCallLatencies(callId)         → per-stage latencies + p50/p90/p95/p99
 *   getCallQuality(callId)           → sentiment, emotion, conversion, escalation
 *   getProviderMetrics(provider, tr) → Deepgram/Cartesia/Cerebras performance
 *   getLatencyTrend(timeRange)       → latency percentiles over time
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { computePercentiles } from "../services/latencyTracker";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateRange(timeRange: string): { fromDate: Date; toDate: Date } {
  const toDate = new Date();
  const fromDate = new Date();
  switch (timeRange) {
    case "1h":
      fromDate.setHours(fromDate.getHours() - 1);
      break;
    case "6h":
      fromDate.setHours(fromDate.getHours() - 6);
      break;
    case "24h":
      fromDate.setHours(fromDate.getHours() - 24);
      break;
    case "7d":
      fromDate.setDate(fromDate.getDate() - 7);
      break;
    case "30d":
      fromDate.setDate(fromDate.getDate() - 30);
      break;
    default:
      fromDate.setHours(fromDate.getHours() - 24);
  }
  return { fromDate, toDate };
}

function extractMsFromEvents(
  events: Array<{ extra: unknown }>,
  key = "ms"
): number[] {
  const out: number[] = [];
  for (const e of events) {
    const ex = e.extra as Record<string, unknown> | null;
    if (ex && typeof ex[key] === "number" && Number.isFinite(ex[key])) {
      out.push(ex[key] as number);
    }
  }
  return out;
}

function computeStageLatencies(
  events: Array<{ phase: string; msSinceCallStart: number | null }>
): {
  sttLatencyMs: number | null;
  llmTtftMs: number | null;
  ttsLatencyMs: number | null;
  turnLatencyMs: number | null;
  sttFinalToFirstAudioMs: number | null;
} {
  const ts: Record<string, number> = {};
  for (const e of events) {
    if (e.msSinceCallStart != null && !(e.phase in ts)) {
      ts[e.phase] = e.msSinceCallStart;
    }
  }

  const sttLatencyMs =
    ts["stt_final"] != null && ts["audio_received"] != null
      ? ts["stt_final"] - ts["audio_received"]
      : null;

  const llmTtftMs =
    ts["llm_ttft"] != null && ts["llm_start"] != null
      ? ts["llm_ttft"] - ts["llm_start"]
      : null;

  const ttsLatencyMs =
    ts["tts_first_audio"] != null && ts["tts_start"] != null
      ? ts["tts_first_audio"] - ts["tts_start"]
      : null;

  const turnLatencyMs =
    ts["tts_complete"] != null && ts["stt_final"] != null
      ? ts["tts_complete"] - ts["stt_final"]
      : null;

  const sttFinalToFirstAudioMs =
    ts["tts_first_audio"] != null && ts["stt_final"] != null
      ? ts["tts_first_audio"] - ts["stt_final"]
      : null;

  return { sttLatencyMs, llmTtftMs, ttsLatencyMs, turnLatencyMs, sttFinalToFirstAudioMs };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const metricsRouter = router({
  /** Queue observability snapshot across calls/sms/email/automation workers. */
  getQueueHealth: protectedProcedure.query(async () => {
    const { getQueueHealth } = await import("../services/queue");
    return getQueueHealth();
  }),

  /** Automation ops summary for lead-created workflows (success/failure + recent errors). */
  getAutomationOps: protectedProcedure
    .input(
      z
        .object({
          timeRange: z.enum(["1h", "6h", "24h", "7d", "30d"]).default("24h"),
          recentFailureLimit: z.number().int().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { fromDate } = parseDateRange(input?.timeRange ?? "24h");
      const { getActivityLogs } = await import("../../db");
      const automationEvents = await getActivityLogs({
        userId: ctx.user.id,
        limit: 500,
        entityType: "lead",
        actions: ["automation_failed", "automation_completed"],
        fromDate,
      });

      const failed = automationEvents.filter((l) => l.action === "automation_failed");
      const completed = automationEvents.filter((l) => l.action === "automation_completed");
      const total = automationEvents.length;
      const failureRatePct = total > 0 ? Math.round((failed.length / total) * 100) : 0;

      const recentFailures = failed.slice(0, input?.recentFailureLimit ?? 10).map((f) => {
        let metadata: Record<string, unknown> | null = null;
        if (typeof f.metadata === "string") {
          try {
            metadata = JSON.parse(f.metadata) as Record<string, unknown>;
          } catch {
            metadata = null;
          }
        } else if (f.metadata && typeof f.metadata === "object") {
          metadata = f.metadata as Record<string, unknown>;
        }
        return {
          id: f.id,
          entityId: f.entityId,
          description: f.description,
          createdAt: f.createdAt,
          metadata,
        };
      });

      return {
        timeRange: input?.timeRange ?? "24h",
        totalEvents: total,
        completedCount: completed.length,
        failedCount: failed.length,
        failureRatePct,
        recentFailures,
      };
    }),

  /** Retry lead-created automation for a specific lead owned by current user. */
  retryLeadCreatedAutomation: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { getLeadById, getActivityLogs, logActivity } = await import("../../db");
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      if ((lead as { createdBy?: number | null }).createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Lead does not belong to current user" });
      }

      const [lastRetry] = await getActivityLogs({
        userId: ctx.user.id,
        entityType: "lead",
        entityId: input.leadId,
        actions: ["automation_requeued"],
        limit: 1,
      });
      if (lastRetry?.createdAt) {
        const elapsedMs = Date.now() - new Date(lastRetry.createdAt).getTime();
        if (elapsedMs < 60_000) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "A retry was already queued recently for this lead. Please wait a minute.",
          });
        }
      }

      const { addAutomationJob } = await import("../services/queue");
      const payload = {
        leadId: (lead as { id: number }).id,
        score: (lead as { score?: number | null }).score ?? undefined,
        segment: (lead as { segment?: string | null }).segment ?? undefined,
        firstName: (lead as { firstName?: string | null }).firstName ?? undefined,
        lastName: (lead as { lastName?: string | null }).lastName ?? undefined,
        company: (lead as { company?: string | null }).company ?? undefined,
        source: (lead as { source?: string | null }).source ?? undefined,
        email: (lead as { email?: string | null }).email ?? undefined,
        phone: (lead as { phone?: string | null }).phone ?? undefined,
      };

      const out = await addAutomationJob({
        action: "lead.created",
        userId: ctx.user.id,
        payload,
      });

      await logActivity({
        userId: ctx.user.id,
        entityType: "lead",
        entityId: input.leadId,
        action: "automation_requeued",
        description: `Lead-created automation requeued for lead ${input.leadId}`,
        metadata: { jobId: out.jobId },
      });

      return {
        success: true as const,
        leadId: input.leadId,
        jobId: out.jobId,
        status: out.status,
      };
    }),

  /**
   * Per-call latency breakdown with p50/p90/p95/p99 percentiles.
   * Reads from voice_metric_events for the given callId.
   */
  getCallLatencies: protectedProcedure
    .input(z.object({ callId: z.string().min(1) }))
    .query(async ({ input }) => {
      const { getVoiceMetricEventsByCallId } = await import("../../db");
      const events = await getVoiceMetricEventsByCallId(input.callId);

      const stageLatencies = computeStageLatencies(events);

      // Collect all latency_summary events for this call
      const summaryEvents = events.filter((e) => e.phase === "latency_summary");
      const allTurnLatencies: number[] = [];
      for (const e of summaryEvents) {
        const ex = e.extra as Record<string, unknown> | null;
        if (ex && typeof ex.turnLatencyMs === "number") {
          allTurnLatencies.push(ex.turnLatencyMs as number);
        }
      }

      const sorted = [...allTurnLatencies].sort((a, b) => a - b);
      const percentiles = computePercentiles(sorted, [50, 90, 95, 99]);

      return {
        callId: input.callId,
        eventCount: events.length,
        stages: stageLatencies,
        percentiles,
        rawEvents: events.map((e) => ({
          phase: e.phase,
          msSinceCallStart: e.msSinceCallStart,
          extra: e.extra,
          createdAt: e.createdAt,
        })),
      };
    }),

  /**
   * Call quality score: sentiment, emotion, conversion likelihood, escalation risk.
   */
  getCallQuality: protectedProcedure
    .input(z.object({ callId: z.string().min(1) }))
    .query(async ({ input }) => {
      const { getCallQualityScore } = await import("../../db");
      const score = await getCallQualityScore(input.callId);
      if (!score) {
        return {
          callId: input.callId,
          found: false as const,
          score: null,
        };
      }
      return {
        callId: input.callId,
        found: true as const,
        score: {
          sentiment: score.sentiment,
          emotion: score.emotion,
          conversionScore: score.conversionScore,
          escalationRisk: score.escalationRisk,
          flags: score.flags,
          createdAt: score.createdAt,
        },
      };
    }),

  /**
   * Provider performance stats for a given time range.
   * provider: "deepgram" | "cartesia" | "cerebras"
   * Maps to voice_metric_events phases:
   *   deepgram  → stt_final (msSinceCallStart delta from audio_received)
   *   cerebras  → llm_ttft  (extra.ms from latency_summary)
   *   cartesia  → tts_first_audio (extra.ms from latency_summary)
   */
  getProviderMetrics: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["deepgram", "cartesia", "cerebras"]),
        timeRange: z.enum(["1h", "6h", "24h", "7d", "30d"]).default("24h"),
      })
    )
    .query(async ({ input }) => {
      const { getVoiceMetricEventsByPhaseAndTimeRange } = await import("../../db");
      const { fromDate, toDate } = parseDateRange(input.timeRange);

      // Map provider to the latency_summary field we care about
      const phaseKey: Record<string, string> = {
        deepgram: "sttLatencyMs",
        cerebras: "llmTtftMs",
        cartesia: "ttsLatencyMs",
      };
      const fieldKey = phaseKey[input.provider] ?? "sttLatencyMs";

      const summaryEvents = await getVoiceMetricEventsByPhaseAndTimeRange({
        phase: "latency_summary",
        fromDate,
        toDate,
        limit: 1000,
      });

      const latencies: number[] = [];
      for (const e of summaryEvents) {
        const ex = e.extra as Record<string, unknown> | null;
        if (ex && typeof ex[fieldKey] === "number" && Number.isFinite(ex[fieldKey])) {
          latencies.push(ex[fieldKey] as number);
        }
      }

      const sorted = [...latencies].sort((a, b) => a - b);
      const percentiles = computePercentiles(sorted, [50, 90, 95, 99]);
      const avg =
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null;

      // Budget thresholds per provider
      const budgets: Record<string, number> = {
        deepgram: 300,
        cerebras: 300,
        cartesia: 200,
      };
      const budget = budgets[input.provider] ?? 300;
      const overBudgetCount = latencies.filter((ms) => ms > budget).length;

      return {
        provider: input.provider,
        timeRange: input.timeRange,
        sampleCount: latencies.length,
        avg,
        percentiles,
        budgetMs: budget,
        overBudgetCount,
        overBudgetPct:
          latencies.length > 0
            ? Math.round((overBudgetCount / latencies.length) * 100)
            : 0,
      };
    }),

  /**
   * Latency trend over time — returns bucketed p50/p90/p95/p99 for dashboard charts.
   * Buckets are hourly for ≤24h ranges, daily for longer ranges.
   */
  getLatencyTrend: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["1h", "6h", "24h", "7d", "30d"]).default("24h"),
        metric: z
          .enum(["turnLatencyMs", "sttLatencyMs", "llmTtftMs", "ttsLatencyMs", "sttFinalToFirstAudioMs"])
          .default("turnLatencyMs"),
      })
    )
    .query(async ({ input }) => {
      const { getVoiceMetricEventsByPhaseAndTimeRange } = await import("../../db");
      const { fromDate, toDate } = parseDateRange(input.timeRange);

      const summaryEvents = await getVoiceMetricEventsByPhaseAndTimeRange({
        phase: "latency_summary",
        fromDate,
        toDate,
        limit: 2000,
      });

      // Determine bucket size
      const rangeMs = toDate.getTime() - fromDate.getTime();
      const bucketMs = rangeMs <= 6 * 3600_000 ? 3600_000 : 86400_000; // 1h or 1d

      // Group events into time buckets
      const buckets = new Map<number, number[]>();
      for (const e of summaryEvents) {
        const ex = e.extra as Record<string, unknown> | null;
        const val = ex?.[input.metric];
        if (typeof val !== "number" || !Number.isFinite(val)) continue;
        const bucketKey = Math.floor(e.createdAt.getTime() / bucketMs) * bucketMs;
        if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
        buckets.get(bucketKey)!.push(val);
      }

      const trend = Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([ts, values]) => {
          const sorted = [...values].sort((a, b) => a - b);
          const pcts = computePercentiles(sorted, [50, 90, 95, 99]);
          const avg =
            values.length > 0
              ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
              : null;
          return {
            timestamp: new Date(ts).toISOString(),
            sampleCount: values.length,
            avg,
            ...pcts,
          };
        });

      // Overall percentiles across the full range
      const allValues = summaryEvents
        .map((e) => {
          const ex = e.extra as Record<string, unknown> | null;
          return ex?.[input.metric];
        })
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

      const allSorted = [...allValues].sort((a, b) => a - b);
      const overallPercentiles = computePercentiles(allSorted, [50, 90, 95, 99]);
      const overallAvg =
        allValues.length > 0
          ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length)
          : null;

      return {
        timeRange: input.timeRange,
        metric: input.metric,
        sampleCount: allValues.length,
        overall: {
          avg: overallAvg,
          ...overallPercentiles,
        },
        trend,
      };
    }),
});
