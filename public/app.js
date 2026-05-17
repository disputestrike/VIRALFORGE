const root = document.querySelector("#app");

const icons = {
  spark: "✦",
  engine: "◎",
  shield: "✓",
  film: "▣",
  chart: "▥",
};

const defaultPlatforms = ["YouTube", "TikTok", "Instagram", "X", "LinkedIn", "Pinterest", "Reddit", "Telegram"];

function navigate(path) {
  window.history.pushState({}, "", path);
  render();
}

function session() {
  try {
    return JSON.parse(localStorage.getItem("viralforge_session") || "null");
  } catch {
    return null;
  }
}

function setSession(value) {
  localStorage.setItem("viralforge_session", JSON.stringify(value));
}

function clearSession() {
  localStorage.removeItem("viralforge_session");
}

function brand() {
  return `
    <a class="brand" href="/" data-link>
      <span class="mark">${icons.spark}</span>
      <span>ViralForge<small>Media OS</small></span>
    </a>
  `;
}

function nav() {
  return `
    <nav class="nav">
      <div class="nav-inner">
        ${brand()}
        <div class="nav-links">
          <a href="/#engine" data-link>Engine</a>
          <a href="/#network" data-link>Network</a>
          <a href="/#saas" data-link>SaaS</a>
        </div>
        <div class="nav-actions">
          <a class="btn btn-secondary" href="/login" data-link>Sign in</a>
          <a class="btn btn-primary" href="/app" data-link>Open app</a>
        </div>
      </div>
    </nav>
  `;
}

function landing() {
  const flow = ["Discover demand", "Generate brief", "Write script", "Plan visuals", "QA and compliance", "Package channels", "Measure outcomes"];
  const tiles = [
    ["◎", "One Engine", "Trend discovery, scriptwriting, visual planning, QA, packaging, and learning run as one controlled production system."],
    ["✓", "PolicyOS", "Rights, factual risk, platform rules, brand fit, cost, and quota checks are enforced before distribution."],
    ["▣", "Documentary Engine", "Long-form chapters, narration, source plans, shot lists, and render packages are created as one cohesive production."],
    ["▥", "SignalLoop", "Views, comments, cost, completion, and conversion data feed the next run so the network gets sharper."],
  ];

  return `
    <div class="shell">
      ${nav()}
      <main class="container hero">
        <section>
          <div class="eyebrow">${icons.spark} Standalone AI media OS</div>
          <h1>ViralForge <span class="gradient-text">builds the network.</span></h1>
          <p>
            A clean product for turning one idea into channel-ready content, documentary plans,
            compliance evidence, and learning loops across the whole media network.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/login" data-link>Sign in to ViralForge</a>
            <a class="btn btn-secondary" href="/app" data-link>Open local app preview</a>
          </div>
          <div class="proof-row">
            <div class="proof"><strong>1</strong><span>operating engine</span></div>
            <div class="proof"><strong>8</strong><span>launch channels</span></div>
            <div class="proof"><strong>12</strong><span>QA gates</span></div>
            <div class="proof"><strong>60m</strong><span>documentary path</span></div>
          </div>
        </section>

        <aside class="preview-card">
          <div class="preview-top">
            <div>
              <strong>Network Launch Run</strong>
              <div style="color: var(--muted); font-size: 13px; margin-top: 4px;">Website, app, engine, QA, SaaS path</div>
            </div>
            <span class="badge">Standalone</span>
          </div>
          <div class="steps">
            ${flow.map((step, index) => `
              <div class="step">
                <span class="num">${index + 1}</span>
                <strong>${step}</strong>
                <span class="status">Ready</span>
              </div>
            `).join("")}
          </div>
          <div class="preview-bottom">
            <div class="metric"><strong>0</strong><span>legacy routes</span></div>
            <div class="metric"><strong>100%</strong><span>ViralForge surface</span></div>
            <div class="metric"><strong>PayPal</strong><span>billing path</span></div>
          </div>
        </aside>
      </main>

      <section id="engine">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">The product</div>
              <h2>Website first. Login second. Engine console third.</h2>
            </div>
            <p>This is the product boundary: a public ViralForge website, a ViralForge login, and a ViralForge app console.</p>
          </div>
          <div class="grid-4">
            ${tiles.map(([icon, title, text]) => `
              <article class="tile">
                <span class="tile-icon">${icon}</span>
                <h3>${title}</h3>
                <p>${text}</p>
              </article>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="network" class="dark">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">Distribution</div>
              <h2>Built for a full media network.</h2>
            </div>
            <p>External posting is connector-gated until credentials, platform review, and policy approval are complete.</p>
          </div>
          <div class="grid-4">
            ${defaultPlatforms.map(platform => `
              <article class="tile">
                <span class="tile-icon">↗</span>
                <h3>${platform}</h3>
                <p>Package-ready connector path with quota, policy, caption, and asset checks.</p>
              </article>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="saas">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="eyebrow">SaaS path</div>
              <h2>PayPal-ready and tenant-ready by design.</h2>
            </div>
            <p>ViralForge starts as our internal media machine, then becomes a subscription product with tenants, usage ledgers, credits, roles, and billing gates.</p>
          </div>
          <a class="btn btn-primary" href="/login" data-link>Sign in and test the app</a>
        </div>
      </section>
    </div>
  `;
}

function login() {
  const current = session();
  return `
    <main class="login-wrap">
      <form class="form-card" id="login-form">
        ${brand()}
        <h1>Sign in to <span class="gradient-text">ViralForge.</span></h1>
        <p style="color: var(--muted); line-height: 1.7;">
          This local demo creates a browser session so you can test the ViralForge app now.
          Production auth will use real identity, roles, tenant isolation, and billing status.
        </p>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" value="${current?.email || "founder@viralforge.local"}" required />
        </div>
        <div class="field">
          <label for="role">Role</label>
          <select id="role" name="role">
            <option>Founder</option>
            <option>Producer</option>
            <option>Compliance Lead</option>
            <option>Growth Operator</option>
          </select>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 22px;" type="submit">Continue to ViralForge</button>
        <a class="btn btn-secondary" style="width: 100%; margin-top: 10px;" href="/" data-link>Back to website</a>
      </form>
    </main>
  `;
}

function appShell() {
  const user = session();
  return `
    <div class="app-shell">
      <aside class="sidebar">
        ${brand()}
        <div class="side-links">
          <a class="side-link active" href="/app" data-link>Engine Console</a>
          <a class="side-link" href="/" data-link>Website</a>
          <a class="side-link" href="/login" data-link>Login</a>
        </div>
        <div class="alert" style="margin-top: 26px;">
          ${user ? `Signed in locally as ${user.email}.` : "Local preview mode. Sign in route is available at /login."}
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div>
            <div class="eyebrow">ViralForge app</div>
            <h1 style="font-size: clamp(38px, 5vw, 64px); margin-top: 12px;">Engine Console</h1>
          </div>
          <div class="nav-actions">
            <button class="btn btn-secondary" id="logout">Reset session</button>
            <a class="btn btn-primary" href="/" data-link>View website</a>
          </div>
        </div>
        <div class="console-grid">
          <section class="panel" style="padding: 18px; border-top: 0;">
            <h2>Run the engine</h2>
            <p>Enter a topic and ViralForge will produce the governed launch package.</p>
            <form id="run-form">
              <div class="field">
                <label>Topic</label>
                <textarea name="topic">Launch a global AI documentary and shorts network</textarea>
              </div>
              <div class="field">
                <label>Objective</label>
                <input name="objective" value="Build audience, trust, monetizable distribution, and SaaS readiness" />
              </div>
              <div class="field">
                <label>Length minutes</label>
                <input name="lengthMinutes" type="number" min="1" max="60" value="30" />
              </div>
              <div class="field">
                <label>Budget USD</label>
                <input name="budgetUsd" type="number" min="0" value="120" />
              </div>
              <div class="field">
                <label>Risk mode</label>
                <select name="risk">
                  <option value="standard">Standard</option>
                  <option value="strict">Strict review</option>
                  <option value="aggressive">Aggressive growth</option>
                </select>
              </div>
              <button class="btn btn-primary" type="submit" style="width: 100%; margin-top: 18px;">Run ViralForge Engine</button>
            </form>
          </section>
          <section class="panel" style="padding: 18px; border-top: 0;">
            <div id="result"></div>
          </section>
        </div>
      </main>
    </div>
  `;
}

function renderResult(run) {
  return `
    <div class="section-head" style="display: block; margin-bottom: 18px;">
      <div class="eyebrow">Decision</div>
      <h2 style="font-size: 34px; margin-top: 10px;">${run.decision}</h2>
      <p>${run.brief.promise}</p>
    </div>
    <div class="result-grid">
      <div class="tile"><h3>$${run.finance.estimatedCost}</h3><p>Estimated run cost</p></div>
      <div class="tile"><h3>${run.packages.length}</h3><p>Platform packages</p></div>
      <div class="tile"><h3>${run.qa.filter(gate => gate.status === "pass").length}/${run.qa.length}</h3><p>QA gates passed</p></div>
    </div>
    <div class="panel" style="margin-top: 14px;">
      <h3>Modules</h3>
      <div class="list">
        ${run.modules.map(module => `
          <div class="list-item">
            <strong>${module.name}</strong>
            <span class="pill">${module.status} · ${module.score}</span>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="panel" style="margin-top: 14px;">
      <h3>Platform packages</h3>
      <div class="list">
        ${run.packages.map(pkg => `
          <div class="list-item">
            <strong>${pkg.platform}</strong>
            <span class="pill">${pkg.assets.length} assets</span>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="panel" style="margin-top: 14px;">
      <h3>PolicyOS</h3>
      <p>Mode: <strong>${run.policy.mode}</strong></p>
      <div class="list">
        ${run.policy.events.map(event => `<div class="list-item"><span>${event}</span><span class="pill">logged</span></div>`).join("")}
      </div>
    </div>
  `;
}

async function runEngine(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.lengthMinutes = Number(data.lengthMinutes);
  data.budgetUsd = Number(data.budgetUsd);
  data.platforms = defaultPlatforms;

  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function wire() {
  document.querySelectorAll("[data-link]").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      event.preventDefault();
      navigate(href);
    });
  });

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(loginForm).entries());
      setSession({ email: data.email, role: data.role, signedInAt: new Date().toISOString() });
      navigate("/app");
    });
  }

  const logout = document.querySelector("#logout");
  if (logout) {
    logout.addEventListener("click", () => {
      clearSession();
      navigate("/login");
    });
  }

  const runForm = document.querySelector("#run-form");
  const result = document.querySelector("#result");
  if (runForm && result) {
    const firstRun = await runEngine(runForm);
    result.innerHTML = renderResult(firstRun);
    runForm.addEventListener("submit", async event => {
      event.preventDefault();
      result.innerHTML = `<div class="panel"><h3>Running...</h3><p>ViralForge is building the governed package.</p></div>`;
      result.innerHTML = renderResult(await runEngine(runForm));
    });
  }
}

function render() {
  const path = window.location.pathname;
  if (path === "/login") {
    root.innerHTML = login();
  } else if (path === "/app" || path === "/console") {
    root.innerHTML = appShell();
  } else {
    root.innerHTML = landing();
  }
  wire();
}

window.addEventListener("popstate", render);
render();
