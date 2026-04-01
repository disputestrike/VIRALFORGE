/** Evaluate saved JSON rules against a lead payload (bonus points on top of base heuristic). */

export type RuleEntry = {
  field: string;
  op: "eq" | "contains" | "present";
  value?: string;
  points: number;
};

export function scoreFromRules(
  input: Record<string, string | undefined | null>,
  rules: RuleEntry[]
): number {
  let total = 0;
  for (const r of rules) {
    if (!r?.field || typeof r.points !== "number" || Number.isNaN(r.points)) continue;
    const raw = input[r.field];
    const s = raw == null ? "" : String(raw).trim();
    if (r.op === "present") {
      if (s.length > 0) total += r.points;
    } else if (r.op === "eq") {
      if (r.value != null && s.toLowerCase() === String(r.value).trim().toLowerCase()) total += r.points;
    } else if (r.op === "contains") {
      if (r.value != null && s.toLowerCase().includes(String(r.value).trim().toLowerCase())) total += r.points;
    }
  }
  return total;
}
