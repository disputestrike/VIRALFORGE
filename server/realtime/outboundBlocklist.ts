/**
 * Tenant blocklist gate for outbound dials (roadmap WS8 — DNC-style tenant list).
 * Uses `blocked_phone_numbers` via `isPhoneBlocked` (same as inbound spam UI).
 */

import { normalizeToE164US } from "../_core/phoneE164";

export async function assertOutboundNotOnTenantBlocklist(
  userId: number | undefined,
  phoneRaw: string,
  enabled: boolean
): Promise<void> {
  if (!enabled || userId == null) return;
  const { isPhoneBlocked } = await import("../db");
  const e164 = normalizeToE164US(phoneRaw) || phoneRaw.trim();
  if (!e164) return;
  if (await isPhoneBlocked(userId, e164)) {
    throw new Error(
      `[Outbound] Blocked: ${e164} is on tenant blocklist (Settings → phone blocklist).`
    );
  }
}
