/**
 * One short US-style ring burst (440+480 Hz) as 8 kHz mono PCM16 WAV — for TwiML <Play> before AI stream.
 * Not silence; actual ring audio so callers hear “ring” then the agent.
 */

const SAMPLE_RATE = 8000;
/** ~2s on-tone (one classic ring burst), then optional tail — keep short so AI can answer quickly after */
const DURATION_SEC = 2;

export function getUsRingtoneWav(): Buffer {
  const numSamples = SAMPLE_RATE * DURATION_SEC;
  const pcm = Buffer.allocUnsafe(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Dual-tone multi-frequency — classic US ring sound
    const s =
      Math.sin(2 * Math.PI * 440 * t) * 0.22 +
      Math.sin(2 * Math.PI * 480 * t) * 0.22;
    const sample = Math.max(-32768, Math.min(32767, Math.floor(s * 28000)));
    pcm.writeInt16LE(sample, i * 2);
  }

  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}
