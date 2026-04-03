/**
 * Cerebras round-robin key manager.
 * Rotates through up to 5 API keys to avoid rate limits.
 * Pre-emptively switches to next key after N calls (not waiting for 429).
 */

import { ENV } from "./env";

const CALLS_PER_KEY_BEFORE_ROTATE = 8; // rotate aggressively to avoid Cerebras queue limits

let currentIndex = 0;
let callsSinceRotation = 0;

/** Get the next Cerebras API key in round-robin. */
export function getCerebrasKey(): string {
  const keys = ENV.cerebrasKeys;
  if (keys.length === 0) throw new Error("No CEREBRAS_API_KEY_* configured");

  // Pre-emptive rotation
  if (callsSinceRotation >= CALLS_PER_KEY_BEFORE_ROTATE && keys.length > 1) {
    currentIndex = (currentIndex + 1) % keys.length;
    callsSinceRotation = 0;
  }

  callsSinceRotation++;
  return keys[currentIndex]!;
}

/** Force rotate to next key (call on 429 or error). */
export function rotateCerebrasKey(): void {
  const keys = ENV.cerebrasKeys;
  if (keys.length <= 1) return;
  currentIndex = (currentIndex + 1) % keys.length;
  callsSinceRotation = 0;
  console.log(`[Cerebras] Rotated to key ${currentIndex + 1}/${keys.length}`);
}

/** Get current key index (for logging). */
export function getCerebrasKeyIndex(): number {
  return currentIndex + 1;
}

export function getCerebrasKeyCount(): number {
  return ENV.cerebrasKeys.length;
}
