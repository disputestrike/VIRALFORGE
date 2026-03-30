import { useState, useRef } from "react";
import { Play, Pause, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const D2 = "#141820";
const D3 = "#1a1e2a";
const BLUE = "#1d6ff4";
const BLUE_LIGHT = "#60a5fa";
const GREEN = "#34d399";
const DIM2 = "rgba(255,255,255,0.45)";
const DIM3 = "rgba(255,255,255,0.08)";

// Audio files — replace URLs with actual recordings
// Using SimpleTalk's demo audio as reference for structure (we'll record our own)
const DEMOS = [
  {
    id: "solar",
    label: "Solar",
    color: "#fbbf24",
    emoji: "☀️",
    tagline: "Qualifies homeowners for solar savings",
    description: "Our AI handles inbound solar inquiries — qualifies roof ownership, monthly bill, and books site surveys.",
    audioUrl: "https://chris-gordon-founder.github.io/websiteaudio/solar-audio.mp3",
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
    audioUrl: "https://chris-gordon-founder.github.io/websiteaudio/realstate-audio.mp3",
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
    audioUrl: "https://chris-gordon-founder.github.io/websiteaudio/realstate-audio.mp3",
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
    audioUrl: "https://chris-gordon-founder.github.io/websiteaudio/realstate-audio.mp3",
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
    audioUrl: "https://chris-gordon-founder.github.io/websiteaudio/health-insurance-audio.mp3",
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
    audioUrl: "https://chris-gordon-founder.github.io/websiteaudio/spanish-agent-demo.mp3",
    duration: "0:43",
    sampleScript: "¡Hola! Le llamo sobre su interés en paneles solares. ¿Es usted el propietario de su casa?",
  },
];

export default function IndustryDemos() {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const togglePlay = (id: string, url: string) => {
    if (playing === id) {
      audioRefs.current[id]?.pause();
      setPlaying(null);
    } else {
      // Stop any currently playing
      if (playing && audioRefs.current[playing]) {
        audioRefs.current[playing].pause();
        audioRefs.current[playing].currentTime = 0;
      }
      if (!audioRefs.current[id]) {
        const audio = new Audio(url);
        audio.onended = () => setPlaying(null);
        audioRefs.current[id] = audio;
      }
      audioRefs.current[id].play();
      setPlaying(id);
    }
  };

  return (
    <section id="demos" className="py-20 px-6" style={{ backgroundColor: D3 }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: `${BLUE}20`, border: `1px solid ${BLUE}40`, color: BLUE_LIGHT }}>
            🎧 Listen Before You Commit
          </div>
          <h2 className="text-4xl font-black text-white mb-4">
            Hear the AI in Action — by Industry
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: DIM2 }}>
            Real AI conversations across 6+ industries. Play a sample, then let it call you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEMOS.map((demo) => (
            <div key={demo.id} className="group p-5 rounded-2xl transition-all duration-200"
              style={{ backgroundColor: D2, border: `1px solid ${DIM3}` }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${demo.color}40`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = DIM3)}>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{demo.emoji}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{demo.label}</p>
                    <p className="text-xs" style={{ color: DIM2 }}>{demo.duration}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ backgroundColor: `${demo.color}20`, color: demo.color }}>
                  AI Demo
                </span>
              </div>

              <p className="text-xs mb-4 leading-relaxed" style={{ color: DIM2 }}>{demo.tagline}</p>

              {/* Sample script preview */}
              <div className="p-3 rounded-xl mb-4 text-xs italic" style={{ backgroundColor: `${demo.color}10`, color: DIM2 }}>
                "{demo.sampleScript}"
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => togglePlay(demo.id, demo.audioUrl)}
                  className="flex-1 h-9 text-xs font-semibold"
                  style={{
                    backgroundColor: playing === demo.id ? `${demo.color}30` : `${demo.color}20`,
                    border: `1px solid ${demo.color}40`,
                    color: demo.color,
                  }}>
                  {playing === demo.id
                    ? <><Pause className="w-3.5 h-3.5 mr-1.5" />Stop</>
                    : <><Play className="w-3.5 h-3.5 mr-1.5" />Play Sample</>
                  }
                </Button>
                <a href="#try-it">
                  <Button className="h-9 px-3 text-xs" style={{ backgroundColor: BLUE }}>
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm mb-4" style={{ color: DIM2 }}>
            Want the AI to call <em>you</em> in your industry right now?
          </p>
          <a href="#try-it">
            <Button size="lg" style={{ backgroundColor: BLUE }}>
              <Phone className="w-4 h-4 mr-2" />
              Get Called Now — Free Demo
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
