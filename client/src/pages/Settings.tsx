import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Globe, Building2, Mic, CheckCircle2, Save, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" }, { code: "de", name: "German (Deutsch)" },
  { code: "pt", name: "Portuguese (Português)" }, { code: "it", name: "Italian (Italiano)" },
  { code: "nl", name: "Dutch (Nederlands)" }, { code: "pl", name: "Polish (Polski)" },
  { code: "ru", name: "Russian (Русский)" }, { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" }, { code: "ko", name: "Korean (한국어)" },
];

const STYLE_COLORS: Record<string, string> = {
  warm: "#34d399", professional: "#60a5fa", neutral: "#94a3b8",
  confident: "#f59e0b", friendly: "#c084fc", authoritative: "#f87171",
  premium: "#fbbf24", direct: "#fb923c",
};

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: userSettings } = trpc.settings.get.useQuery();
  const { data: voiceProfiles } = trpc.settings.voiceProfiles.useQuery();

  const [transferNumber, setTransferNumber] = useState("");
  const [language, setLanguage] = useState("en");
  const [agencyName, setAgencyName] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("cartesia-sarah-sales");
  const [saving, setSaving] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setTransferNumber((userSettings as any).transferNumber || "");
      setLanguage((userSettings as any).language || "en");
      setAgencyName((userSettings as any).agencyName || "");
      setSelectedVoice((userSettings as any).voiceProfileId || "cartesia-sarah-sales");
    }
  }, [userSettings]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.get.invalidate(); toast.success("Settings saved"); setSaving(false); },
    onError: (e: any) => { toast.error(e.message); setSaving(false); },
  });

  const voiceMutation = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.get.invalidate(); toast.success('Voice saved'); setSavingVoice(false); },
    onError: (e: any) => { toast.error(e.message); setSavingVoice(false); },
  });

  const handleSave = () => {
    setSaving(true);
    updateMutation.mutate({
      transferNumber: transferNumber || undefined,
      language: language as any,
      agencyName: agencyName || undefined,
    });
  };

  const handleVoiceSave = () => {
    setSavingVoice(true);
    voiceMutation.mutate({ voiceProfileId: selectedVoice });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your AI assistant behavior</p>
      </div>

      {/* ── VOICE SELECTOR ──────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            AI Voice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose the voice your AI uses on every call. Cartesia voices are faster and better for live calls. ElevenLabs voices are higher quality but slightly slower.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(voiceProfiles || []).map((v: any) => {
              const isSelected = selectedVoice === v.id;
              const styleColor = STYLE_COLORS[v.style] || "#94a3b8";
              return (
                <button key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className="p-3 rounded-xl text-left transition-all border"
                  style={{
                    backgroundColor: isSelected ? "rgba(29,111,244,0.1)" : "hsl(var(--secondary))",
                    borderColor: isSelected ? "#1d6ff4" : "hsl(var(--border))",
                  }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm text-white">{v.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded capitalize"
                      style={{ backgroundColor: `${styleColor}20`, color: styleColor }}>
                      {v.style}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{v.presentation}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className={`text-xs font-medium ${v.provider === "cartesia" ? "text-green-400" : "text-yellow-400"}`}>
                      {v.provider === "cartesia" ? "⚡ Fast" : "✦ Premium"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleVoiceSave} disabled={savingVoice || selectedVoice === (userSettings as any)?.voiceProfileId}
              style={{ backgroundColor: "#1d6ff4" }} size="sm">
              {savingVoice ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Saving...</> : <><Save className="w-3 h-3 mr-1.5" />Save Voice</>}
            </Button>
            {selectedVoice === (userSettings as any)?.voiceProfileId && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" /> Currently active
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── TRANSFER NUMBER ──────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Live Transfer Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            When a caller asks to speak with a human, the AI says "Let me transfer you now" and routes the call here.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Your transfer phone number</Label>
            <Input type="tel" placeholder="+1 (555) 000-0000" value={transferNumber}
              onChange={e => setTransferNumber(e.target.value)}
              className="bg-secondary border-border" />
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank to disable live transfers. Triggered automatically when caller asks for a human or AI detects frustration.
          </p>
        </CardContent>
      </Card>

      {/* ── LANGUAGE ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Conversation Language
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The AI will conduct all conversations in this language.
          </p>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border">
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </CardContent>
      </Card>

      {/* ── AGENCY ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Agency Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Agency name</Label>
            <Input placeholder="Your Agency LLC" value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              className="bg-secondary border-border" />
          </div>
        </CardContent>
      </Card>

      {/* ── ACCOUNT INFO ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: "Name", value: (userSettings as any)?.name || "—" },
              { label: "Email", value: (userSettings as any)?.email || "—" },
              { label: "Plan", value: (userSettings as any)?.plan || "Trial" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium capitalize">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1d6ff4" }}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
