import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Globe, Building2, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" }, { code: "de", name: "German (Deutsch)" },
  { code: "pt", name: "Portuguese (Português)" }, { code: "it", name: "Italian (Italiano)" },
  { code: "nl", name: "Dutch (Nederlands)" }, { code: "pl", name: "Polish (Polski)" },
  { code: "ru", name: "Russian (Русский)" }, { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" }, { code: "ko", name: "Korean (한국어)" },
];

export default function Settings() {
  const { data: user } = trpc.settings.get.useQuery();
  const { data: voiceProfiles } = trpc.settings.voiceProfiles.useQuery();
  const utils = trpc.useUtils();

  const [transferNumber, setTransferNumber] = useState((user as any)?.transferNumber || "");
  const [language, setLanguage] = useState((user as any)?.language || "en");
  const [agencyName, setAgencyName] = useState((user as any)?.agencyName || "");
  const [voiceProfileId, setVoiceProfileId] = useState((user as any)?.voiceProfileId || "cartesia-sarah-sales");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setTransferNumber((user as any)?.transferNumber || "");
    setLanguage((user as any)?.language || "en");
    setAgencyName((user as any)?.agencyName || "");
    setVoiceProfileId((user as any)?.voiceProfileId || "cartesia-sarah-sales");
  }, [user]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Settings saved successfully");
      setSaving(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setSaving(false);
    },
  });

  const handleSave = () => {
    setSaving(true);
    updateMutation.mutate({
      transferNumber: transferNumber || undefined,
      language: language as any,
      agencyName: agencyName || undefined,
      voiceProfileId,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your AI assistant behavior</p>
      </div>

      {/* Live Transfer Number */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Live Transfer Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            When a caller asks to speak with a human, the AI will say "Let me transfer you now" and route the call to this number. Leave blank to disable live transfers.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Your transfer phone number</Label>
            <Input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={transferNumber}
              onChange={e => setTransferNumber(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["Your cell phone", "Sales manager line", "Team hotline"].map(hint => (
              <span key={hint} className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {hint}
              </span>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> When the AI detects "can I speak to someone" or caller frustration (3 failed attempts), it announces the transfer and routes via SignalWire warm transfer.
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            AI Conversation Language
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The AI will conduct all conversations in this language. Your AI phone number will answer calls in the selected language.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Select language</Label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGES.slice(0, 6).map(lang => (
              <button key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${language === lang.code ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {lang.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Voice Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose the default telephony voice for your live AI calls. Campaign-level overrides can use a different profile later.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Default voice</Label>
            <select
              value={voiceProfileId}
              onChange={e => setVoiceProfileId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border"
            >
              {(voiceProfiles ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label} · {profile.provider} · {profile.useCase}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Agency Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Agency Settings
            <Badge variant="outline" className="text-xs ml-auto">Coming Soon</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Running an agency? Set your agency name to appear on client-facing dashboards. White label and sub-account features launching soon.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Agency name</Label>
            <Input
              placeholder="Your Agency LLC"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: "Name", value: user?.name || "—" },
              { label: "Email", value: user?.email || "—" },
              { label: "Plan", value: (user as any)?.plan || "Trial" },
              { label: "Role", value: user?.role || "user" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium capitalize">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto" style={{ backgroundColor: "#1d6ff4" }}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
