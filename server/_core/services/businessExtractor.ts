/**
 * Business Extractor Service
 * Crawls a URL or reads a PDF/document, then uses Claude to extract
 * structured business info for campaign auto-fill.
 */

import * as cheerio from "cheerio";
import { invokeLLM } from "../llm";

export interface ExtractedBusiness {
  businessName: string;
  industry: string;
  serviceAreas: string[];
  services: string[];
  valueProposition: string;
  targetCustomer: string;
  phoneNumber?: string;
  email?: string;
  campaignScript?: string;
  campaignName?: string;
  tone: "professional" | "friendly" | "urgent";
}

const EXTRACT_PROMPT = `You are a business analyst. Given the text below from a business website or document, extract structured business information for setting up an AI sales campaign.

Return ONLY valid JSON with this exact structure:
{
  "businessName": "Company name",
  "industry": "solar|hvac|roofing|insurance|realestate|general|other",
  "serviceAreas": ["City, State"],
  "services": ["Service 1", "Service 2"],
  "valueProposition": "One sentence: why customers choose them",
  "targetCustomer": "Who they sell to (homeowners, businesses, etc.)",
  "phoneNumber": "if found",
  "email": "if found",
  "tone": "professional|friendly|urgent",
  "campaignName": "Short campaign name based on their services",
  "campaignScript": "A 2-3 sentence opening for the AI to use when calling leads"
}

If a field can't be determined, use a reasonable default. Industry must be one of the enum values.`;

// ── URL CRAWLER ──────────────────────────────────────────────────────────────
export async function extractFromUrl(url: string): Promise<ExtractedBusiness> {
  // Normalize URL
  if (!url.startsWith("http")) url = `https://${url}`;

  // Fetch the page
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let html: string;
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ApexAI-Crawler/1.0 (business info extraction)" },
    });
    html = await resp.text();
  } finally {
    clearTimeout(timeout);
  }

  // Parse with cheerio — extract meaningful text only
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer clutter
  $("script, style, nav, footer, header, aside, .cookie, .popup, [class*='modal']").remove();

  // Get the good stuff: headings, paragraphs, meta description
  const metaDesc = $("meta[name='description']").attr("content") || "";
  const title = $("title").text().trim();
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().join(" | ");
  const h2s = $("h2").map((_, el) => $(el).text().trim()).get().slice(0, 8).join(" | ");
  const paras = $("p").map((_, el) => $(el).text().trim()).get()
    .filter(t => t.length > 30)
    .slice(0, 15)
    .join(" ");

  const contactText = $("[class*='contact'], [id*='contact'], [class*='phone'], [class*='email']")
    .text().replace(/\s+/g, " ").trim().slice(0, 300);

  const extracted = [
    `SITE: ${url}`,
    `TITLE: ${title}`,
    `META: ${metaDesc}`,
    `HEADINGS: ${h1s} | ${h2s}`,
    `CONTENT: ${paras.slice(0, 2000)}`,
    `CONTACT: ${contactText}`,
  ].join("\n");

  return parseWithAI(extracted, url);
}

// ── PDF/DOCUMENT READER ──────────────────────────────────────────────────────
export async function extractFromPdf(buffer: Buffer): Promise<ExtractedBusiness> {
  // Dynamic import of pdf-parse (CJS module)
  // pdf-parse has inconsistent ESM/CJS exports
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule as any).default ?? pdfModule;
  const data = await pdfParse(buffer);
  const text = data.text.replace(/\s+/g, " ").trim().slice(0, 4000);
  return parseWithAI(text, "uploaded PDF");
}

// ── TEXT EXTRACTOR (for pasted text) ─────────────────────────────────────────
export async function extractFromText(text: string): Promise<ExtractedBusiness> {
  return parseWithAI(text.slice(0, 4000), "pasted text");
}

// ── SHARED AI PARSER ─────────────────────────────────────────────────────────
async function parseWithAI(content: string, source: string): Promise<ExtractedBusiness> {
  const result = await invokeLLM({
    messages: [
      { role: "system", content: EXTRACT_PROMPT },
      { role: "user", content: content },
    ],
  });

  const raw = result.choices[0]?.message?.content || "{}";
  const clean = raw.replace(/```json\s*/i, "").replace(/```\s*/i, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    console.log(`[BusinessExtractor] Extracted from ${source}: ${parsed.businessName}`);
    return {
      businessName: parsed.businessName || "Your Business",
      industry: parsed.industry || "general",
      serviceAreas: Array.isArray(parsed.serviceAreas) ? parsed.serviceAreas : [],
      services: Array.isArray(parsed.services) ? parsed.services : [],
      valueProposition: parsed.valueProposition || "",
      targetCustomer: parsed.targetCustomer || "homeowners and businesses",
      phoneNumber: parsed.phoneNumber,
      email: parsed.email,
      tone: parsed.tone || "professional",
      campaignName: parsed.campaignName || "AI Outreach Campaign",
      campaignScript: parsed.campaignScript || "",
    };
  } catch {
    throw new Error(`Could not parse business info from ${source}. Please try again.`);
  }
}
