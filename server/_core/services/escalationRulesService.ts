/**
 * Keyword-based escalation — first active rule whose keyword appears in transcript wins.
 */
import * as db from "../../db";

export async function findEscalationMatch(
  userId: number,
  transcript: string
): Promise<{ transferNumber: string | null } | null> {
  const rules = await db.listEscalationRules(userId);
  const t = transcript.toLowerCase();
  for (const r of rules) {
    if (!r.isActive) continue;
    const kw = r.keyword.trim().toLowerCase();
    if (!kw || !t.includes(kw)) continue;
    return { transferNumber: r.transferNumber?.trim() || null };
  }
  return null;
}
