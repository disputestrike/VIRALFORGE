/**
 * Server-clock date authority — never let the model invent today / tomorrow / year.
 */

const DATE_PATTERNS =
  /\b(what('?s|\s+is)\s+(today|the date|the day|tomorrow)|today'?s\s+date|tomorrow'?s\s+date|what\s+year|which\s+year|exact\s+date|precisely\s+what\s+day)\b/i;

export function isDateRelatedQuestion(text: string): boolean {
  const t = text.toLowerCase();
  if (DATE_PATTERNS.test(text)) return true;
  if (/\b(april|january|february|march|may|june|july|august|september|october|november|december)\b/i.test(t) && /\b\d{4}\b/.test(t)) return false;
  if (/\b(today|tomorrow|what day|what date|current date)\b/.test(t)) return true;
  return false;
}

function fmtLong(d: Date, tz?: string): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz || "America/New_York",
  });
}

/** Single spoken line from real server time — model must not override. */
export function buildDateAnswer(now: Date, userText: string, timeZone = "America/New_York"): string {
  const lower = userText.toLowerCase();
  const todayStr = fmtLong(now, timeZone);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = fmtLong(tomorrow, timeZone);

  if (/\btomorrow\b/.test(lower) && !/\btoday\b/.test(lower)) {
    return `Tomorrow is ${tomorrowStr}.`;
  }
  if (/\bwhat year\b|\bwhich year\b/.test(lower)) {
    const y = now.toLocaleDateString("en-US", { year: "numeric", timeZone });
    return `The current calendar year is ${y}. Today is ${todayStr}.`;
  }
  return `Today is ${todayStr}.`;
}

/** Injected into system prompt every turn — anchor for scheduling talk. */
export function buildCurrentDateAnchor(now: Date, timeZone = "America/New_York"): string {
  const todayStr = fmtLong(now, timeZone);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = fmtLong(tomorrow, timeZone);
  return `SERVER DATE (authoritative — never guess): Today is ${todayStr}. Tomorrow is ${tomorrowStr}. Use only these for "today" and "tomorrow".`;
}
