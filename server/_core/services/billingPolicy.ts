import * as db from "../../db";

type PlanPolicy = {
  monthlyLeads: number | null;
  monthlyCalls: number | null;
};

const PLAN_POLICIES: Record<string, PlanPolicy> = {
  trial: { monthlyLeads: 100, monthlyCalls: 50 },
  starter: { monthlyLeads: 500, monthlyCalls: 200 },
  growth: { monthlyLeads: 2000, monthlyCalls: 1000 },
  enterprise: { monthlyLeads: null, monthlyCalls: null },
};

function normalizePlan(plan: string | null | undefined): keyof typeof PLAN_POLICIES {
  const key = String(plan ?? "trial").trim().toLowerCase();
  if (key in PLAN_POLICIES) return key as keyof typeof PLAN_POLICIES;
  return "trial";
}

async function getPlanAndUsage(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  const plan = normalizePlan((user as any).plan);
  const usage = await db.getCurrentMonthUsage(userId);
  return { plan, usage };
}

export async function assertLeadCreateAllowed(userId: number): Promise<void> {
  const { plan, usage } = await getPlanAndUsage(userId);
  const cap = PLAN_POLICIES[plan].monthlyLeads;
  if (cap == null) return;
  if (usage.leadsThisMonth >= cap) {
    throw new Error(`PLAN_LIMIT_LEADS:${plan}:${usage.leadsThisMonth}/${cap}`);
  }
}

export async function assertLeadBulkCreateAllowed(userId: number, additionalLeads: number): Promise<void> {
  const { plan, usage } = await getPlanAndUsage(userId);
  const cap = PLAN_POLICIES[plan].monthlyLeads;
  if (cap == null) return;
  if (usage.leadsThisMonth + Math.max(0, additionalLeads) > cap) {
    throw new Error(
      `PLAN_LIMIT_LEADS:${plan}:${usage.leadsThisMonth + Math.max(0, additionalLeads)}/${cap}`
    );
  }
}

export async function assertQueuedCallAllowance(userId: number, additionalCalls: number): Promise<void> {
  const { plan, usage } = await getPlanAndUsage(userId);
  const cap = PLAN_POLICIES[plan].monthlyCalls;
  if (cap == null) return;
  if (usage.callsThisMonth + Math.max(0, additionalCalls) > cap) {
    throw new Error(
      `PLAN_LIMIT_CALLS:${plan}:${usage.callsThisMonth + Math.max(0, additionalCalls)}/${cap}`
    );
  }
}
