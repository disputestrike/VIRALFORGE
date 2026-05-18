import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { config } from "../config.mjs";

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", data => { stderr += data.toString(); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stderr) : reject(new Error(stderr)));
  });
}

export async function renderTemplateVideo({ storage, runId, title, durationSeconds = 8 }) {
  const scratch = path.join(config.app.dataDir, "scratch", runId);
  await fs.mkdir(scratch, { recursive: true });
  const output = path.join(scratch, "viralforge.mp4");

  await runFfmpeg([
    "-y",
    "-f", "lavfi",
    "-i", `color=c=0x10111f:s=720x1280:d=${durationSeconds}`,
    "-f", "lavfi",
    "-i", `sine=frequency=420:duration=${durationSeconds}`,
    "-filter_complex",
    "drawbox=x=0:y=0:w=720:h=1280:color=0x9b0ae8@0.45:t=fill,drawbox=x=0:y=820:w=720:h=460:color=0xed3782@0.35:t=fill,drawtext=text='ViralForge':fontcolor=white:fontsize=58:x=70:y=170,drawtext=text='AI Media Engine':fontcolor=white:fontsize=34:x=70:y=245",
    "-shortest",
    "-pix_fmt", "yuv420p",
    "-c:v", "libx264",
    "-c:a", "aac",
    "-movflags", "+faststart",
    output,
  ]);

  const stored = await storage.putBuffer(`runs/${runId}/video.mp4`, await fs.readFile(output), "video/mp4");
  return {
    ...stored,
    title,
    durationSeconds,
    renderPath: "ffmpeg_template",
    aspectRatio: "9:16",
  };
}
