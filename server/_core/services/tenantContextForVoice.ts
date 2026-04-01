/**
 * Merges knowledge-base RAG + per-lead memories into a short system-prompt block for live calls.
 */
import { eq, and, desc } from "drizzle-orm";
import { knowledgeBases } from "../../../drizzle/schema";
import { getDb, listCustomerMemories } from "../../db";
import { searchKnowledgeChunks } from "./knowledgeBaseIngestion";

async function activeKnowledgeBaseBrandLine(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "";
  const rows = await db
    .select()
    .from(knowledgeBases)
    .where(and(eq(knowledgeBases.userId, userId), eq(knowledgeBases.status, "active")))
    .orderBy(desc(knowledgeBases.updatedAt))
    .limit(1);
  const kb = rows[0];
  if (!kb?.brandProfile) return "";
  try {
    const b = JSON.parse(kb.brandProfile) as Record<string, string | undefined>;
    const title = b.title?.trim();
    const desc = b.description?.trim().slice(0, 400);
    if (!title && !desc) return "";
    return `BUSINESS BRANDING (from their website — match tone and do not contradict):\n${[title, desc].filter(Boolean).join(" — ")}`;
  } catch {
    return "";
  }
}

export async function buildVoiceTenantContextBlock(opts: {
  userId: number | null | undefined;
  leadId: number | null | undefined;
  userMessage: string;
}): Promise<string> {
  const { userId, leadId, userMessage } = opts;
  if (!userId) return "";

  const lines: string[] = [];

  const brandLine = await activeKnowledgeBaseBrandLine(userId);
  if (brandLine) lines.push(brandLine);

  const kb = await searchKnowledgeChunks(userId, userMessage, 5);
  if (kb.length) {
    lines.push(
      "USE THIS FACTUAL KNOWLEDGE WHEN ANSWERING (do not invent beyond it):\n" +
        kb.map((k) => k.content.trim()).join("\n---\n")
    );
  }

  if (leadId && leadId > 0) {
    const memories = await listCustomerMemories(userId, leadId);
    if (memories.length) {
      lines.push(
        "NOTES ABOUT THIS CONTACT:\n" +
          memories
            .slice(0, 8)
            .map((m) => m.content.trim())
            .join("\n---\n")
      );
    }
  }

  return lines.length ? lines.join("\n\n") : "";
}
