/**
 * AI Agent — floating assistant available on every authenticated page
 * Context-aware; answers are produced server-side from live account data
 * Does NOT change any existing page UI — purely additive
 */

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Minimize2, Maximize2, Loader2, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PAGE_CONTEXT: Record<string, string> = {
  "/dashboard": "The user is on the Dashboard page, which shows overall stats: total leads, appointments set, active campaigns, and recent activity.",
  "/leads": "The user is on the Leads page. They can view, add, import, search, and manage leads. Each lead has a name, phone, email, score, segment, and status.",
  "/campaigns": "The user is on the Campaigns page. They can create campaigns, assign leads to campaigns, set channels (SMS, email, voice), and trigger bulk sends.",
  "/appointments": "The user is on the Appointments page. This shows all scheduled appointments from AI calls and manual bookings. They can confirm, mark show/no-show, and create appointments.",
  "/voice-ai": "The user is on the Voice AI page. They can generate call scripts by selecting industry, value propositions, and promo offers. They can also initiate AI calls to leads and view call recordings.",
  "/messages": "The user is on the Messages page. They can send individual messages or bulk send to campaign contacts via SMS or email.",
  "/templates": "The user is on the Templates page. They can create and manage message templates for SMS, email, and voice.",
  "/analytics": "The user is on the Analytics page, which shows campaign performance, response rates, conversion rates, and ROI metrics.",
  "/onboarding": "The user is on the Onboarding page, which walks through setting up their first campaign.",
};

const SUGGESTED_QUESTIONS = [
  "What's not working in my account?",
  "How many leads do I have?",
  "Why can't I make calls yet?",
  "How do I generate a script?",
  "Why isn’t my account fully set up yet?",
  "How do AI phone calls work?",
];

export default function AIAgent() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [location] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/trpc/voiceAI.agentChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          json: {
            messages: newMessages,
            pageContext: PAGE_CONTEXT[location] || `User is on ${location}`,
          },
        }),
      });

      const data = await response.json();
      const reply = data?.result?.data?.json?.reply ?? "I'm having trouble responding right now. Please try again.";

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
        style={{ backgroundColor: "#1d6ff4" }}
        title="AI Assistant"
      >
        <Bot className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-background" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all"
      style={{
        width: 380,
        height: minimized ? 56 : 520,
        backgroundColor: "#141820",
        border: "1px solid rgba(29,111,244,0.3)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: "#1d6ff4" }}>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <span className="font-bold text-white text-sm">ApexAI Assistant</span>
          <span className="w-2 h-2 rounded-full bg-green-300" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(v => !v)}
            className="p-1.5 rounded hover:bg-white/20 transition-colors text-white">
            {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setOpen(false)}
            className="p-1.5 rounded hover:bg-white/20 transition-colors text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl text-sm leading-relaxed"
                  style={{ backgroundColor: "rgba(29,111,244,0.12)", color: "rgba(255,255,255,0.8)" }}>
                  Hi! I'm your ApexAI assistant. I can help you with anything on this page, explain how features work, or diagnose issues. What do you need?
                </div>
                <p className="text-xs text-muted-foreground px-1">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === "user"
                      ? { backgroundColor: "#1d6ff4", color: "white" }
                      : { backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)" }
                    }>
                    {msg.content.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,3}\s/g, "")}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
                placeholder="Ask me anything..."
                className="flex-1 text-sm px-3 py-2 rounded-lg focus:outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg transition-colors disabled:opacity-40"
                style={{ backgroundColor: "#1d6ff4" }}>
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])}
                className="text-xs mt-2 text-muted-foreground hover:text-white transition-colors">
                Clear conversation
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
