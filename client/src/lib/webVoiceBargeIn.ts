export type WebVoiceInterruptPayload = {
  type: "INTERRUPT";
  timestamp: number;
  reason: "web_vad";
  energy: number;
};

export type WebVoiceBargeInController = {
  start(): Promise<void>;
  stop(): void;
  setAiSpeaking(active: boolean): void;
};

export function createWebVoiceBargeInController(args: {
  ws: WebSocket;
  threshold?: number;
  analyzerFftSize?: number;
}): WebVoiceBargeInController {
  let active = false;
  let aiSpeaking = false;
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let raf = 0;
  const threshold = args.threshold ?? 0.045;
  const fftSize = args.analyzerFftSize ?? 1024;

  const tick = () => {
    if (!active || !aiSpeaking || !analyser) return;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let energy = 0;
    for (let i = 0; i < data.length; i++) {
      energy += data[i]! * data[i]!;
    }
    const rms = Math.sqrt(energy / Math.max(1, data.length));
    if (rms >= threshold && args.ws.readyState === WebSocket.OPEN) {
      const payload: WebVoiceInterruptPayload = {
        type: "INTERRUPT",
        timestamp: Date.now(),
        reason: "web_vad",
        energy: Number(rms.toFixed(4)),
      };
      args.ws.send(JSON.stringify(payload));
      aiSpeaking = false;
    }
    raf = window.requestAnimationFrame(tick);
  };

  return {
    async start() {
      if (active) return;
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      source.connect(analyser);
      active = true;
      raf = window.requestAnimationFrame(tick);
    },
    stop() {
      active = false;
      aiSpeaking = false;
      if (raf) window.cancelAnimationFrame(raf);
      mediaStream?.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      analyser?.disconnect();
      analyser = null;
      void audioContext?.close();
      audioContext = null;
    },
    setAiSpeaking(next) {
      aiSpeaking = next;
      if (active && !raf) {
        raf = window.requestAnimationFrame(tick);
      }
    },
  };
}
