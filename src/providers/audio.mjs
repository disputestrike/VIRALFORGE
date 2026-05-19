import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.mjs";
import { runFfmpeg } from "../runtime/ffmpeg.mjs";

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
  await runFfmpeg([
    "-y",
    "-f", "lavfi",
    "-i", "sine=frequency=620:duration=8",
    "-ar", "44100",
    "-ac", "1",
    output,
  ]);
  return storage.putBuffer(`runs/${runId}/voice.wav`, await fs.readFile(output), "audio/wav");
}
