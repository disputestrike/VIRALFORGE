import { normalizeToE164US } from "../_core/phoneE164";

export type MessagingPhoneKind = "local" | "toll_free" | "unknown";
export type OutboundSmsStatus =
  | "not_configured"
  | "pending_10dlc"
  | "pending_toll_free_verification"
  | "ready";

export type TenantMessagingStatus = {
  phoneNumber: string | null;
  phoneKind: MessagingPhoneKind;
  inboundSmsReady: boolean;
  outboundSmsStatus: OutboundSmsStatus;
  voiceReadyNow: boolean;
  carrierApprovalRequired: boolean;
  headline: string;
  detail: string;
  recommendedAction: string;
};

const TOLL_FREE_AREA_CODES = new Set([
  "800",
  "833",
  "844",
  "855",
  "866",
  "877",
  "888",
]);

function envFlag(name: string): boolean {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

export function detectMessagingPhoneKind(
  phoneNumber: string | null | undefined
): MessagingPhoneKind {
  const normalized = normalizeToE164US(phoneNumber ?? "");
  if (!normalized) return "unknown";
  const digits = normalized.replace(/\D/g, "");
  const areaCode =
    digits.length === 11 && digits.startsWith("1")
      ? digits.slice(1, 4)
      : digits.slice(0, 3);
  if (TOLL_FREE_AREA_CODES.has(areaCode)) {
    return "toll_free";
  }
  if (digits.length >= 10) {
    return "local";
  }
  return "unknown";
}

export function resolveTenantMessagingStatus(
  phoneNumber: string | null | undefined
): TenantMessagingStatus {
  const normalized = normalizeToE164US(phoneNumber ?? "") || null;
  if (!normalized) {
    return {
      phoneNumber: null,
      phoneKind: "unknown",
      inboundSmsReady: false,
      outboundSmsStatus: "not_configured",
      voiceReadyNow: false,
      carrierApprovalRequired: false,
      headline: "No messaging line yet",
      detail:
        "Provision a dedicated number first. Voice and inbound SMS routing attach to the workspace once the number is assigned.",
      recommendedAction: "Claim a number during onboarding before turning on SMS workflows.",
    };
  }

  const phoneKind = detectMessagingPhoneKind(normalized);
  if (phoneKind === "toll_free") {
    const ready = envFlag("SIGNALWIRE_TOLL_FREE_VERIFIED");
    return {
      phoneNumber: normalized,
      phoneKind,
      inboundSmsReady: true,
      outboundSmsStatus: ready ? "ready" : "pending_toll_free_verification",
      voiceReadyNow: true,
      carrierApprovalRequired: !ready,
      headline: ready
        ? "Toll-free SMS verified"
        : "Toll-free voice is live; SMS still needs verification",
      detail: ready
        ? "This toll-free line can handle voice and outbound SMS."
        : "Inbound voice and SMS can route now, but outbound toll-free SMS still depends on carrier verification outside the app.",
      recommendedAction: ready
        ? "You can launch SMS follow-up from this line."
        : "Complete toll-free verification with SignalWire before promising outbound SMS from this number.",
    };
  }

  const ready = envFlag("SIGNALWIRE_10DLC_READY");
  return {
    phoneNumber: normalized,
    phoneKind: phoneKind === "unknown" ? "local" : phoneKind,
    inboundSmsReady: true,
    outboundSmsStatus: ready ? "ready" : "pending_10dlc",
    voiceReadyNow: true,
    carrierApprovalRequired: !ready,
    headline: ready
      ? "Voice and SMS are ready"
      : "Voice is live; outbound SMS still needs 10DLC approval",
    detail: ready
      ? "This local line is ready for voice and outbound SMS."
      : "Inbound voice and SMS can route now, but carriers require approved 10DLC registration before reliable outbound SMS on local US numbers.",
    recommendedAction: ready
      ? "You can launch SMS workflows from this number."
      : "Treat voice as live now and mark outbound SMS as pending carrier registration until approval is complete.",
  };
}
