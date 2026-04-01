/**
 * Merges knowledge-base RAG + per-lead memories into a short system-prompt block for live calls.
 */
import { listCustomerMemories } from "../../db";
import { searchKnowledgeChunks } from "./knowledgeBaseIngestion";

export async function buildVoiceTenantContextBlock(opts: {
  userId: number | null | undefined;
  leadId: number | null | undefined;
  userMessage: string;
}): Promise<string> {
  const { userId, leadId, userMessage } = opts;
  if (!userId) return "";

  const lines: string[] = [];

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
