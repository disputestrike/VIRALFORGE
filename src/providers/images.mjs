import { config } from "../config.mjs";

function escapeXml(value) {
  return String(value).replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[char]));
}

export async function generateImageAsset({ storage, runId, title, prompt }) {
  if (config.providers.openaiApiKey) {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.providers.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt,
        size: "1024x1024",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        return storage.putBuffer(`runs/${runId}/image.png`, Buffer.from(b64, "base64"), "image/png");
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9B0AE8"/>
      <stop offset="45%" stop-color="#BC12BD"/>
      <stop offset="100%" stop-color="#ED3782"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#g)"/>
  <rect x="90" y="180" width="900" height="1560" rx="42" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
  <text x="120" y="360" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="800" fill="#fff">ViralForge</text>
  <text x="120" y="520" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="900" fill="#fff">${escapeXml(title).slice(0, 42)}</text>
  <text x="120" y="680" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#FEFBFE">${escapeXml(prompt).slice(0, 110)}</text>
</svg>`;
  return storage.putText(`runs/${runId}/image.svg`, svg, "image/svg+xml");
}
