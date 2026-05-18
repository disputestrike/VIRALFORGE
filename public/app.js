const root = document.querySelector("#app");

const state = {
  status: null,
  evidence: null,
  workspace: null,
  authConfig: null,
  chat: [],
  me: null,
  busy: "",
  notice: "",
  lastRefreshed: "",
  lastJob: null,
  selectedRunId: "",
};

const platformNames = ["YouTube", "TikTok", "Instagram", "X", "LinkedIn", "Pinterest", "Reddit", "Telegram"];
const pricingPlans = [
  ["Starter", "$149", "For one faceless brand testing daily production.", "25 videos/month", "2 connected channels", "Review queue", "Export packages"],
  ["Growth", "$499", "For operators scaling multiple channels.", "150 videos/month", "8 connected channels", "Autopilot", "Performance learning"],
  ["Network", "$1,500", "For serious media networks.", "Unlimited runs", "50+ channels", "Priority workers", "Sponsorship and data workflows"],
];

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

function scrollToHash() {
  if (!location.hash) return;
  setTimeout(() => {
    document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}

function setNotice(message, busy = "") {
  state.notice = message;
  state.busy = busy;
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

function noticeBanner() {
  if (!state.notice && !state.busy) return "";
  return `
    <div class="action-banner ${state.busy ? "working" : ""}">
      <div>
        <strong>${state.busy ? "Working" : "Update"}</strong>
        <span>${escapeHtml(state.notice || state.busy)}</span>
      </div>
      ${state.lastJob ? `<span class="pill">Job ${escapeHtml(state.lastJob.id || "queued")}</span>` : ""}
    </div>
  `;
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
          <a href="#pricing">Pricing</a>
          <a href="#proof">Proof</a>
        </div>
        <div class="nav-actions">
          <a class="btn btn-secondary" href="/app" data-link>Sign in</a>
          <a class="btn btn-primary" href="/signup" data-link>Start free trial</a>
        </div>
      </div>
    </nav>
  `;
}

function footer() {
  return `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <a class="brand" href="/" data-link>
            <span class="mark">VF</span>
            <span>ViralForge<small>Media Network</small></span>
          </a>
          <p>AI content operations for faceless media brands, built around discovery, production, review, scheduling, and learning.</p>
        </div>
        <div>
          <strong>Product</strong>
          <a href="#product">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="/app" data-link>Sign in</a>
        </div>
        <div>
          <strong>Operations</strong>
          <a href="/app#radar" data-link>Viral Radar</a>
          <a href="/app#review" data-link>Review queue</a>
          <a href="/admin" data-link>Admin</a>
        </div>
        <div>
          <strong>Business</strong>
          <a href="#monetize">Monetization</a>
          <a href="#channels">Channels</a>
          <a href="/signup" data-link>Start trial</a>
        </div>
      </div>
    </footer>
  `;
}

function appNav(active = "radar") {
  return `
    <aside class="sidebar">
      <a class="brand" href="/app" data-link>
        <span class="mark">VF</span>
        <span>ViralForge<small>Workspace</small></span>
      </a>
      <div class="side-links">
        <a class="side-link ${active === "radar" ? "active" : ""}" href="/app#radar" data-link>Viral Radar</a>
        <a class="side-link" href="/app#production" data-link>Production</a>
        <a class="side-link" href="/app#review" data-link>Review</a>
        <a class="side-link" href="/app#history" data-link>History</a>
        <a class="side-link" href="/app#assets" data-link>Assets</a>
        <a class="side-link" href="/app#schedule" data-link>Schedule</a>
        <a class="side-link" href="/app#evidence" data-link>Evidence</a>
        <a class="side-link ${active === "admin" ? "active" : ""}" href="/admin" data-link>Admin</a>
        <a class="side-link" href="/" data-link>Marketing Site</a>
      </div>
      <button class="btn btn-secondary" id="logout" style="width:100%;margin-top:26px;">Sign out</button>
    </aside>
  `;
}

async function getAuthConfig() {
  if (!state.authConfig) state.authConfig = await api("/api/auth/config");
  return state.authConfig;
}

function credentialHelp() {
  const creds = state.authConfig?.localTestCredentials;
  if (!creds) return "";
  return `
    <div class="alert" style="margin-top:18px;">
      Local test account<br />
      Email: <strong>${escapeHtml(creds.email)}</strong><br />
      Password: <strong>${escapeHtml(creds.password)}</strong>
    </div>
  `;
}

function loginPage(targetPath) {
  return `
    <div class="shell">
      ${publicNav()}
      <main class="login-wrap">
        <form class="form-card" id="login-form" data-target="${escapeHtml(targetPath)}">
          <div class="eyebrow">Sign In</div>
          <h1>Welcome back.</h1>
          <p>Use the founder account below locally, or your Railway workspace credentials in production.</p>
          <div class="field">
            <label>Email</label>
            <input name="email" type="email" autocomplete="username" placeholder="founder@viralforge.ai" required />
          </div>
          <div class="field">
            <label>Password</label>
            <input name="password" type="password" autocomplete="current-password" placeholder="Password" required />
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:14px;">Sign in</button>
          <a class="btn btn-secondary" style="width:100%;margin-top:10px;" href="/signup" data-link>Create trial workspace</a>
          ${credentialHelp()}
        </form>
      </main>
    </div>
  `;
}

function signupPage() {
  return `
    <div class="shell">
      ${publicNav()}
      <main class="login-wrap">
        <form class="form-card" id="signup-form">
          <div class="eyebrow">Start Trial</div>
          <h1>Create your workspace.</h1>
          <p>Local sign-up is enabled for testing. In production this becomes the PayPal-backed SaaS onboarding path.</p>
          <div class="field">
            <label>Email</label>
            <input name="email" type="email" autocomplete="username" placeholder="you@company.com" required />
          </div>
          <div class="field">
            <label>Password</label>
            <input name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" required />
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:14px;">Create workspace</button>
          <a class="btn btn-secondary" style="width:100%;margin-top:10px;" href="/app" data-link>I already have an account</a>
        </form>
      </main>
    </div>
  `;
}

function marketingPage() {
  return `
    <div class="shell">
      ${publicNav()}
      <main class="container hero hero-product">
        <section>
          <div class="eyebrow">AI media command center</div>
          <h1>Find what is taking off. Turn it into video first.</h1>
          <p>
            ViralForge watches trend signals, ranks what has momentum, generates faceless videos,
            prepares channel packages, and learns which formats deserve more volume.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/signup" data-link>Start free trial</a>
            <a class="btn btn-secondary" href="/app" data-link>Sign in</a>
          </div>
          <div class="proof-row">
            <div class="proof"><strong>Trend-first</strong><span>no guessing what to post</span></div>
            <div class="proof"><strong>Videos</strong><span>MP4 assets and packages</span></div>
            <div class="proof"><strong>Review</strong><span>quality gates before release</span></div>
            <div class="proof"><strong>Learning</strong><span>winners feed the next cycle</span></div>
          </div>
        </section>
        <aside class="hero-media">
          <img src="/assets/viralforge-dashboard.svg" alt="ViralForge dashboard preview" />
        </aside>
      </main>

      <section id="product">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Product</div>
              <h2>Built for people running content networks, not one-off posts.</h2>
            </div>
            <p>After sign-in, the first screen shows what the system thinks is worth making next.</p>
          </div>
          <div class="grid-4">
            ${[
              ["Viral Radar", "Ranked topic opportunities by score, pillar, region, and production fit."],
              ["Production", "Generate script, image, voice, video, captions, metadata, and platform packages."],
              ["Review", "Hold risky content, approve safe content, and keep a release trail."],
              ["Learning", "Use outcomes to make stronger follow-ups instead of repeating dead formats."]
            ].map(([title, copy]) => `<article class="tile"><span class="tile-icon">${title.slice(0, 2).toUpperCase()}</span><h3>${title}</h3><p>${copy}</p></article>`).join("")}
          </div>
        </div>
      </section>

      <section id="channels" class="dark">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Channels</div>
              <h2>One run, many release packages.</h2>
            </div>
            <p>Each platform gets its own caption, format, metadata, schedule status, and approval path.</p>
          </div>
          <div class="logo-row">
            ${platformNames.map(platform => `<span>${platform}</span>`).join("")}
          </div>
        </div>
      </section>

      <section id="pricing">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Pricing</div>
              <h2>Priced like a media operating system.</h2>
            </div>
            <p>Pay for production capacity, channels, automation, and learning. PayPal subscriptions are planned for SaaS billing.</p>
          </div>
          <div class="pricing-grid">
            ${pricingPlans.map(([name, price, copy, ...features]) => `
              <article class="price-card ${name === "Growth" ? "featured" : ""}">
                <h3>${name}</h3>
                <strong>${price}<small>/mo</small></strong>
                <p>${copy}</p>
                <div class="list compact">
                  ${features.map(feature => `<div class="list-item"><span>${feature}</span></div>`).join("")}
                </div>
                <a class="btn ${name === "Growth" ? "btn-primary" : "btn-secondary"}" href="/signup" data-link>Start ${name}</a>
              </article>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="proof">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Proof</div>
              <h2>Not a posting calendar. A production loop.</h2>
            </div>
            <p>The private workspace shows generated runs, produced assets, channel packages, quality checks, and what the system learned.</p>
          </div>
          <a class="btn btn-primary" href="/app" data-link>Sign in to see evidence</a>
        </div>
      </section>
      ${footer()}
    </div>
  `;
}

function trends() {
  const byTopic = new Map();
  for (const trend of state.evidence?.trends || []) {
    const key = String(trend.topic || "").toLowerCase();
    const current = byTopic.get(key);
    if (!current || Number(trend.score || 0) > Number(current.score || 0)) byTopic.set(key, trend);
  }
  return [...byTopic.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 8);
}

function latestOutputs() {
  return (state.workspace?.runs || state.evidence?.runs || []).slice(0, 6);
}

function allRuns() {
  return state.workspace?.runs || state.evidence?.runs || [];
}

function selectedRun() {
  const runs = allRuns();
  return runs.find(run => run.id === state.selectedRunId) || runs[0] || null;
}

function money(value = 0) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function userFriendlyStatus(status = "") {
  if (String(status).startsWith("ready")) return "Connected";
  if (status === "published") return "Ready";
  if (status === "dry_run_ready") return "Ready to review";
  if (status === "completed") return "Completed";
  if (status === "held") return "Needs review";
  if (status === "failed") return "Needs correction";
  return "Setup needed";
}

function friendlyDecision(run) {
  const decision = String(run?.decision || "").toLowerCase();
  if (run?.status === "held" || decision.includes("review")) return "Needs your review";
  if (run?.status === "completed" || decision.includes("ready")) return "Ready for release prep";
  if (run?.status === "failed") return "Needs correction";
  return "Processing";
}

function trendRadar() {
  const rows = trends();
  if (!rows.length) {
    return `<p>No trend scan yet. Run the viral scan and the AI will rank what to make next.</p>`;
  }
  return `
    <div class="trend-list">
      ${rows.map((trend, index) => `
        <article class="trend-card ${index === 0 ? "hot" : ""}">
          <div>
            <span class="pill">${escapeHtml(titleCase(trend.pillar || "opportunity"))}</span>
            <h3>${escapeHtml(trend.topic)}</h3>
            <p>${escapeHtml(trend.region || "global")} opportunity with a ${Math.round(Number(trend.score || 0))}/100 viral score.</p>
          </div>
          <div class="trend-action">
            <strong>${Math.round(Number(trend.score || 0))}</strong>
            <button class="btn btn-primary trend-run" data-topic="${escapeHtml(trend.topic)}" data-pillar="${escapeHtml(trend.pillar || "curiosity_gap")}">Generate this</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function reviewList() {
  const outputs = state.workspace?.reviewQueue?.length ? state.workspace.reviewQueue : latestOutputs();
  if (!outputs.length) return `<p>No videos in review yet. Run the viral scan to create the first package.</p>`;
  return `
    <div class="list">
      ${outputs.map(run => `
        <div class="list-item action-item">
          <strong>${escapeHtml(run.topic || run.input?.topic || run.output?.brief?.title || "Autonomous trend run")}</strong>
          <span>${escapeHtml(friendlyDecision(run))}</span>
          <span class="pill">${userFriendlyStatus(run.status)}</span>
          <button class="mini-btn run-detail" data-run-id="${escapeHtml(run.id)}">View</button>
          ${run.canApprove ? `<button class="mini-btn approve-run" data-run-id="${escapeHtml(run.id)}">Approve</button>` : ""}
          ${run.canRetry ? `<button class="mini-btn retry-run" data-run-id="${escapeHtml(run.id)}">Retry</button>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function assetCards() {
  const assets = state.workspace?.assets || state.evidence?.assets || [];
  if (!assets.length) return `<p>No assets yet. Generated video, image, and audio assets appear here after the first run.</p>`;
  return `
    <div class="grid-4">
      ${assets.slice(0, 8).map(asset => `
        <article class="tile">
          <span class="tile-icon">${escapeHtml(String(asset.type || "asset").slice(0, 2).toUpperCase())}</span>
          <h3>${escapeHtml(titleCase(asset.type || "Asset"))}</h3>
          <p>${escapeHtml(asset.metadata?.title || asset.metadata?.key || "Generated media")}</p>
          ${asset.mediaUrl || asset.uri ? `<a class="pill" href="${escapeHtml(asset.mediaUrl || asset.uri)}" target="_blank" rel="noreferrer">Open</a>` : `<span class="pill">Ready</span>`}
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
        <span class="tile-icon">${status === "pass" ? "OK" : status === "hold" ? "RV" : "--"}</span>
        <h3>${escapeHtml(titleCase(name))}</h3>
        <p>${status === "pass" ? "Cleared for this stage." : status === "hold" ? "Needs your review before publishing." : "Will run after the next generated package."}</p>
      </article>
    `;
  }).join("");
}

function scheduleCards() {
  const posts = state.workspace?.posts || state.evidence?.posts || [];
  const byPlatform = new Map(posts.map(post => [post.platform, post]));
  return platformNames.map(platform => {
    const post = byPlatform.get(platform);
    return `
      <article class="tile">
        <h3>${platform}</h3>
        <p>${post ? `Package ${userFriendlyStatus(post.status).toLowerCase()}.` : "No package prepared yet."}</p>
        <span class="pill">${post ? userFriendlyStatus(post.status) : "Connect channel"}</span>
      </article>
    `;
  }).join("");
}

function evidenceSummary() {
  const counts = state.status?.counts || {};
  const qualityCount = state.evidence?.policyEvents?.length || 0;
  const completed = allRuns().filter(run => run.status === "completed").length;
  const videoAssets = (state.workspace?.assets || state.evidence?.assets || []).filter(asset => asset.type === "video").length;
  return `
    <div class="proof-row">
      <div class="proof"><strong>${completed}</strong><span>completed runs</span></div>
      <div class="proof"><strong>${videoAssets}</strong><span>video assets</span></div>
      <div class="proof"><strong>${counts.posts || 0}</strong><span>channel packages</span></div>
      <div class="proof"><strong>${qualityCount}</strong><span>quality checks</span></div>
    </div>
  `;
}

function revenuePanel() {
  const revenue = state.workspace?.revenue || { actual: 0, learningEstimate: 0, mode: "dry_run_no_actual_platform_revenue" };
  return `
    <div class="proof-row revenue-row">
      <div class="proof"><strong>${money(revenue.actual)}</strong><span>actual platform revenue</span></div>
      <div class="proof"><strong>${money(revenue.learningEstimate)}</strong><span>learning estimate</span></div>
      <div class="proof"><strong>${revenue.mode === "live_platform_metrics" ? "Live" : "Dry run"}</strong><span>revenue mode</span></div>
      <div class="proof"><strong>${state.workspace?.analytics?.length || 0}</strong><span>metric records</span></div>
    </div>
  `;
}

function runHistory() {
  const runs = allRuns();
  if (!runs.length) return `<p>No production history yet. Run Viral Radar to create the first record.</p>`;
  return `
    <div class="list history-list">
      ${runs.slice(0, 10).map(run => `
        <div class="list-item action-item">
          <strong>${escapeHtml(run.topic || run.input?.topic || "Autonomous run")}</strong>
          <span>${escapeHtml(titleCase(run.pillar || run.output?.brief?.pillar || "content"))}</span>
          <span class="pill">${escapeHtml(userFriendlyStatus(run.status))}</span>
          ${run.videoUrl ? `<a class="mini-btn" href="${escapeHtml(run.videoUrl)}" target="_blank" rel="noreferrer">Open video</a>` : ""}
          <button class="mini-btn run-detail" data-run-id="${escapeHtml(run.id)}">Details</button>
        </div>
      `).join("")}
    </div>
  `;
}

function runDetailPanel() {
  const run = selectedRun();
  if (!run) return `<p>No run selected yet.</p>`;
  const posts = run.posts || [];
  const metrics = run.metrics || [];
  return `
    <div class="run-detail">
      <div class="detail-main">
        <div class="eyebrow">${escapeHtml(titleCase(run.pillar || "content"))}</div>
        <h3>${escapeHtml(run.topic || "Autonomous run")}</h3>
        <p>${escapeHtml(run.brief?.hook || run.decision || "Production details will appear after the run completes.")}</p>
        <div class="detail-actions">
          ${run.videoUrl ? `<a class="btn btn-primary" href="${escapeHtml(run.videoUrl)}" target="_blank" rel="noreferrer">Open produced video</a>` : ""}
          ${run.canApprove ? `<button class="btn btn-secondary approve-run" data-run-id="${escapeHtml(run.id)}">Approve release</button>` : ""}
          ${run.canRetry ? `<button class="btn btn-secondary retry-run" data-run-id="${escapeHtml(run.id)}">Run correction</button>` : ""}
        </div>
      </div>
      <div class="detail-side">
        <div><strong>${escapeHtml(userFriendlyStatus(run.status))}</strong><span>status</span></div>
        <div><strong>${Math.round(Number(run.score || 0))}</strong><span>score</span></div>
        <div><strong>${posts.length}</strong><span>packages</span></div>
        <div><strong>${metrics.length}</strong><span>metrics</span></div>
      </div>
    </div>
  `;
}

function userApp() {
  const counts = state.status?.counts || {};
  const topTrend = trends()[0];
  return `
    <div class="app-shell">
      ${appNav("radar")}
      <main class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">Command Center</div>
            <h1 style="font-size:52px;margin-top:12px;">What should we publish next?</h1>
            <p style="color:var(--muted);max-width:760px;line-height:1.7;">ViralForge ranks opportunities, then turns the strongest ideas into videos, assets, review items, and scheduled channel packages.</p>
          </div>
          <div class="nav-actions">
            <button class="btn btn-secondary" id="refresh">Refresh</button>
            <button class="btn btn-secondary" id="autopilot" ${state.busy ? "disabled" : ""}>${state.busy === "scan" ? "Running scan..." : "Run viral scan"}</button>
            <button class="btn btn-primary" id="start-run" data-topic="${escapeHtml(topTrend?.topic || "")}" data-pillar="${escapeHtml(topTrend?.pillar || "")}" ${state.busy ? "disabled" : ""}>${state.busy === "generate" ? "Generating..." : "Generate top idea"}</button>
          </div>
        </div>

        ${noticeBanner()}

        <div class="live-strip">
          <div><strong>Live workspace</strong><span>Connected to the ViralForge server APIs.</span></div>
          <div><strong>${escapeHtml(state.lastRefreshed || "Not synced yet")}</strong><span>last refresh</span></div>
          <div><strong>${counts.runs || 0}</strong><span>persisted runs</span></div>
          <div><strong>${counts.assets || 0}</strong><span>stored assets</span></div>
        </div>

        ${evidenceSummary()}
        ${revenuePanel()}

        <section id="radar" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Viral Radar</div><h2>Ranked opportunities.</h2></div>
            <p>These cards are loaded from the server. Click Generate this to queue a real production run.</p>
          </div>
          ${trendRadar()}
        </section>

        <div class="console-grid" id="production" style="margin-top:22px;">
          <section class="panel">
            <h2>Manual Override</h2>
            <p>Use this only when you want to force a specific topic. The default path is Viral Radar.</p>
            <form id="run-form">
              <div class="field"><label>Topic</label><textarea name="topic" placeholder="Optional: force a topic">${escapeHtml(topTrend?.topic || "")}</textarea></div>
              <div class="field"><label>Goal</label><input name="objective" value="Create a faceless video with assets, review checks, and channel packages" /></div>
              <div class="field"><label>Review level</label><select name="risk"><option value="standard">Standard</option><option value="strict">Strict review</option></select></div>
              <button class="btn btn-primary" style="width:100%;margin-top:16px;">Generate package</button>
            </form>
          </section>
          <section class="panel" id="review">
            <h2>Review Queue</h2>
            ${reviewList()}
          </section>
        </div>

        <section id="history" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">History</div><h2>Everything the system has built.</h2></div>
            <p>Every generated package stays here with its video, status, review decision, channel packages, and metrics.</p>
          </div>
          <div class="console-grid">
            <section class="panel">${runHistory()}</section>
            <section class="panel">${runDetailPanel()}</section>
          </div>
        </section>

        <section id="assets" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Assets</div><h2>Produced media.</h2></div>
            <p>Generated video, image, audio, captions, and metadata are collected here after each run.</p>
          </div>
          ${assetCards()}
        </section>

        <section id="schedule" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Schedule</div><h2>Channel packages.</h2></div>
            <p>Publishing waits for connected accounts, approval status, and platform fit.</p>
          </div>
          <div class="grid-4">${scheduleCards()}</div>
        </section>

        <section id="quality" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Quality</div><h2>Release checks.</h2></div>
            <p>Only the decisions you need before release: originality, rights, claims, safety, fit, and review.</p>
          </div>
          <div class="grid-4">${qualityCards()}</div>
        </section>

        <section id="evidence" style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Evidence</div><h2>What has actually been built.</h2></div>
            <p>Counts come from persisted runs, assets, packages, release checks, and learning signals.</p>
          </div>
          ${evidenceSummary()}
        </section>

        <section style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Assistant</div><h2>Ask what needs attention.</h2></div>
          </div>
          <div class="panel">
            <div class="list">${state.chat.map(item => `<div class="list-item"><strong>${escapeHtml(item.role)}</strong><span>${escapeHtml(item.text)}</span></div>`).join("") || "<p>Try: What should we make next?</p>"}</div>
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

function codeEvidence() {
  const rows = [
    ["API server", "server.mjs", "Auth, routes, protected APIs"],
    ["Agents", "src/agents.mjs", "Trend, brief, script, assets, render, policy, publish"],
    ["Persistence", "src/db.mjs", "Postgres or local proof store"],
    ["Queue", "src/queue.mjs", "Redis workers or local worker fallback"],
    ["Renderer", "src/render/renderer.mjs", "FFmpeg MP4 output"],
    ["Policy", "src/policy.mjs", "Release checks and human review holds"],
    ["Learning", "src/learning.mjs", "Performance signals for future scoring"],
    ["Connectors", "src/connectors/index.mjs", "Platform package and live paths"],
  ];
  return `
    <div class="grid-4">
      ${rows.map(([name, file, proof]) => `<article class="tile"><span class="tile-icon">OK</span><h3>${name}</h3><p>${proof}</p><span class="pill">${file}</span></article>`).join("")}
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
            <h1 style="font-size:52px;margin-top:12px;">Proof, controls, corrective action.</h1>
            <p style="color:var(--muted);max-width:760px;line-height:1.7;">This protected page shows what exists in code and what has actually run locally.</p>
          </div>
          <div class="nav-actions">
            <button class="btn btn-secondary" id="refresh">Refresh</button>
            <button class="btn btn-primary" id="autopilot" ${state.busy ? "disabled" : ""}>${state.busy === "scan" ? "Running..." : "Run cycle"}</button>
          </div>
        </div>
        ${noticeBanner()}
        <div class="proof-row">
          <div class="proof"><strong>${counts.runs || 0}</strong><span>runs persisted</span></div>
          <div class="proof"><strong>${counts.assets || 0}</strong><span>assets stored</span></div>
          <div class="proof"><strong>${counts.posts || 0}</strong><span>packages prepared</span></div>
          <div class="proof"><strong>${evidence?.learningSignals?.length || 0}</strong><span>learning signals</span></div>
        </div>
        <section style="border-top:0;padding-top:24px;">
          <div class="section-head">
            <div><div class="eyebrow">Code Evidence</div><h2>Backend pieces in this repo.</h2></div>
          </div>
          ${codeEvidence()}
        </section>
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
            <h2>Recent Activity</h2>
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
  state.workspace = await api("/api/workspace");
  state.status = state.workspace.status;
  state.evidence = state.workspace;
  state.lastRefreshed = new Date().toLocaleTimeString();
}

async function startRun(input = {}) {
  try {
    setNotice("Queued a production run. The server is generating assets and packages now.", "generate");
    render();
    const job = await api("/api/runs/start", {
      method: "POST",
      body: JSON.stringify({
        topic: input.topic || "",
        pillar: input.pillar || "",
        objective: input.objective || "Create a faceless video with assets, review checks, and channel packages",
        risk: input.risk || "standard",
        budgetUsd: 120,
      }),
    });
    state.lastJob = job.job;
    await refresh();
    if (job.job?.runId || job.job?.status) state.selectedRunId = job.job.runId || job.job.id;
    setNotice(job.job?.status
      ? `Production finished locally with status: ${job.job.status}.`
      : "Run queued. Refresh again after the Railway worker finishes.");
    state.busy = "";
    render();
  } catch (error) {
    state.busy = "";
    setNotice(`Run failed: ${error.message}`);
    render();
  }
}

async function runViralScan() {
  try {
    setNotice("Running the autonomous trend-to-video cycle now.", "scan");
    render();
    const result = await api("/api/autopilot/tick", { method: "POST", body: "{}" });
    state.lastJob = { id: result.run?.id || "autopilot" };
    if (result.run?.id) state.selectedRunId = result.run.id;
    await refresh();
    setNotice(`Autonomous cycle finished: ${result.run?.status || "completed"}.`);
    state.busy = "";
    render();
  } catch (error) {
    state.busy = "";
    setNotice(`Viral scan failed: ${error.message}`);
    render();
  }
}

async function requireAuth(path) {
  await getAuthConfig();
  const me = await getMe();
  if (me.authenticated) return true;
  root.innerHTML = loginPage(path);
  wire();
  return false;
}

async function wire() {
  document.querySelector("#refresh")?.addEventListener("click", async () => {
    setNotice("Refreshing live workspace data from the server.", "refresh");
    render();
    await refresh();
    state.busy = "";
    setNotice("Workspace data refreshed.");
    render();
  });
  document.querySelector("#autopilot")?.addEventListener("click", runViralScan);
  document.querySelector("#start-run")?.addEventListener("click", event => {
    startRun({ topic: event.currentTarget.dataset.topic, pillar: event.currentTarget.dataset.pillar });
  });
  document.querySelectorAll(".trend-run").forEach(button => {
    button.addEventListener("click", () => startRun({ topic: button.dataset.topic, pillar: button.dataset.pillar }));
  });
  document.querySelectorAll(".run-detail").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedRunId = button.dataset.runId;
      render();
      document.querySelector("#history")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.querySelectorAll(".approve-run").forEach(button => {
    button.addEventListener("click", async () => {
      setNotice("Approving the held run and writing the review audit event.", "review");
      render();
      await api(`/api/runs/${button.dataset.runId}/approve`, { method: "POST", body: "{}" });
      await refresh();
      state.selectedRunId = button.dataset.runId;
      state.busy = "";
      setNotice("Run approved. It is now ready for connected channel release.");
      render();
    });
  });
  document.querySelectorAll(".retry-run").forEach(button => {
    button.addEventListener("click", async () => {
      setNotice("Running the corrective action cycle for this package.", "generate");
      render();
      const result = await api(`/api/runs/${button.dataset.runId}/retry`, { method: "POST", body: "{}" });
      await refresh();
      state.selectedRunId = result.job?.runId || result.job?.id || button.dataset.runId;
      state.busy = "";
      setNotice("Corrective run finished or queued. Latest evidence is loaded.");
      render();
    });
  });
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
    await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: data.email, password: data.password }) });
    state.me = { authenticated: true, user: { role: "owner", email: data.email } };
    navigate(form.dataset.target || "/app");
  });
  document.querySelector("#signup-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ email: data.email, password: data.password }) });
    state.me = { authenticated: true, user: { role: "owner", email: data.email } };
    navigate("/app");
  });
  document.querySelector("#run-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    startRun({ topic: data.topic, objective: data.objective, risk: data.risk });
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
    if (path === "/signup") {
      await getAuthConfig();
      root.innerHTML = signupPage();
    } else if (path === "/admin") {
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
    scrollToHash();
  } catch (error) {
    if (error.status === 401) {
      state.me = { authenticated: false };
      await getAuthConfig();
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
