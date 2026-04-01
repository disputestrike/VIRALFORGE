import { useEffect } from "react";
import ApexLogo from "@/components/branding/ApexLogo";

export default function LoginPage() {
  useEffect(() => {
    // Redirect directly to server-side Google OAuth flow
    // This avoids needing VITE_GOOGLE_CLIENT_ID at build time
    window.location.href = "/api/auth/google/login";
  }, []);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "#0f1117" }}>
      <div className="mb-6 flex items-center justify-center">
        <ApexLogo variant="full" size="lg" />
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
        Redirecting to Google sign-in...
      </p>
    </div>
  );
}
