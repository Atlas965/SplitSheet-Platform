import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Send, Minimize2, Maximize2, Sparkles, RotateCcw, ChevronRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface QuickPrompt {
  label: string;
  prompt: string;
}

// ── Page-aware quick prompts ──────────────────────────────────────────────────
const PAGE_PROMPTS: Record<string, { headline: string; prompts: QuickPrompt[] }> = {
  "/": {
    headline: "Welcome to SplitSheet",
    prompts: [
      { label: "How do I start my first project?", prompt: "Walk me through creating my very first project on SplitSheet step by step." },
      { label: "What is a split sheet?",           prompt: "What is a split sheet and why does every music collaborator need one?" },
      { label: "How does confirmation work?",      prompt: "How do contributors confirm their splits without needing an account?" },
      { label: "What pricing plan fits me?",       prompt: "Explain the pricing tiers and which one is right for a new operator." },
    ],
  },
  "/clients": {
    headline: "Managing Clients",
    prompts: [
      { label: "How do I add a new client?",         prompt: "How do I add a new artist or producer as a client?" },
      { label: "What client types exist?",           prompt: "What are the different client types and when do I use each one?" },
      { label: "Can I link clients to projects?",   prompt: "How do I link a client to a specific project or song?" },
    ],
  },
  "/projects": {
    headline: "Managing Projects",
    prompts: [
      { label: "How do I set up ownership splits?",  prompt: "Walk me through setting up ownership percentages for a new project." },
      { label: "What is the 100% rule?",             prompt: "Why must ownership percentages always add up to exactly 100%?" },
      { label: "How do I send confirmation links?",  prompt: "How do I generate and send confirmation links to all contributors?" },
      { label: "What happens after all confirm?",    prompt: "What does SplitSheet do automatically when all contributors have confirmed?" },
    ],
  },
  "/contracts": {
    headline: "Music Agreements",
    prompts: [
      { label: "Split Sheet vs Producer Agreement",  prompt: "What is the difference between a Split Sheet and a Producer Agreement?" },
      { label: "How do I create a new agreement?",  prompt: "Walk me through creating a new music agreement from a template." },
      { label: "How does e-signing work?",           prompt: "How does the electronic signature process work for collaborators?" },
      { label: "When can I export a PDF?",           prompt: "When is the right time to export a PDF agreement?" },
    ],
  },
  "/ownership": {
    headline: "Rights Ledger",
    prompts: [
      { label: "What is the Rights Ledger?",         prompt: "What is the Rights Ledger and how is it different from a project?" },
      { label: "What is an ISWC code?",              prompt: "What is an ISWC code and how do I get one for my song?" },
      { label: "Archive vs Deactivate — difference?",prompt: "What is the difference between archiving and deactivating a song asset?" },
      { label: "How do I track revenue here?",       prompt: "How does SplitSheet track revenue and ownership history over time?" },
    ],
  },
  "/billing": {
    headline: "Billing & Plans",
    prompts: [
      { label: "What does Creator Pro include?",     prompt: "What features are included in the Creator Pro plan at $15/month?" },
      { label: "When should I upgrade?",             prompt: "At what point should I upgrade from the free tier to a paid plan?" },
      { label: "How does pay-per-session work?",     prompt: "Explain how the $25 Pay-Per-Session pricing works." },
      { label: "What is Enterprise pricing?",        prompt: "What does the Enterprise plan include and who is it designed for?" },
    ],
  },
  "/analytics": {
    headline: "Analytics",
    prompts: [
      { label: "What metrics should I track?",       prompt: "What are the most important metrics for a SplitSheet operator to monitor?" },
      { label: "How do I read confirmation rates?",  prompt: "How do I interpret my confirmation rate and improve it?" },
    ],
  },
};

const DEFAULT_PROMPTS = {
  headline: "How can I help?",
  prompts: [
    { label: "What does SplitSheet do?",          prompt: "Give me a one-paragraph overview of what SplitSheet does and who it's for." },
    { label: "Walk me through the full workflow",  prompt: "Walk me through the complete SplitSheet workflow from client intake to confirmed split." },
    { label: "SOCAN vs ASCAP — what's different?",prompt: "What is the difference between SOCAN and ASCAP and which one do I need?" },
    { label: "What is an IPI number?",            prompt: "What is an IPI/CAE number and where do I find mine?" },
  ],
};

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are SoundLedger CoPilot, the expert AI assistant embedded inside SplitSheet — a Canadian music agreement and rights management platform built by SoundLedger Technologies Inc.

Your role is to guide music industry operators (producers, studios, publishers) through the platform's features and answer music industry questions. You are professional, concise, warm, and deeply knowledgeable about:

PLATFORM KNOWLEDGE:
- The 4-stage operator workflow: Client Intake → Split Setup → Contributor Confirmation → Confirmed Record
- Music agreement types: Split Sheet, Producer Agreement, Performance Agreement, Management Agreement
- The Rights Ledger: song asset tracking, ISWC codes, ownership versioning, archival lifecycle
- Contributor confirmation: token-based public links, no account required, timestamped + IP-logged
- Pricing tiers: Free (1 project, 2 contributors), Pay-Per-Session ($25 CAD, 5 contributors), Multi-Creator ($50-75 CAD, 10 contributors), Express Add-On (+$25), Creator Pro ($15/month), Studio Pro ($49/month), Enterprise (custom)
- PRO affiliations: SOCAN (Canada), ASCAP, BMI, PRS, SESAC — and that SOCAN is the default for Canadian operators
- Canadian-specific context: SOCAN for performance/mechanical royalties, MROC/ARTISTI/ACTRA RACS for neighbouring rights
- IPI/CAE numbers: 9-digit identifiers assigned by PROs to identify rights holders
- ISWC codes: International Standard Musical Work Codes for registered compositions
- Composition vs. Master rights distinction — these are tracked separately in SplitSheet
- The 100% rule: all contributor ownership percentages must sum to exactly 100%
- PDF export via jsPDF: available at any stage of agreement lifecycle
- E-signatures: draw or type modes, with optional identity verification (KYC)
- CWR export: Common Works Registration format accepted by SOCAN, ASCAP, BMI, and 80+ PROs

MUSIC INDUSTRY KNOWLEDGE:
- PA copyright (composition) vs SR copyright (sound recording/master)
- Mechanical royalties, performance royalties, synchronization fees, artist royalties
- How PROs collect and distribute performance royalties (writer share + publisher share)
- What split sheets protect against: royalty freezes, disputed ownership claims
- The $2.5B global unmatched royalties problem caused by missing split documentation
- Standard industry roles: songwriter, producer, co-writer, featured artist, mixer, engineer
- The 50/50 writer/publisher split convention in PRO distributions

TONE AND BEHAVIOR:
- Answer in 2-5 sentences for simple questions; use numbered steps for processes
- Never give legal advice — always recommend consulting an entertainment lawyer for legal questions
- Always emphasize that SplitSheet is a workflow and documentation platform, not a law firm
- When explaining pricing, always quote in CAD
- If a user asks something outside your knowledge, say so clearly rather than guessing
- Be encouraging — many users are independent artists managing this for the first time
- Use plain language over industry jargon, but explain jargon when it appears

When the user shares which page they're on, tailor your guidance to that specific context.`;

// ── Utility ───────────────────────────────────────────────────────────────────
function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SoundLedgerCopilot() {
  const [location] = useLocation();
  const [open,       setOpen]       = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [hasGreeted, setHasGreeted] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Page-specific prompts
  const pageCtx = PAGE_PROMPTS[location] ?? DEFAULT_PROMPTS;

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Greeting on first open
  useEffect(() => {
    if (open && !hasGreeted) {
      setHasGreeted(true);
      const greeting: Message = {
        id:        generateId(),
        role:      "assistant",
        content:   `👋 Hey! I'm **SoundLedger CoPilot** — your AI guide for SplitSheet.\n\nI can walk you through the platform, explain music rights concepts, and help you get the most out of every feature. What would you like to know?`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [open, hasGreeted]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Send message
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError("");
    setInput("");
    setLoading(true);

    // Add user message
    const userMsg: Message = {
      id: generateId(), role: "user", content: trimmed, timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Placeholder streaming message
    const assistantId = generateId();
    setMessages(prev => [...prev, {
      id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true,
    }]);

    // Build conversation history for API
    const history = messages
      .filter(m => !m.isStreaming)
      .map(m => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: trimmed });

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/copilot", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages:    history,
          currentPage: location,
          pageContext: pageCtx.headline,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Server error ${res.status}`);
      }

      // Stream the response
      const reader  = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE: data: {...}
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta  = parsed?.choices?.[0]?.delta?.content ?? "";
              accumulated += delta;
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: accumulated, isStreaming: true }
                  : m
              ));
            } catch { /* skip malformed SSE line */ }
          }
        }
      }

      // Mark streaming complete
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));

    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(err?.message ?? "Something went wrong. Please try again.");
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setLoading(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, messages, location, pageCtx.headline]);

  // Handle quick prompt click
  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    send(prompt);
  };

  // Handle textarea key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Reset conversation
  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
    setInput("");
    setHasGreeted(false);
    setOpen(false);
    setTimeout(() => setOpen(true), 50);
  };

  // Width/height based on expanded state
  const panelW = expanded ? "w-[520px]" : "w-[360px]";
  const panelH = expanded ? "h-[680px]" : "h-[520px]";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating trigger button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open SoundLedger CoPilot"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-accent text-accent-foreground pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:opacity-95 transition-all duration-200 font-semibold text-sm group"
        >
          <div className="relative">
            <Sparkles className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-accent animate-pulse" />
          </div>
          CoPilot
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 ${panelW} ${panelH} bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200`}
          role="dialog"
          aria-label="SoundLedger CoPilot"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-accent text-accent-foreground shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-300 rounded-full" />
              </div>
              <div>
                <p className="font-bold text-sm leading-none">SoundLedger CoPilot</p>
                <p className="text-[10px] opacity-75 mt-0.5">Powered by Claude · Always learning</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                aria-label="Reset conversation"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Start new conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                aria-label={expanded ? "Compact view" : "Expand view"}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                {expanded
                  ? <Minimize2 className="h-3.5 w-3.5" />
                  : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close CoPilot"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {msg.content
                    ? msg.content
                        .replace(/\*\*(.*?)\*\*/g, "$1")  // strip bold markers for plain text
                        .trim()
                    : msg.isStreaming
                      ? <span className="flex gap-1 items-center py-0.5">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      : null}
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {msg.role === "assistant" ? "CoPilot · " : ""}{formatTime(msg.timestamp)}
                </span>
              </div>
            ))}

            {/* Quick prompts — show after greeting, before conversation starts */}
            {messages.length === 1 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                  {pageCtx.headline}
                </p>
                <div className="space-y-1.5">
                  {pageCtx.prompts.map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => handleQuickPrompt(qp.prompt)}
                      disabled={loading}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border hover:border-accent/40 transition-colors flex items-center justify-between gap-2 group"
                    >
                      <span className="text-foreground">{qp.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-accent transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl px-3 py-2.5">
                ⚠ {error}
                <button
                  className="underline ml-2 font-medium hover:opacity-80"
                  onClick={() => setError("")}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border px-3 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about split sheets, PROs, pricing…"
                rows={1}
                disabled={loading}
                aria-label="Message CoPilot"
                className="flex-1 resize-none bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors disabled:opacity-50 leading-relaxed max-h-28 overflow-y-auto"
                style={{ minHeight: "40px" }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 112) + "px";
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="shrink-0 w-9 h-9 bg-accent text-accent-foreground rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                  : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 leading-relaxed">
              Press <kbd className="font-mono bg-muted border border-border rounded px-1">Enter</kbd> to send · <kbd className="font-mono bg-muted border border-border rounded px-1">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}
