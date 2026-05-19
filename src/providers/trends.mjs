const PILLARS = ["rage_bait", "visual_addiction", "curiosity_gap", "ranking", "life_hack", "emotional_story", "global_poll"];

function normalizeTopic(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function textScore(value) {
  return Array.from(String(value || "")).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pillarFor(topic = "") {
  const lower = topic.toLowerCase();
  if (/clean|reset|restore|satisfying|asmr|before|after|organ/i.test(lower)) return "visual_addiction";
  if (/top|best|worst|ranking|ranked|jobs|ways|things|tools/i.test(lower)) return "ranking";
  if (/hack|how to|guide|fix|save|shortcut|minute|simple/i.test(lower)) return "life_hack";
  if (/vs|poll|country|world|people|generation|debate/i.test(lower)) return "global_poll";
  if (/lost|built|story|changed|founder|family|emotional/i.test(lower)) return "emotional_story";
  if (/wrong|fake|mistake|scam|secret|nobody|truth|banned/i.test(lower)) return "rage_bait";
  return PILLARS[textScore(topic) % PILLARS.length] || "curiosity_gap";
}

function scoreCandidate(topic, sourceScore = 0, rank = 0) {
  const headlineBoost = /why|how|top|secret|mistake|wrong|best|vs|first|before|after/i.test(topic) ? 7 : 0;
  const lengthBoost = topic.length >= 28 && topic.length <= 82 ? 5 : 0;
  const rankBoost = Math.max(0, 18 - rank * 2);
  const base = Math.min(100, Math.max(50, Number(sourceScore || 0)));
  return Math.min(98, Math.round(base * 0.65 + rankBoost + headlineBoost + lengthBoost));
}

async function fetchText(url, { timeoutMs = 6500 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept": "application/json, text/xml, application/xml, text/plain;q=0.9, */*;q=0.8",
        "user-agent": "ViralForgeTrendScout/1.0 (+https://github.com/disputestrike/VIRALFORGE)",
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function decodeEntities(text = "") {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function addCandidate(map, candidate) {
  const topic = normalizeTopic(candidate.topic);
  if (!topic || topic.length < 10) return;
  const key = topic.toLowerCase();
  const existing = map.get(key);
  const next = {
    source: candidate.source || "public_trend_signal",
    topic,
    pillar: candidate.pillar || pillarFor(topic),
    region: candidate.region || "global",
    score: scoreCandidate(topic, candidate.sourceScore || candidate.score || 70, candidate.rank || 0),
    metadata: {
      live: true,
      url: candidate.url || null,
      sourceScore: candidate.sourceScore || null,
      collectedAt: new Date().toISOString(),
      ...(candidate.metadata || {}),
    },
  };
  if (!existing || next.score > existing.score) map.set(key, next);
}

async function collectGoogleTrends(map) {
  const xml = await fetchText("https://trends.google.com/trending/rss?geo=US");
  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].slice(0, 15);
  items.forEach((match, rank) => {
    const item = match[0];
    const title = decodeEntities((item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
    const trafficText = decodeEntities((item.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/) || [])[1] || "");
    const traffic = Number(String(trafficText).replace(/[^0-9]/g, "")) || 70;
    addCandidate(map, { source: "google_trends_rss", topic: title, sourceScore: Math.min(100, 65 + Math.log10(traffic + 1) * 8), rank, metadata: { traffic: trafficText } });
  });
}

async function collectHackerNews(map) {
  const text = await fetchText("https://hn.algolia.com/api/v1/search_by_date?tags=front_page&hitsPerPage=20");
  const json = JSON.parse(text);
  (json.hits || []).slice(0, 15).forEach((hit, rank) => {
    addCandidate(map, {
      source: "hacker_news_front_page",
      topic: hit.title || hit.story_title,
      sourceScore: Math.min(100, 58 + Number(hit.points || 0) / 7 + Number(hit.num_comments || 0) / 15),
      rank,
      url: hit.url || hit.story_url,
      metadata: { points: hit.points || 0, comments: hit.num_comments || 0, objectID: hit.objectID },
    });
  });
}

async function collectReddit(map) {
  const text = await fetchText("https://www.reddit.com/r/popular.json?limit=20");
  const json = JSON.parse(text);
  (json.data?.children || []).slice(0, 15).forEach((child, rank) => {
    const post = child.data || {};
    addCandidate(map, {
      source: "reddit_popular",
      topic: post.title,
      sourceScore: Math.min(100, 55 + Number(post.score || 0) / 1000 + Number(post.num_comments || 0) / 250),
      rank,
      url: post.url_overridden_by_dest || `https://reddit.com${post.permalink || ""}`,
      metadata: { subreddit: post.subreddit, upvotes: post.score || 0, comments: post.num_comments || 0 },
    });
  });
}

export async function collectTrendCandidates() {
  const map = new Map();
  const sources = [collectGoogleTrends, collectHackerNews, collectReddit];
  const results = await Promise.allSettled(sources.map(source => source(map)));
  const errors = results
    .filter(result => result.status === "rejected")
    .map(result => result.reason?.message || String(result.reason));
  const candidates = [...map.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((candidate, index) => ({
      ...candidate,
      score: Math.max(candidate.score, 98 - index * 3),
      metadata: { ...candidate.metadata, trendRank: index + 1, sourceErrors: errors },
    }));
  return { candidates, errors };
}
