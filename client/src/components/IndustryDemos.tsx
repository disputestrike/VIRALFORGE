import { useState, useRef } from "react";
import { Play, Pause, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const D2 = "#000000";
const BLUE = "#1d6ff4";
const BLUE_LIGHT = "#60a5fa";
const GREEN = "#34d399";
const DIM2 = "rgba(255,255,255,0.55)";
const DIM3 = "rgba(255,255,255,0.22)";

function sampleUrl(fileBase: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}audio-samples/${fileBase}.mp3`;
}

/** Local files under `client/public/audio-samples/` (pulled from demo CDN) — reliable playback, no hotlink-only failures */
const DEMOS = [
  {
    id: "solar",
    label: "Solar",
    color: "#fbbf24",
    emoji: "☀️",
    tagline: "Qualifies homeowners for solar savings",
    description: "Our AI handles inbound solar inquiries — qualifies roof ownership, monthly bill, and books site surveys.",
    audioFile: "solar",
    duration: "0:43",
    sampleScript: "Hi! I'm calling about your interest in going solar. Do you own your home?",
  },
  {
    id: "hvac",
    label: "HVAC",
    color: "#60a5fa",
    emoji: "🌡️",
    tagline: "Books service calls and estimates",
    description: "Handles emergency HVAC calls, books technician visits, qualifies warranty status.",
    audioFile: "hvac",
    duration: "0:43",
    sampleScript: "Hi! I saw you reached out about your HVAC system. Is this an emergency or routine maintenance?",
  },
  {
    id: "roofing",
    label: "Roofing",
    color: "#a78bfa",
    emoji: "🏠",
    tagline: "Converts storm leads into estimates",
    description: "Handles post-storm outreach, qualifies insurance claims, books free inspections.",
    audioFile: "roofing",
    duration: "0:43",
    sampleScript: "Hi! I'm following up about storm damage in your area. Have you had your roof inspected recently?",
  },
  {
    id: "realestate",
    label: "Real Estate",
    color: "#34d399",
    emoji: "🏡",
    tagline: "Qualifies buyers and sellers instantly",
    description: "Handles buyer and seller inquiries, books showings, qualifies financing status.",
    audioFile: "realestate",
    duration: "0:43",
    sampleScript: "Hi! I'm calling about the property you were interested in. Are you pre-approved for financing?",
  },
  {
    id: "insurance",
    label: "Insurance",
    color: "#fb923c",
    emoji: "🛡️",
    tagline: "Books consultations and handles renewals",
    description: "Handles health, auto, and home insurance inquiries, books agent consultations.",
    audioFile: "insurance",
    duration: "0:43",
    sampleScript: "Hi! I'm calling about your insurance quote request. Are you currently covered or shopping for new coverage?",
  },
  {
    id: "spanish",
    label: "Spanish",
    color: "#f43f5e",
    emoji: "🇪🇸",
    tagline: "Full conversations en Español",
    description: "AI fluently handles sales conversations in Spanish — solar, roofing, HVAC and more.",
    audioFile: "spanish",
    duration: "0:43",
    sampleScript: "¡Hola! Le llamo sobre su interés en paneles solares. ¿Es usted el propietario de su casa?",
  },
];

export default function IndustryDemos() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const togglePlay = (id: string, fileBase: string) => {
    setPlaybackError(null);
    const url = sampleUrl(fileBase);

    if (playing === id) {
      audioRefs.current[id]?.pause();
      setPlaying(null);
      return;
    }

    if (playing && audioRefs.current[playing]) {
      audioRefs.current[playing].pause();
      audioRefs.current[playing].currentTime = 0;
    }

    let audio = audioRefs.current[id];
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audio.onended = () => setPlaying(null);
      audio.onerror = () => {
        setPlaybackError(`Could not load audio for ${id}. Check that /audio-samples/${fileBase}.mp3 exists.`);
        setPlaying(null);
      };
      audioRefs.current[id] = audio;
    }
    audio.src = url;

    void audio
      .play()
      .then(() => setPlaying(id))
      .catch((e: Error) => {
        setPlaybackError(e.message || "Playback blocked — tap play again.");
        setPlaying(null);
      });
  };

  return (
    <div id="demos" className="w-full">
      <div className="mx-auto w-full max-w-[1280px] px-2 sm:px-0">
        <div className="mb-12 text-center sm:mb-16">
          <div
            className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: `${BLUE}18`, border: `1px solid ${BLUE}35`, color: BLUE_LIGHT }}
          >
            Industry samples
          </div>
          <h2 className="mb-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Hear it by industry</h2>
          <p className="mx-auto max-w-3xl px-2 text-base leading-relaxed sm:text-lg" style={{ color: DIM2 }}>
            Short recordings from real-style flows. Served from our site so play works consistently — then get a live call to your phone.
          </p>
          {playbackError ? (
            <p className="mt-4 text-sm text-amber-300" role="alert">
              {playbackError}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 sm:gap-9 lg:grid-cols-3 lg:gap-11">
          {DEMOS.map((demo) => (
            <div
              key={demo.id}
              className="group flex min-h-0 flex-col rounded-2xl p-8 transition-all duration-200 sm:rounded-3xl sm:p-9 lg:p-10"
              style={{ backgroundColor: D2, border: `1px solid ${DIM3}` }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${demo.color}45`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = DIM3)}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 text-3xl leading-none">{demo.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-white">{demo.label}</p>
                    <p className="mt-0.5 text-sm" style={{ color: DIM2 }}>
                      {demo.duration}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: `${demo.color}18`, color: demo.color }}>
                  Sample
                </span>
              </div>

              <p className="mb-5 text-sm leading-relaxed" style={{ color: DIM2 }}>
                {demo.tagline}
              </p>

              <div className="mb-6 rounded-xl p-4 text-sm italic leading-relaxed sm:p-5" style={{ backgroundColor: `${demo.color}0d`, color: DIM2 }}>
                &ldquo;{demo.sampleScript}&rdquo;
              </div>

              <div className="mt-auto flex gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => togglePlay(demo.id, demo.audioFile)}
                  className="min-h-[44px] flex-1 text-sm font-semibold"
                  style={{
                    backgroundColor: playing === demo.id ? `${demo.color}30` : `${demo.color}20`,
                    border: `1px solid ${demo.color}40`,
                    color: demo.color,
                  }}
                >
                  {playing === demo.id ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Play sample
                    </>
                  )}
                </Button>
                <a href="#demo" className="shrink-0">
                  <Button type="button" className="min-h-[44px] min-w-[44px] px-0 text-sm" style={{ backgroundColor: BLUE }} aria-label="Request call">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 px-4 text-center">
          <p className="mb-5 text-base" style={{ color: DIM2 }}>
            Want a live call on your phone?
          </p>
          <a href="#demo">
            <Button size="lg" className="min-h-[52px] rounded-xl px-8 text-base font-bold" style={{ backgroundColor: BLUE }}>
              <Phone className="mr-2 h-5 w-5" />
              Free demo call
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
