import fs from "node:fs/promises";
import { config, connectorStatus } from "../config.mjs";

async function refreshYouTubeAccessToken() {
  const params = new URLSearchParams({
    client_id: config.platforms.youtube.clientId,
    client_secret: config.platforms.youtube.clientSecret,
    refresh_token: config.platforms.youtube.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) throw new Error(`YouTube token refresh failed: ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

async function publishYouTube({ videoPath, title, description }) {
  const accessToken = await refreshYouTubeAccessToken();
  const metadata = {
    snippet: {
      title: title.slice(0, 95),
      description,
      categoryId: "24",
    },
    status: {
      privacyStatus: config.platforms.youtube.privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": "video/mp4",
    },
    body: JSON.stringify(metadata),
  });
  if (!init.ok) throw new Error(`YouTube upload init failed: ${await init.text()}`);
  const uploadUrl = init.headers.get("location");
  const video = await fs.readFile(videoPath);
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "video/mp4",
      "content-length": String(video.length),
    },
    body: video,
  });
  if (!upload.ok) throw new Error(`YouTube upload failed: ${await upload.text()}`);
  const data = await upload.json();
  return { platform_post_id: data.id, url: `https://youtube.com/watch?v=${data.id}`, raw: data };
}

async function publishTelegram({ videoPath, title, description }) {
  const form = new FormData();
  form.append("chat_id", config.platforms.telegram.chatId);
  form.append("caption", `${title}\n\n${description}`.slice(0, 1024));
  const buffer = await fs.readFile(videoPath);
  form.append("video", new Blob([buffer], { type: "video/mp4" }), "viralforge.mp4");
  const response = await fetch(`https://api.telegram.org/bot${config.platforms.telegram.botToken}/sendVideo`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(`Telegram publish failed: ${await response.text()}`);
  const data = await response.json();
  return {
    platform_post_id: String(data.result?.message_id || ""),
    url: "",
    raw: data,
  };
}

async function publishInstagram({ videoUrl, title, description }) {
  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    caption: `${title}\n\n${description}`,
    access_token: config.platforms.meta.accessToken,
  });
  const create = await fetch(`https://graph.facebook.com/v19.0/${config.platforms.meta.instagramUserId}/media`, {
    method: "POST",
    body: params,
  });
  if (!create.ok) throw new Error(`Instagram container create failed: ${await create.text()}`);
  const container = await create.json();
  const publishParams = new URLSearchParams({
    creation_id: container.id,
    access_token: config.platforms.meta.accessToken,
  });
  const publish = await fetch(`https://graph.facebook.com/v19.0/${config.platforms.meta.instagramUserId}/media_publish`, {
    method: "POST",
    body: publishParams,
  });
  if (!publish.ok) throw new Error(`Instagram publish failed: ${await publish.text()}`);
  const data = await publish.json();
  return { platform_post_id: data.id, url: "", raw: data };
}

async function publishTikTok({ videoUrl, title }) {
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.platforms.tiktok.accessToken}`,
    },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 150),
        privacy_level: process.env.TIKTOK_PRIVACY_LEVEL || "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
        brand_content_toggle: false,
        brand_organic_toggle: false,
        is_aigc: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });
  if (!response.ok) throw new Error(`TikTok publish init failed: ${await response.text()}`);
  const data = await response.json();
  return { platform_post_id: data.data?.publish_id || "", url: "", raw: data };
}


async function publishX({ title, description, videoUrl }) {
  const token = config.platforms.x.accessToken || config.platforms.x.bearerToken;
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: `${title}\n\n${description}\n${videoUrl || ""}`.slice(0, 280) }),
  });
  if (!response.ok) throw new Error(`X post failed: ${await response.text()}`);
  const data = await response.json();
  return { platform_post_id: data.data?.id, url: data.data?.id ? `https://x.com/i/web/status/${data.data.id}` : "", raw: data };
}

async function publishLinkedIn({ title, description, videoUrl }) {
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.platforms.linkedin.accessToken}`,
      "LinkedIn-Version": process.env.LINKEDIN_VERSION || "202405",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: config.platforms.linkedin.authorUrn,
      commentary: `${title}\n\n${description}\n${videoUrl || ""}`,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!response.ok) throw new Error(`LinkedIn post failed: ${await response.text()}`);
  const data = await response.json().catch(() => ({}));
  const id = response.headers.get("x-restli-id") || data.id || "";
  return { platform_post_id: id, url: "", raw: data };
}

async function publishPinterest({ title, description, videoUrl }) {
  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.platforms.pinterest.accessToken}`,
    },
    body: JSON.stringify({
      board_id: config.platforms.pinterest.boardId,
      title: title.slice(0, 100),
      description,
      media_source: { source_type: "video_url", url: videoUrl },
    }),
  });
  if (!response.ok) throw new Error(`Pinterest pin failed: ${await response.text()}`);
  const data = await response.json();
  return { platform_post_id: data.id, url: data.link || "", raw: data };
}

async function refreshRedditAccessToken() {
  const auth = Buffer.from(`${config.platforms.reddit.clientId}:${config.platforms.reddit.clientSecret}`).toString("base64");
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "ViralForge/0.1",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: config.platforms.reddit.refreshToken }),
  });
  if (!response.ok) throw new Error(`Reddit token refresh failed: ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

async function publishReddit({ title, description, videoUrl }) {
  const accessToken = await refreshRedditAccessToken();
  const subreddit = process.env.REDDIT_SUBREDDIT || "test";
  const response = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "ViralForge/0.1",
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: "link",
      title: title.slice(0, 300),
      url: videoUrl || config.app.publicUrl,
      text: description,
      api_type: "json",
    }),
  });
  if (!response.ok) throw new Error(`Reddit submit failed: ${await response.text()}`);
  const data = await response.json();
  return { platform_post_id: data.json?.data?.id || "", url: data.json?.data?.url || "", raw: data };
}

export async function distribute({ repo, run, content, videoAsset }) {
  const statuses = connectorStatus();
  const platforms = run.input.platforms || ["YouTube", "TikTok", "Instagram", "X", "LinkedIn", "Pinterest", "Reddit", "Telegram"];
  const posts = [];
  const title = content.brief?.title || run.input.topic || "ViralForge content";
  const description = content.brief?.hook || "Generated by ViralForge.";
  const localVideoPath = videoAsset.uri.startsWith("s3://") || videoAsset.uri.startsWith("http") ? null : videoAsset.uri;
  const publicVideoUrl = videoAsset.uri.startsWith("http") ? videoAsset.uri : "";

  for (const platform of platforms) {
    const status = statuses[platform] || "connector_not_configured";
    const liveAllowed = config.app.publishMode === "live";
    try {
      if (liveAllowed && platform === "YouTube" && status.startsWith("ready") && localVideoPath) {
        const result = await publishYouTube({ videoPath: localVideoPath, title, description });
        posts.push(await repo.addPost({
          run_id: run.id,
          content_id: content.id,
          platform,
          status: "published",
          platform_post_id: result.platform_post_id,
          url: result.url,
          metadata: { connectorStatus: status, result },
        }));
      } else if (liveAllowed && platform === "Telegram" && status.startsWith("ready") && localVideoPath) {
        const result = await publishTelegram({ videoPath: localVideoPath, title, description });
        posts.push(await repo.addPost({
          run_id: run.id,
          content_id: content.id,
          platform,
          status: "published",
          platform_post_id: result.platform_post_id,
          url: result.url,
          metadata: { connectorStatus: status, result },
        }));
      } else if (liveAllowed && platform === "TikTok" && status.startsWith("ready") && publicVideoUrl) {
        const result = await publishTikTok({ videoUrl: publicVideoUrl, title });
        posts.push(await repo.addPost({ run_id: run.id, content_id: content.id, platform, status: "published", platform_post_id: result.platform_post_id, url: result.url, metadata: { connectorStatus: status, result } }));
      } else if (liveAllowed && platform === "Instagram" && status.startsWith("ready") && publicVideoUrl) {
        const result = await publishInstagram({ videoUrl: publicVideoUrl, title, description });
        posts.push(await repo.addPost({ run_id: run.id, content_id: content.id, platform, status: "published", platform_post_id: result.platform_post_id, url: result.url, metadata: { connectorStatus: status, result } }));
      } else if (liveAllowed && platform === "X" && status.startsWith("ready")) {
        const result = await publishX({ title, description, videoUrl: publicVideoUrl });
        posts.push(await repo.addPost({ run_id: run.id, content_id: content.id, platform, status: "published", platform_post_id: result.platform_post_id, url: result.url, metadata: { connectorStatus: status, result } }));
      } else if (liveAllowed && platform === "LinkedIn" && status.startsWith("ready")) {
        const result = await publishLinkedIn({ title, description, videoUrl: publicVideoUrl });
        posts.push(await repo.addPost({ run_id: run.id, content_id: content.id, platform, status: "published", platform_post_id: result.platform_post_id, url: result.url, metadata: { connectorStatus: status, result } }));
      } else if (liveAllowed && platform === "Pinterest" && status.startsWith("ready") && publicVideoUrl) {
        const result = await publishPinterest({ title, description, videoUrl: publicVideoUrl });
        posts.push(await repo.addPost({ run_id: run.id, content_id: content.id, platform, status: "published", platform_post_id: result.platform_post_id, url: result.url, metadata: { connectorStatus: status, result } }));
      } else if (liveAllowed && platform === "Reddit" && status.startsWith("ready")) {
        const result = await publishReddit({ title, description, videoUrl: publicVideoUrl });
        posts.push(await repo.addPost({ run_id: run.id, content_id: content.id, platform, status: "published", platform_post_id: result.platform_post_id, url: result.url, metadata: { connectorStatus: status, result } }));
      } else {
        posts.push(await repo.addPost({
          run_id: run.id,
          content_id: content.id,
          platform,
          status: liveAllowed ? "blocked_connector_not_ready" : "export_ready",
          metadata: {
            connectorStatus: status,
            publishMode: config.app.publishMode,
            package: {
              title,
              description,
              aiGenerated: true,
              videoUri: videoAsset.uri,
            },
          },
        }));
      }
    } catch (error) {
      posts.push(await repo.addPost({
        run_id: run.id,
        content_id: content.id,
        platform,
        status: "failed",
        metadata: { connectorStatus: status, error: error.message },
      }));
    }
  }

  return posts;
}
