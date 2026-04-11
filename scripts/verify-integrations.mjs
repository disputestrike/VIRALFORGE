#!/usr/bin/env node
/**
 * Pass 5 / local smoke: reports which integration env vars are set (SMS, email, voice).
 * Run from repo root: node scripts/verify-integrations.mjs
 * Set VERIFY_STRICT=1 to exit 1 if any required group is incomplete.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

function loadDotEnv() {
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

loadDotEnv();

const groups = [
  {
    name: "Public base URL",
    mode: "required",
    keys: ["PUBLIC_URL", "RAILWAY_PUBLIC_DOMAIN"],
    validator: () => {
      const hasPublicUrl = !!String(process.env.PUBLIC_URL ?? "").trim();
      const hasRailwayDomain = !!String(process.env.RAILWAY_PUBLIC_DOMAIN ?? "").trim();
      return {
        ok: hasPublicUrl || hasRailwayDomain,
        detail: hasPublicUrl
          ? `using PUBLIC_URL=${String(process.env.PUBLIC_URL).trim()}`
          : hasRailwayDomain
            ? `using RAILWAY_PUBLIC_DOMAIN=${String(process.env.RAILWAY_PUBLIC_DOMAIN).trim()}`
            : "set PUBLIC_URL or RAILWAY_PUBLIC_DOMAIN",
      };
    },
  },
  {
    name: "Database",
    mode: "required",
    keys: ["DATABASE_URL"],
  },
  {
    name: "Redis (queues)",
    mode: "required",
    keys: ["REDIS_URL"],
  },
  {
    name: "Auth / session",
    mode: "required",
    keys: ["JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  {
    name: "Telephony core (SignalWire)",
    mode: "required",
    keys: ["SIGNALWIRE_PROJECT_ID", "SIGNALWIRE_TOKEN", "SIGNALWIRE_SPACE_URL", "SIGNALWIRE_PHONE_NUMBER"],
  },
  {
    name: "Realtime voice AI core",
    mode: "required",
    keys: [
      "DEEPGRAM_API_KEY",
      "CEREBRAS_API_KEY",
      "CEREBRAS_API_KEY_2",
      "CEREBRAS_API_KEY_3",
      "CEREBRAS_API_KEY_4",
      "CEREBRAS_API_KEY_5",
      "CARTESIA_API_KEY",
      "ELEVENLABS_API_KEY",
    ],
    validator: () => {
      const hasStt = !!String(process.env.DEEPGRAM_API_KEY ?? "").trim();
      const cerebrasKeys = [
        process.env.CEREBRAS_API_KEY,
        process.env.CEREBRAS_API_KEY_2,
        process.env.CEREBRAS_API_KEY_3,
        process.env.CEREBRAS_API_KEY_4,
        process.env.CEREBRAS_API_KEY_5,
      ].filter((value) => !!String(value ?? "").trim());
      const hasLlm = cerebrasKeys.length > 0;
      const hasTts =
        !!String(process.env.CARTESIA_API_KEY ?? "").trim() ||
        !!String(process.env.ELEVENLABS_API_KEY ?? "").trim();
      const missing = [];
      if (!hasStt) missing.push("DEEPGRAM_API_KEY");
      if (!hasLlm) missing.push("CEREBRAS_API_KEY");
      if (!hasTts) missing.push("CARTESIA_API_KEY or ELEVENLABS_API_KEY");
      return {
        ok: hasStt && hasLlm && hasTts,
        detail: missing.length
          ? `missing ${missing.join(", ")}`
          : `provider=cerebras (${cerebrasKeys.length} key${cerebrasKeys.length === 1 ? "" : "s"}); TTS=${String(process.env.CARTESIA_API_KEY ?? "").trim() ? "cartesia" : "elevenlabs"}`,
      };
    },
  },
  {
    name: "Email (Resend)",
    mode: "required",
    keys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_FROM_NAME"],
  },
  {
    name: "Knowledge base embeddings",
    mode: "optional",
    keys: ["OPENAI_API_KEY"],
  },
  {
    name: "Stripe (billing)",
    mode: "optional",
    keys: [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_STARTER",
      "STRIPE_PRICE_GROWTH",
      "STRIPE_PRICE_ENTERPRISE",
    ],
  },
  {
    name: "HubSpot OAuth",
    mode: "optional",
    keys: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET", "HUBSPOT_REDIRECT_URI"],
  },
  {
    name: "Salesforce OAuth",
    mode: "optional",
    keys: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET", "SALESFORCE_REDIRECT_URI"],
  },
  {
    name: "Pipedrive OAuth",
    mode: "optional",
    keys: ["PIPEDRIVE_CLIENT_ID", "PIPEDRIVE_CLIENT_SECRET", "PIPEDRIVE_REDIRECT_URI"],
  },
];

function envSet(key) {
  return !!String(process.env[key] ?? "").trim();
}

function evaluateGroup(group) {
  if (typeof group.validator === "function") {
    const result = group.validator();
    const setCount = group.keys.filter(envSet).length;
    const allSet = setCount === group.keys.length;
    return {
      ...result,
      setCount,
      allSet,
      missingKeys: group.keys.filter((k) => !envSet(k)),
      partial: setCount > 0 && !result.ok,
    };
  }
  const missingKeys = group.keys.filter((k) => !envSet(k));
  const setCount = group.keys.length - missingKeys.length;
  const allSet = missingKeys.length === 0;
  return {
    ok: allSet,
    setCount,
    allSet,
    missingKeys,
    partial: setCount > 0 && !allSet,
    detail: allSet ? "configured" : missingKeys.length === group.keys.length ? "not configured" : `missing ${missingKeys.join(", ")}`,
  };
}

let strictFail = false;
console.log("Integration env check (ApexAI)\n");

for (const group of groups) {
  const result = evaluateGroup(group);
  const status = result.ok ? "✓" : result.partial ? "△" : "○";
  console.log(`${status} ${group.name}${group.mode === "optional" ? " [optional]" : ""}`);
  for (const key of group.keys) {
    console.log(`    ${envSet(key) ? "·" : "!"} ${key}`);
  }
  console.log(`    ${result.detail}`);
  console.log("");

  if (process.env.VERIFY_STRICT === "1") {
    if (group.mode === "required" && !result.ok) strictFail = true;
    if (group.mode === "optional" && result.partial) strictFail = true;
  }
}

console.log("Strict mode policy:");
console.log("  - required groups must be complete");
console.log("  - optional groups may be fully absent, but partially configured groups fail");
console.log("");
console.log("Tip: copy Railway env into .env before running strict verification.");
console.log("Live voice requires telephony + Deepgram + Cerebras + Cartesia/ElevenLabs to be complete.\n");

if (strictFail) {
  console.error("VERIFY_STRICT=1: one or more required groups are incomplete, or an optional provider is only partially configured.");
  process.exit(1);
}
