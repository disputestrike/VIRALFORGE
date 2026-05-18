const root = document.querySelector("#app");

const state = {
  status: null,
  evidence: null,
  runs: [],
  chat: [],
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function nav() {
  return `
    <nav class="nav">
      <div class="nav-inner">
        <a class="brand" href="/">
          <span class="mark">VF</span>
          <span>ViralForge<small>Autonomous Media OS</small></span>
        </a>
        <div class="nav-links">
          <a href="#dashboard">Dashboard</a>
          <a href="#quality">Quality Gates</a>
          <a href="#agent">ForgeOps Agent</a>
        </div>
        <div class="nav-actions">
          <button class="btn btn-secondary" id="refresh">Refresh</button>
          <button class="btn btn-primary" id="autopilot">Run Autopilot Tick</button>
        </div>
      </div>
    </nav>
  `;
}

function card(title, value, note = "") {
  return `<div class="tile"><h3>${title}</h3><strong style="font-size:32px">${value}</strong><p>${note}</p></div>`;
}

function landing() {
  const s = state.status;
  const evidence = state.evidence;
  const counts = s?.counts || {};
  return `
    <div class="shell">
      ${nav()}
      <main class="container hero" id="dashboard">
        <section>
          <div class="eyebrow">Railway-ready autonomous AI content factory</div>
          <h1>ViralForge <span class="gradient-text">builds, checks, posts, learns.</span></h1>
          <p>
            TrendScout finds demand. BriefForge and Scriptor create content. AssetGen and Renderer produce real media.
            PolicyOS gates risk. PulsePost exports or publishes. SignalLoop recursively learns from results.
          </p>
          <div class="hero-actions">
            <button class="btn btn-primary" id="start-run">Start Full Pipeline Run</button>
            <button class="btn btn-secondary" id="show-keys">Show Missing Keys</button>
          </div>
          <div class="proof-row">
            ${card("Runs", counts.runs || 0, "Persisted production runs")}
            ${card("Assets", counts.assets || 0, "Images, audio, MP4 renders")}
            ${card("Posts", counts.posts || 0, "Export/live publish records")}
            ${card("Learning", counts.learningSignals || 0, "Recursive learning signals")}
          </div>
        </section>
        <aside class="preview-card">
          <div class="preview-top">
            <div>
              <strong>System Readiness</strong>
              <div style="color: var(--muted); font-size:13px; margin-top:4px;">Only API keys are expected to be missing locally.</div>
            </div>
            <span class="badge">${s?.providers?.publishMode || "loading"}</span>
          </div>
          <div class="steps">
            ${Object.entries(s?.providers || {}).map(([key, value], index) => `
              <div class="step">
                <span class="num">${index + 1}</span>
                <strong>${key}</strong>
                <span class="status">${value}</span>
              </div>
            `).join("")}
          </div>
        </aside>
      </main>

      <section id="quality">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Six Sigma QAQC</div>
              <h2>Quality gates and compliance tracker.</h2>
            </div>
            <p>Every run creates policy events, job logs, assets, post packages, and learning signals. Failures get corrective actions.</p>
          </div>
          <div class="grid-4">
            ${(s?.qualityMatrix || []).map(gate => `
              <article class="tile">
                <span class="tile-icon">${gate.status.toUpperCase()}</span>
                <h3>${gate.gate}</h3>
                <p><strong>Evidence:</strong> ${gate.evidence}</p>
                <p><strong>Corrective:</strong> ${gate.correctiveAction}</p>
              </article>
            `).join("")}
          </div>
          <div class="panel" style="margin-top:18px;">
            <h3>Compliance Crosswalk</h3>
            <div class="list">
              ${(s?.complianceTracker || []).map(item => `
                <div class="list-item">
                  <strong>${item.gate}</strong>
                  <span>${item.evidence}</span>
                  <span class="pill">${item.status}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Pipeline Evidence</div>
              <h2>Latest runs, posts, assets, and learning.</h2>
            </div>
          </div>
          <div class="console-grid">
            <div class="panel">
              <h3>Recent Runs</h3>
              <div class="list">
                ${(evidence?.runs || []).slice(0, 8).map(run => `
                  <div class="list-item">
                    <div>
                      <strong>${run.input?.topic || "Untitled"}</strong>
                      <p style="margin:4px 0 0">${run.decision || "processing"}</p>
                    </div>
                    <span class="pill">${run.status}</span>
                  </div>
                `).join("") || "<p>No runs yet. Start one.</p>"}
              </div>
            </div>
            <div class="panel">
              <h3>Recent Job Logs</h3>
              <div class="list">
                ${(evidence?.jobLogs || []).slice(0, 12).map(log => `
                  <div class="list-item">
                    <strong>${log.agent}</strong>
                    <span>${log.message}</span>
                    <span class="pill">${log.status}</span>
                  </div>
                `).join("") || "<p>No logs yet.</p>"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="agent" class="dark">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">ForgeOps Agent</div>
              <h2>Chat with the operating system.</h2>
            </div>
            <p>Ask what is missing, start a run, diagnose failures, or inspect recursive learning.</p>
          </div>
          <div class="panel" style="background:white;color:var(--ink);">
            <div id="chat-log" class="list">
              ${state.chat.map(item => `<div class="list-item"><strong>${item.role}</strong><span>${item.text}</span></div>`).join("") || "<p>Try: What API keys are missing?</p>"}
            </div>
            <form id="chat-form" class="field" style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:16px;">
              <input name="message" placeholder="Ask ForgeOps..." />
              <button class="btn btn-primary">Send</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function refresh() {
  state.status = await api("/api/status");
  state.evidence = await api("/api/evidence");
  render();
}

async function startRun() {
  await api("/api/runs/start", {
    method: "POST",
    body: JSON.stringify({
      topic: "Why AI content factories are about to replace 100 person media teams",
      objective: "Create a governed viral short and platform export package.",
      budgetUsd: 120,
      risk: "standard",
    }),
  });
  setTimeout(refresh, 2000);
}

async function autopilotTick() {
  await api("/api/autopilot/tick", { method: "POST", body: "{}" });
  await refresh();
}

async function sendChat(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  state.chat.push({ role: "You", text: data.message });
  const reply = await api("/api/chat", { method: "POST", body: JSON.stringify({ message: data.message }) });
  state.chat.push({ role: "ForgeOps", text: reply.reply });
  render();
}

function wire() {
  document.querySelector("#refresh")?.addEventListener("click", refresh);
  document.querySelector("#start-run")?.addEventListener("click", startRun);
  document.querySelector("#autopilot")?.addEventListener("click", autopilotTick);
  document.querySelector("#show-keys")?.addEventListener("click", async () => {
    const reply = await api("/api/chat", { method: "POST", body: JSON.stringify({ message: "what api keys are missing" }) });
    state.chat.push({ role: "ForgeOps", text: reply.reply });
    render();
    location.hash = "#agent";
  });
  document.querySelector("#chat-form")?.addEventListener("submit", event => {
    event.preventDefault();
    sendChat(event.currentTarget);
  });
}

function render() {
  root.innerHTML = landing();
  wire();
}

render();
refresh().catch(error => {
  root.innerHTML = `<main class="login-wrap"><div class="form-card"><h1>ViralForge</h1><p>${error.message}</p></div></main>`;
});
