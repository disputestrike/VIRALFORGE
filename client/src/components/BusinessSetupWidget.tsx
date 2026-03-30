/**
 * BusinessSetupWidget — Smart Campaign Setup
 * User pastes URL or uploads PDF → AI extracts business info → auto-fills campaign form
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Globe, Upload, FileText, Loader2, CheckCircle2, Sparkles,
  Building2, MapPin, Zap, ChevronDown, ChevronUp, X
} from "lucide-react";

interface ExtractedBusiness {
  businessName: string;
  industry: string;
  serviceAreas: string[];
  services: string[];
  valueProposition: string;
  targetCustomer: string;
  phoneNumber?: string;
  email?: string;
  campaignScript?: string;
  campaignName?: string;
  tone: string;
}

interface Props {
  onExtracted: (data: ExtractedBusiness) => void;
  onClose?: () => void;
}

type Mode = "choose" | "url" | "upload" | "paste" | "result";

export default function BusinessSetupWidget({ onExtracted, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractedBusiness | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const urlMutation = trpc.extractor.fromUrl.useMutation({
    onSuccess: (data) => { setResult(data); setMode("result"); setLoading(false); },
    onError: (e) => { setError(e.message); setLoading(false); },
  });

  const textMutation = trpc.extractor.fromText.useMutation({
    onSuccess: (data) => { setResult(data); setMode("result"); setLoading(false); },
    onError: (e) => { setError(e.message); setLoading(false); },
  });

  const handleUrl = () => {
    if (!url.trim()) { setError("Please enter a website URL"); return; }
    setError(""); setLoading(true);
    urlMutation.mutate({ url: url.trim() });
  };

  const handleText = () => {
    if (text.trim().length < 20) { setError("Please paste more text (at least 20 characters)"); return; }
    setError(""); setLoading(true);
    textMutation.mutate({ text: text.trim() });
  };

  const handleFile = async (file: File) => {
    setError(""); setLoading(true);
    const formData = new FormData();
    formData.append("document", file);
    try {
      const resp = await fetch("/api/extract/document", { method: "POST", body: formData });
      const json = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.error || "Extraction failed");
      setResult(json.data);
      setMode("result");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseInfo = () => {
    if (result) onExtracted(result);
  };

  const INDUSTRY_COLORS: Record<string, string> = {
    solar: "#fbbf24", hvac: "#60a5fa", roofing: "#a78bfa",
    insurance: "#fb923c", realestate: "#34d399", general: "#94a3b8",
  };
  const industryColor = result ? (INDUSTRY_COLORS[result.industry] || "#94a3b8") : "#1d6ff4";

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#141820", borderColor: "rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(29,111,244,0.2)" }}>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">AI Business Setup</p>
            <p className="text-xs text-muted-foreground">Auto-fill your campaign from your website or document</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Mode: Choose */}
        {mode === "choose" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              How do you want to provide your business info?
            </p>
            {[
              { id: "url" as Mode, icon: Globe, label: "Paste your website URL", sub: "We crawl it and extract your business info automatically", color: "#1d6ff4" },
              { id: "upload" as Mode, icon: Upload, label: "Upload a document", sub: "PDF, Word doc, or text file — we read it and extract info", color: "#34d399" },
              { id: "paste" as Mode, icon: FileText, label: "Paste text directly", sub: "Copy/paste from anywhere — your bio, services list, description", color: "#c084fc" },
            ].map(({ id, icon: Icon, label, sub, color }) => (
              <button key={id} onClick={() => setMode(id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all border hover:border-opacity-60"
                style={{ backgroundColor: "#1a1e2a", borderColor: `${color}25` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}60`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = `${color}25`)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mode: URL */}
        {mode === "url" && (
          <div className="space-y-4">
            <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1">
              ← Back
            </button>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Your business website</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://yourbusiness.com"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUrl()}
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm"
                  style={{ backgroundColor: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", outline: "none", fontSize: "16px" }}
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Works best with your homepage or "About" / "Services" page
              </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button onClick={handleUrl} disabled={loading} className="w-full" style={{ backgroundColor: "#1d6ff4" }}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Crawling website...</> : <><Zap className="w-4 h-4 mr-2" />Extract Business Info</>}
            </Button>
          </div>
        )}

        {/* Mode: Upload */}
        {mode === "upload" && (
          <div className="space-y-4">
            <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-white">← Back</button>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div
              onClick={() => !loading && fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
              style={{ borderColor: loading ? "#1d6ff4" : "rgba(255,255,255,0.15)" }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#1d6ff4"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}>
              {loading ? (
                <><Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin" style={{ color: "#1d6ff4" }} />
                <p className="text-sm text-white font-medium">Reading your document...</p></>
              ) : (
                <><Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-white font-medium mb-1">Drop your file here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, Word, or text file · Max 10MB</p></>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* Mode: Paste text */}
        {mode === "paste" && (
          <div className="space-y-4">
            <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-white">← Back</button>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Paste any business text</label>
              <textarea
                rows={6}
                placeholder="Paste your business description, services list, about page, pitch deck content..."
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white text-sm resize-none"
                style={{ backgroundColor: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", outline: "none", fontSize: "16px" }}
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">{text.length} characters</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button onClick={handleText} disabled={loading || text.length < 20} className="w-full" style={{ backgroundColor: "#1d6ff4" }}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" />Extract Business Info</>}
            </Button>
          </div>
        )}

        {/* Mode: Result */}
        {mode === "result" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: "#34d399" }} />
              <p className="font-bold text-white">Business info extracted!</p>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: "#1a1e2a", border: `1px solid ${industryColor}25` }}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-white text-lg">{result.businessName}</p>
                <span className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                  style={{ backgroundColor: `${industryColor}20`, color: industryColor }}>
                  {result.industry}
                </span>
              </div>

              {result.valueProposition && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{result.valueProposition}</p>
              )}

              {result.campaignScript && (
                <div className="p-3 rounded-lg text-sm italic" style={{ backgroundColor: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.7)" }}>
                  "{result.campaignScript}"
                </div>
              )}

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? "Hide" : "Show"} extracted details
              </button>

              {showDetails && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {result.serviceAreas.length > 0 && (
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{result.serviceAreas.join(", ")}</span>
                    </div>
                  )}
                  {result.services.length > 0 && (
                    <div className="flex items-start gap-2 text-xs">
                      <Building2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{result.services.slice(0, 5).join(" · ")}</span>
                    </div>
                  )}
                  {result.phoneNumber && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>📞 {result.phoneNumber}</p>
                  )}
                  {result.email && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>✉️ {result.email}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUseInfo} className="flex-1" style={{ backgroundColor: "#1d6ff4" }}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Use This Info — Auto-Fill Campaign
              </Button>
              <Button variant="outline" onClick={() => { setMode("choose"); setResult(null); setUrl(""); setText(""); }}
                className="text-white border-white/20">
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
