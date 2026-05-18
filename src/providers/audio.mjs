import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { config } from "../config.mjs";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", data => { stderr += data.toString(); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(stderr || `Command failed: ${cmd}`)));
  });
}

export async function generateVoiceAsset({ storage, runId, text }) {
  if (config.providers.deepgramApiKey) {
    const response = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Token ${config.providers.deepgramApiKey}`,
      },
      body: JSON.stringify({ text }),
    });
    if (response.ok) {
      const audio = Buffer.from(await response.arrayBuffer());
      return storage.putBuffer(`runs/${runId}/voice.mp3`, audio, "audio/mpeg");
    }
  }

  const scratch = path.join(config.app.dataDir, "scratch", runId);
  await fs.mkdir(scratch, { recursive: true });
  const output = path.join(scratch, "voice.wav");
  await run(ffmpegPath, [
    "-y",
    "-f", "lavfi",
    "-i", "sine=frequency=620:duration=8",
    "-ar", "44100",
    "-ac", "1",
    output,
  ]);
  return storage.putBuffer(`runs/${runId}/voice.wav`, await fs.readFile(output), "audio/wav");
}
