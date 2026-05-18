const root = document.querySelector("#app");

const state = {
  status: null,
  evidence: null,
  chat: [],
  me: null,
};

const platformNames = ["YouTube", "TikTok", "Instagram", "X", "LinkedIn", "Pinterest", "Reddit", "Telegram"];

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function navigate(path) {
  history.pushState({}, "", path);
  render();
}

function linkHandler(event) {
  const link = event.target.closest("a[data-link]");
  if (!link) return;
  event.preventDefault();
  navigate(link.getAttribute("href"));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value = "") {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
}

function publicNav() {
  return `
    <nav class="nav">
      <div class="nav-inner">
        <a class="brand" href="/" data-link>
          <span class="mark">VF</span>
          <span>ViralForge<small>Media Network</small></span>
        </a>
        <div class="nav-links">
          <a href="#product">Product</a>
          <a href="#channels">Channels</a>
          <a href="#monetize">Monetize</a>
        </div>
        <div class="nav-actions">
          <a class="btn btn-secondary" href="/app" data-link>Sign in</a>
          <a class="btn btn-primary" href="/app" data-link>Open workspace</a>
        </div>
      </div>
    </nav>
  `;
}

function appNav(active = "workspace") {
  return `
    <aside class="sidebar">
      <a class="brand" href="/app" data-link>
        <span class="mark">VF</span>
        <span>ViralForge<small>Workspace</small></span>
      </a>
      <div class="side-links">
        <a class="side-link ${active === "workspace" ? "active" : ""}" href="/app" data-link>Create</a>
        <a class="side-link" href="/app#review" data-link>Review</a>
        <a class="side-link" href="/app#assets" data-link>Assets</a>
        <a class="side-link" href="/app#schedule" data-link>Schedule</a>
        <a class="side-link" href="/app#quality" data-link>Quality</a>
        <a class="side-link ${active === "admin" ? "active" : ""}" href="/admin" data-link>Admin</a>
        <a class="side-link" href="/" data-link>Marketing Site</a>
      </div>
      <button class="btn btn-secondary" id="logout" style="width:100%;margin-top:26px;">Sign out</button>
    </aside>
  `;
}

function loginPage(targetPath) {
  return `
    <div class="shell">
      ${publicNav()}
      <main class="login-wrap">
        <form class="form-card" id="login-form" data-target="${escapeHtml(targetPath)}">
          <div class="eyebrow">Private Workspace</div>
          <h1>Sign in to ViralForge.</h1>
          <p>Public visitors only see the marketing site. Content creation, review, assets, schedule, and quality controls stay private.</p>
          <div class="field">
            <label>Password</label>
            <input name="password" type="password" autocomplete="current-password" placeholder="Operator password" required />
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:14px;">Sign in</button>
        </form>
      </main>
    </div>
  `;
}

function marketingPage() {
  return `
    <div class="shell">
      ${publicNav()}
      <main class="container hero">
        <section>
          <div class="eyebrow">AI-powered media network</div>
          <h1>Build content brands that keep moving.</h1>
          <p>
            ViralForge helps teams turn high-potential ideas into faceless videos,
            channel-ready assets, review queues, and scheduled posts from one private workspace.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/app" data-link>Open workspace</a>
            <a class="btn btn-secondary" href="#product">Explore product</a>
          </div>
          <div class="proof-row">
            <div class="proof"><strong>24/7</strong><span>content operations</span></div>
            <div class="proof"><strong>8</strong><span>platform paths</span></div>
            <div class="proof"><strong>7</strong><span>content formats</span></div>
            <div class="proof"><strong>1</strong><span>workspace</span></div>
          </div>
        </section>
        <aside class="preview-card">
          <div class="preview-top">
            <div>
              <strong>Inside the workspace</strong>
              <div style="color: var(--muted); font-size:13px; margin-top:4px;">Create, review, schedule, and improve every content run.</div>
            </div>
            <span class="badge">Private</span>
          </div>
          <div class="steps">
            ${["Choose or discover an idea", "Generate a content run", "Review video assets", "Approve quality", "Schedule channels", "Track winners"].map((step, index) => `
              <div class="step">
                <span class="num">${index + 1}</span>
                <strong>${step}</strong>
                <span class="status">Ready</span>
              </div>
            `).join("")}
          </div>
        </aside>
      </main>

      <section id="product">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Product</div>
              <h2>A private control room for content operators.</h2>
            </div>
            <p>Generate videos, approve outputs, organize assets, schedule channels, and ask the assistant what needs attention.</p>
          </div>
          <div class="grid-4">
            ${[
              ["Create", "Start a content run from a topic, objective, or trend signal."],
              ["Review", "See what was produced, what needs approval, and what is ready."],
              ["Schedule", "Prepare each platform package without exposing internal operations."],
              ["Improve", "Use results to choose sharper topics, hooks, formats, and channels."]
            ].map(([title, copy]) => `
              <article class="tile"><span class="tile-icon">OK</span><h3>${title}</h3><p>${copy}</p></article>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="channels" class="dark">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Channels</div>
              <h2>Made for faceless brands at scale.</h2>
            </div>
            <p>Shorts, Reels, TikToks, pins, posts, polls, and longer cuts can all be managed from one workspace.</p>
          </div>
          <div class="grid-4">
            ${platformNames.map(platform => `
              <article class="tile"><span class="tile-icon">UP</span><h3>${platform}</h3><p>Prepare native captions, hooks, metadata, and review controls for this channel.</p></article>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="monetize">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Monetization</div>
              <h2>Built beyond ad revenue.</h2>
            </div>
            <p>Use content as discovery, then monetize through affiliate links, sponsorships, licensing, lead generation, and data products.</p>
          </div>
          <a class="btn btn-primary" href="/app" data-link>Go to workspace</a>
        </div>
      </section>
    </div>
  `;
}

function userFriendlyStatus(status = "") {
  if (String(status).startsWith("ready")) return "Connected";
  if (status === "published") return "Ready";
  if (status === "dry_run_ready") return "Ready to review";
  if (status === "completed") return "Completed";
  if (status === "held") return "Needs review";
  return "Setup needed";
}

function friendlyDecision(run) {
  const decision = String(run?.decision || "").toLowerCase();
  if (run?.status === "held" || decision.includes("review")) return "Needs your review";
  if (run?.status === "completed" || decision.includes("ready")) return "Ready for release prep";
  if (run?.status === "failed") return "Needs correction";
  return "Processing";
}

function latestOutputs() {
  const runs = state.evidence?.runs || [];
  return runs.slice(0, 5);
}

function assetCards() {
  const assets = state.evidence?.assets || [];
  if (!assets.length) return `<p>No assets yet. Start a content run to create videos, images, and audio.</p>`;
  return `
    <div class="grid-4">
      ${assets.slice(0, 8).map(asset => `
        <article class="tile">
          <span class="tile-icon">${escapeHtml(String(asset.type || "asset").slice(0, 2).toUpperCase())}</span>
          <h3>${escapeHtml(titleCase(asset.type || "Asset"))}</h3>
          <p>${escapeHtml(asset.metadata?.title || asset.source || "Generated asset")}</p>
          <span class="pill">${escapeHtml(asset.status || asset.source || "ready")}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function qualityCards() {
  const tracker = state.status?.complianceTracker || [];
  const visible = ["originality", "rights", "fact_risk", "brand_safety", "platform_fit", "human_exception"];
  return visible.map(name => {
    const item = tracker.find(gate => gate.gate === name);
    const status = item?.status || "not_run";
    return `
      <article class="tile">
        <span class="tile-icon">${status === "pass" ? "OK" : status === "hold" ? "!" : "--"}</span>
        <h3>${escapeHtml(titleCase(name))}</h3>
        <p>${status === "pass" ? "Approved for this stage." : status === "hold" ? "Needs your review before publishing." : "Will run after content is created."}</p>
      </article>
    `;
  }).join("");
}

function friendlyGateMessage(item) {
  if (!item) return "Will run after content is created.";
  if (item.status === "pass") return "Cleared.";
  if (item.status === "hold") return "Needs review before release.";
  if (item.status === "fail" || item.status === "block") return "Blocked until corrected.";
  return "Waiting for the next content run.";
}

function activityLabel(log = {}) {
  const agent = String(log.agent || "").toLowerCase();
  if (agent.includes("trend") || agent.includes("brief") || agent.includes("script")) return "Creation";
  if (agent.includes("asset") || agent.includes("render")) return "Production";
  if (agent.includes("policy")) return "Quality";
  if (agent.includes("post") || agent.includes("signal")) return "Publishing";
  return "System";
}

function activityMessage(log = {}) {
  const label = activityLabel(log);
  if (label === "Creation" && log.status === "started") return "Finding ideas and shaping the content.";
  if (label === "Creation" && log.status === "completed") return "Content direction is ready.";
  if (label === "Production" && log.status === "started") return "Creating media assets.";
  if (label === "Production" && log.status === "completed") return "Media assets are ready.";
  if (label === "Quality" && log.status === "completed") return "Quality checks finished.";
  if (label === "Publishing" && log.status === "completed") return "Channel packages and performance notes updated.";
  if (String(log.message || "").toLowerCase().includes("started")) return "Work started.";
  if (String(log.message || "").toLowerCase().includes("completed")) return "Work completed.";
  return "Working on the current content run.";
}

function scheduleCards() {
  const posts = state.evidence?.posts || [];
  const byPlatform = new Map(posts.map(post => [post.platform, post]));
  return platformNames.map(platform => {
    const post = byPlatform.get(platform);
    return `
      <article class="tile">
        <h3>${platform}</h3>
        <p>${post ? `Package ${userFriendlyStatus(post.status).toLowerCase()}.` : "No package prepared yet."}</p>
        <span class="pill">${post ? userFriendlyStatus(post.status) : userFriendlyStatus(state.status?.connectors?.[platform])}</span>
      </article>
    `;
  }).join("");
}

function reviewList() {
  const outputs = latestOutputs();
  if (!outputs.length) return `<p>No content to review yet. Create the first run and this queue will fill automatically.</p>`;
  return `
        <div class="list">
      ${outputs.map(run => `
        <div class="list-item">
          <strong>${escapeHtml(run.input?.topic || "Untitled run")}</strong>
          <span>${escapeHtml(friendlyDecision(run))}</span>
          <span class="pill">${userFriendlyStatus(run.status)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function userApp() {
  const counts = state.status?.counts || {};
  const qualityCount = state.evidence?.policyEvents?.length || 0;
  const latest = latestOutputs()[0];
  return `
    <div class="app-shell">
      ${appNav("workspace")}
      <main class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Workspace</div>
            <h1 style="font-size:52px;margin-top:12px;">Create, review, schedule.</h1>
            <p style="color:var(--muted);max-width:760px;line-height:1.7;">This is the operating layer: content runs, produced assets, review decisions, channel packages, quality status, and the assistant.</p>
          </div>
          <button class="btn btn-primary" id="start-run">Quick create</button>
        </div>

        <div class="proof-row">
          <div class="proof"><strong>${counts.runs || 0}</strong><span>content runs</span></div>
          <div class="proof"><strong>${counts.assets || 0}</strong><span>assets produced</span></div>
          <div class="proof"><strong>${counts.posts || 0}</strong><span>channel packages</span></div>
          <div class="proof"><strong>${qualityCount}</strong><span>quality checks</span></div>
        </div>

        <div class="console-grid" style="margin-top:22px;">
          <section class="panel">
            <h2>Create</h2>
            <p>Give ViralForge a topic, or leave it broad and let the system choose from current signals.</p>
            <form id="run-form">
              <div class="field"><label>Topic</label><textarea name="topic">A simple home upgrade people do wrong every day</textarea></div>
              <div class="field"><label>Goal</label><input name="objective" value="Create a faceless short with assets and channel packages" /></div>
              <div class="field"><label>Review level</label><select name="risk"><option value="standard">Standard</option><option value="strict">Strict review</option></select></div>
              <button class="btn btn-primary" style="width:100%;margin-top:16px;">Generate content</button>
            </form>
          </section>
          <section class="panel" id="review">
            <h2>Review Queue</h2>
            ${reviewList()}
          </section>
        </div>

        <section id="assets" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Assets</div><h2>Produced media.</h2></div>
            <p>${latest ? `Latest topic: ${escapeHtml(latest.input?.topic || "Untitled")}` : "Created videos, images, voice, captions, and metadata appear here."}</p>
          </div>
          ${assetCards()}
        </section>

        <section id="schedule" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Schedule</div><h2>Channel packages.</h2></div>
            <p>See what is ready for each channel. Accounts can be connected from the private admin area.</p>
          </div>
          <div class="grid-4">${scheduleCards()}</div>
        </section>

        <section id="quality" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Quality</div><h2>Review before release.</h2></div>
            <p>Only the decisions you need: originality, rights, claims, brand safety, platform fit, and human review.</p>
          </div>
          <div class="grid-4">${qualityCards()}</div>
        </section>

        <section style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Assistant</div><h2>Ask what needs attention.</h2></div>
          </div>
          <div class="panel">
            <div class="list">${state.chat.map(item => `<div class="list-item"><strong>${escapeHtml(item.role)}</strong><span>${escapeHtml(item.text)}</span></div>`).join("") || "<p>Try: What should I review next?</p>"}</div>
            <form id="chat-form" class="field" style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:16px;">
              <input name="message" placeholder="Ask ViralForge..." />
              <button class="btn btn-primary">Send</button>
            </form>
          </div>
        </section>
      </main>
    </div>
  `;
}

function adminConsole() {
  const status = state.status;
  const evidence = state.evidence;
  const counts = status?.counts || {};
  return `
    <div class="app-shell">
      ${appNav("admin")}
      <main class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Admin</div>
            <h1 style="font-size:52px;margin-top:12px;">Private system controls.</h1>
            <p style="color:var(--muted);max-width:760px;line-height:1.7;">This area is protected. Use it for setup, health checks, corrective action, and release control.</p>
          </div>
          <div class="nav-actions">
            <button class="btn btn-secondary" id="refresh">Refresh</button>
            <button class="btn btn-primary" id="autopilot">Run cycle</button>
          </div>
        </div>
        <div class="grid-4">
          <article class="tile"><span class="tile-icon">CR</span><h3>Content Runs</h3><p>${counts.runs || 0} created so far.</p></article>
          <article class="tile"><span class="tile-icon">AS</span><h3>Assets</h3><p>${counts.assets || 0} produced and stored.</p></article>
          <article class="tile"><span class="tile-icon">PK</span><h3>Packages</h3><p>${counts.posts || 0} channel packages prepared.</p></article>
          <article class="tile"><span class="tile-icon">QC</span><h3>Quality</h3><p>${evidence?.policyEvents?.length || 0} release checks recorded.</p></article>
        </div>
        <div class="console-grid" style="margin-top:22px;">
          <section class="panel">
            <h2>Release Controls</h2>
            <div class="list">
              ${(status?.complianceTracker || []).map(item => `
                <div class="list-item"><strong>${escapeHtml(titleCase(item.gate))}</strong><span>${escapeHtml(friendlyGateMessage(item))}</span><span class="pill">${escapeHtml(item.status)}</span></div>
              `).join("")}
            </div>
          </section>
          <section class="panel">
            <h2>Activity</h2>
            <div class="list">
              ${(evidence?.jobLogs || []).slice(0, 14).map(log => `
                <div class="list-item"><strong>${escapeHtml(activityLabel(log))}</strong><span>${escapeHtml(activityMessage(log))}</span><span class="pill">${escapeHtml(log.status)}</span></div>
              `).join("")}
            </div>
          </section>
        </div>
      </main>
    </div>
  `;
}

async function getMe() {
  try {
    state.me = await api("/api/auth/me");
  } catch {
    state.me = { authenticated: false };
  }
  return state.me;
}

async function refresh() {
  state.status = await api("/api/status");
  state.evidence = await api("/api/evidence");
}

async function startRun(form) {
  const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
  await api("/api/runs/start", {
    method: "POST",
    body: JSON.stringify({
      topic: data.topic || "A simple home upgrade people do wrong every day",
      objective: data.objective || "Create a faceless short with assets and channel packages",
      risk: data.risk || "standard",
      budgetUsd: 120,
    }),
  });
  setTimeout(async () => {
    await refresh();
    render();
  }, 2500);
}

async function requireAuth(path) {
  const me = await getMe();
  if (me.authenticated) return true;
  root.innerHTML = loginPage(path);
  wire();
  return false;
}

async function wire() {
  document.querySelector("#refresh")?.addEventListener("click", async () => { await refresh(); render(); });
  document.querySelector("#autopilot")?.addEventListener("click", async () => { await api("/api/autopilot/tick", { method: "POST", body: "{}" }); await refresh(); render(); });
  document.querySelector("#start-run")?.addEventListener("click", () => startRun());
  document.querySelector("#logout")?.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    state.me = { authenticated: false };
    state.status = null;
    state.evidence = null;
    navigate("/");
  });
  document.querySelector("#login-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/auth/login", { method: "POST", body: JSON.stringify({ password: data.password }) });
    state.me = { authenticated: true, user: { role: "admin" } };
    navigate(form.dataset.target || "/app");
  });
  document.querySelector("#run-form")?.addEventListener("submit", event => {
    event.preventDefault();
    startRun(event.currentTarget);
  });
  document.querySelector("#chat-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    state.chat.push({ role: "You", text: data.message });
    const reply = await api("/api/chat", { method: "POST", body: JSON.stringify({ message: data.message }) });
    state.chat.push({ role: "ViralForge", text: reply.reply });
    render();
  });
}

async function render() {
  const path = location.pathname;
  try {
    if (path === "/admin") {
      if (!(await requireAuth(path))) return;
      if (!state.status || !state.evidence) await refresh();
      root.innerHTML = adminConsole();
    } else if (path === "/app") {
      if (!(await requireAuth(path))) return;
      if (!state.status || !state.evidence) await refresh();
      root.innerHTML = userApp();
    } else {
      root.innerHTML = marketingPage();
    }
    wire();
  } catch (error) {
    if (error.status === 401) {
      state.me = { authenticated: false };
      root.innerHTML = loginPage(path);
      wire();
      return;
    }
    throw error;
  }
}

document.body.addEventListener("click", linkHandler);
window.addEventListener("popstate", render);
render().catch(error => {
  root.innerHTML = `<main class="login-wrap"><div class="form-card"><h1>ViralForge</h1><p>${escapeHtml(error.message)}</p></div></main>`;
});
