import { useEffect } from "react";
import { Zap } from "lucide-react";

export default function LoginPage() {
  useEffect(() => {
    // Redirect directly to server-side Google OAuth flow
    // This avoids needing VITE_GOOGLE_CLIENT_ID at build time
    window.location.href = "/api/auth/google/login";
  }, []);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "#0f1117" }}>
      <div className="flex items-center gap-3 mb-6">
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#1d6ff4"/>
          <path d="M16 6L26 24H6L16 6Z" fill="white" opacity="0.95"/>
          <path d="M16 12L21 22H11L16 12Z" fill="#1d6ff4"/>
        </svg>
        <span style={{ fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.02em" }}>
          <span style={{ color: "#ffffff" }}>Apex</span>
          <span style={{ color: "#60a5fa" }}>AI</span>
        </span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
        Redirecting to Google sign-in...
      </p>
    </div>
  );
}
