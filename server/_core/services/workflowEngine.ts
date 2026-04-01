/**
 * Runs active workflow definitions when a lead is created.
 * Supported `definition` shape: `{ "steps": [ { "type": "http_post", "url": "https://..." } ] }`
 */
import * as db from "../../db";

export async function runWorkflowsOnLeadCreated(
  userId: number,
  lead: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
  }
): Promise<void> {
  let workflows: Awaited<ReturnType<typeof db.listWorkflows>>;
  try {
    workflows = await db.listWorkflows(userId);
  } catch {
    return;
  }

  for (const w of workflows) {
    if (!w.isActive) continue;
    const def = w.definition as Record<string, unknown> | null;
    if (!def || typeof def !== "object") continue;
    const steps = def.steps ?? def.actions;
    if (!Array.isArray(steps)) continue;

    for (const raw of steps) {
      if (!raw || typeof raw !== "object") continue;
      const step = raw as { type?: string; url?: string; method?: string };
      if (step.type !== "http_post" || !step.url || typeof step.url !== "string") continue;
      const method = (step.method || "POST").toUpperCase() === "GET" ? "GET" : "POST";
      try {
        await fetch(step.url, {
          method,
          headers: { "Content-Type": "application/json", "User-Agent": "ApexAI-Workflow/1.0" },
          body:
            method === "GET"
              ? undefined
              : JSON.stringify({
                  event: "lead.created",
                  workflowId: w.id,
                  workflowName: w.name,
                  lead,
                }),
        });
      } catch (e) {
        console.warn(`[Workflow] step failed workflow=${w.id}`, e);
      }
    }
  }
}
