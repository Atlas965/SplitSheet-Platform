import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Minimize2, RotateCcw, Mic2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "How do I create a split sheet?",
  "What is a PRO / IPI number?",
  "How do confirmation links work?",
  "What contract types are available?",
  "How do I archive a song asset?",
];

export default function CoPilot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm the **SoundLedger Co-Pilot** — your built-in guide for the SplitSheet platform. I can explain the workflow, help with music rights questions, or walk you through any feature. What can I help you with?",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  const chat = useMutation({
    mutationFn: (userMessage: string) =>
      apiRequest("POST", "/api/copilot", {
        messages: [...messages, { role: "user", content: userMessage }],
      }),
    onSuccess: (data: any) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I ran into an issue. Please try again in a moment.",
        },
      ]);
    },
  });

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    chat.mutate(msg);
  };

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm the **SoundLedger Co-Pilot**. What can I help you with today?",
      },
    ]);
  };

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          data-testid="button-open-copilot"
          aria-label="Open SoundLedger Co-Pilot"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-5 right-5 z-50 w-[360px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-200 ${
            minimized ? "h-[56px]" : "h-[520px]"
          }`}
          data-testid="copilot-window"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border rounded-t-2xl bg-primary text-primary-foreground shrink-0">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Mic2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">SoundLedger Co-Pilot</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <p className="text-[10px] text-primary-foreground/70">AI Assistant · Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Reset conversation"
                data-testid="button-copilot-reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMinimized((v) => !v)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-copilot-minimize"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-copilot-close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] text-sm px-3 py-2 rounded-2xl leading-relaxed ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                      data-testid={`copilot-message-${i}`}
                    >
                      {formatMessage(m.content)}
                    </div>
                  </div>
                ))}

                {chat.isPending && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick prompts — only show initially */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-[11px] bg-muted hover:bg-muted/70 text-foreground px-2.5 py-1 rounded-full border border-border transition-colors"
                      data-testid={`copilot-quick-${p.slice(0, 10)}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-4 pb-4 pt-2 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Ask Co-Pilot anything…"
                    disabled={chat.isPending}
                    className="flex-1 text-sm rounded-xl border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    data-testid="input-copilot-message"
                  />
                  <Button
                    size="icon"
                    onClick={() => send()}
                    disabled={!input.trim() || chat.isPending}
                    className="rounded-xl shrink-0"
                    data-testid="button-copilot-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  SoundLedger Co-Pilot · Powered by AI
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function formatMessage(content: string) {
  // Basic markdown-lite: bold (**text**), newlines
  const parts = content.split(/(\*\*[^*]+\*\*|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part === "\n") return <br key={i} />;
    return part;
  });
}
