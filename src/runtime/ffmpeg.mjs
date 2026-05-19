import { spawn } from "node:child_process";
import staticFfmpegPath from "ffmpeg-static";

const candidatePaths = [
  process.env.FFMPEG_PATH,
  "ffmpeg",
  staticFfmpegPath,
].filter(Boolean);

const capabilityCache = new Map();

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", data => { stdout += data.toString(); });
    child.stderr?.on("data", data => { stderr += data.toString(); });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Command failed: ${cmd}`));
    });
  });
}

async function inspectFfmpeg(cmd) {
  if (capabilityCache.has(cmd)) return capabilityCache.get(cmd);
  const probe = (async () => {
    try {
      const version = await runCommand(cmd, ["-hide_banner", "-version"]);
      const filters = await runCommand(cmd, ["-hide_banner", "-filters"]);
      const filterText = `${filters.stdout}\n${filters.stderr}`;
      return {
        cmd,
        available: true,
        version: `${version.stdout}\n${version.stderr}`,
        drawtext: /\bdrawtext\b/.test(filterText),
        drawbox: /\bdrawbox\b/.test(filterText),
      };
    } catch (error) {
      return { cmd, available: false, drawtext: false, drawbox: false, error: error.message };
    }
  })();
  capabilityCache.set(cmd, probe);
  return probe;
}

export async function selectFfmpeg({ requireDrawtext = false } = {}) {
  const inspected = [];
  for (const cmd of candidatePaths) {
    const details = await inspectFfmpeg(cmd);
    inspected.push(details);
    if (!details.available) continue;
    if (requireDrawtext && !details.drawtext) continue;
    return details.cmd;
  }
  const summary = inspected
    .map(item => `${item.cmd}: ${item.available ? `available drawtext=${item.drawtext}` : `unavailable ${item.error || ""}`}`)
    .join("; ");
  throw new Error(requireDrawtext
    ? `No FFmpeg binary with drawtext support is available. Checked: ${summary}`
    : `No FFmpeg binary is available. Checked: ${summary}`);
}

export async function runFfmpeg(args, options = {}) {
  const cmd = await selectFfmpeg(options);
  const result = await runCommand(cmd, args);
  return result.stderr || result.stdout;
}
