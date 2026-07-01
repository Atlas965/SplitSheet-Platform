import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Bot, X, Send, Minimize2, RotateCcw, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const QUICK_PROMPTS = [
  "How do I create a split sheet project?",
  "What is a PRO / IPI number?",
  "How do confirmation links work?",
  "What's the difference between $29 Pay Per Project and Creator Pro?",
  "How do I add a client?",
  "What is ISWC vs ISRC?",
];

export default function CoPilot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm **SoundLedger Co-Pilot** — your built-in guide for the SplitSheet platform by SoundLedger Technologies Inc.\n\nI can help you:\n- Navigate any page or feature\n- Understand music rights (PROs, ISWC, splits)\n- Troubleshoot issues step by step\n- Answer pricing questions\n\nWhat can I help you with?",
    },
  ]);
  const [input, setInput] = useState("");
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) {
      inputRef.current?.focus();
    }
  }, [open, minimized]);

  const chat = useMutation({
    mutationFn: async (userMessage: string) => {
      const history = [...messages, { role: "user" as const, content: userMessage }];
      return apiRequest("POST", "/api/copilot", { messages: history });
    },
    onSuccess: (data: any) => {
      setRetryMsg(null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    },
    onError: (_err, userMessage) => {
      setRetryMsg(userMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I had trouble connecting. Please tap **Retry** or try again in a moment.",
          error: true,
        },
      ]);
    },
  });

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || chat.isPending) return;
    setRetryMsg(null);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    chat.mutate(msg);
  };

  const retry = () => {
    if (!retryMsg) return;
    // Remove last error message before retrying
    setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.error)));
    chat.mutate(retryMsg);
    setRetryMsg(null);
  };

  const reset = () => {
    setRetryMsg(null);
    setMessages([
      {
        role: "assistant",
        content:
          "Conversation reset. Hi again! I'm **SoundLedger Co-Pilot** — what can I help you with?",
      },
    ]);
  };

  const MAX_CHARS = 600;
  const charsLeft = MAX_CHARS - input.length;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          data-testid="button-open-copilot"
          aria-label="Open SoundLedger Co-Pilot"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-5 right-5 z-50 w-[380px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-200 ${
            minimized ? "h-[56px]" : "h-[540px]"
          }`}
          data-testid="copilot-window"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border rounded-t-2xl bg-primary text-primary-foreground shrink-0">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">SoundLedger Co-Pilot</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${chat.isPending ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
                <p className="text-[10px] text-primary-foreground/70">
                  {chat.isPending ? "Thinking…" : "AI Assistant · Online"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Reset conversation"
                data-testid="button-copilot-reset"
                aria-label="Reset conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMinimized((v) => !v)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-copilot-minimize"
                aria-label={minimized ? "Expand" : "Minimize"}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-copilot-close"
                aria-label="Close"
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
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 max-w-[82%]">
                      <div
                        className={`text-sm px-3 py-2.5 rounded-2xl leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : m.error
                            ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                        data-testid={`copilot-message-${i}`}
                      >
                        <FormattedMessage content={m.content} />
                      </div>
                      {m.error && retryMsg && (
                        <button
                          onClick={retry}
                          className="text-[11px] text-primary font-semibold self-start ml-1 hover:underline"
                          data-testid="button-copilot-retry"
                        >
                          ↺ Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {chat.isPending && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick prompts — only shown on fresh conversation */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      disabled={chat.isPending}
                      className="text-[11px] bg-muted hover:bg-accent/10 hover:border-accent/40 text-foreground px-2.5 py-1 rounded-full border border-border transition-colors disabled:opacity-50"
                      data-testid={`copilot-quick-${p.slice(0, 10).replace(/\s/g, "-")}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Ask Co-Pilot anything…"
                    disabled={chat.isPending}
                    className="flex-1 text-sm rounded-xl border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition-colors"
                    data-testid="input-copilot-message"
                  />
                  <Button
                    size="icon"
                    onClick={() => send()}
                    disabled={!input.trim() || chat.isPending}
                    className="rounded-xl shrink-0"
                    data-testid="button-copilot-send"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">
                    SoundLedger Co-Pilot · by SoundLedger Technologies Inc.
                  </p>
                  {input.length > MAX_CHARS * 0.8 && (
                    <p className={`text-[10px] ${charsLeft < 50 ? "text-destructive" : "text-muted-foreground"}`}>
                      {charsLeft} left
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ── Rich message formatter ────────────────────────────────────────────────────
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let numberedItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc list-outside pl-4 space-y-0.5 my-1">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm">{inlineFormat(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (numberedItems.length) {
      elements.push(
        <ol key={`ol-${key}`} className="list-decimal list-outside pl-4 space-y-0.5 my-1">
          {numberedItems.map((item, i) => (
            <li key={i} className="text-sm">{inlineFormat(item)}</li>
          ))}
        </ol>
      );
      numberedItems = [];
    }
  };

  lines.forEach((line, idx) => {
    // Bullet list item
    if (/^[-•*]\s+/.test(line)) {
      flushList(`pre-${idx}`);
      listItems.push(line.replace(/^[-•*]\s+/, ""));
      return;
    }
    // Numbered list item
    if (/^\d+\.\s+/.test(line)) {
      flushList(`pre-num-${idx}`);
      numberedItems.push(line.replace(/^\d+\.\s+/, ""));
      return;
    }

    flushList(`${idx}`);

    // H3 heading: ### or **heading**
    if (/^###\s+/.test(line)) {
      elements.push(
        <p key={idx} className="font-bold text-sm text-foreground mt-2 mb-0.5">
          {inlineFormat(line.replace(/^###\s+/, ""))}
        </p>
      );
      return;
    }

    // Empty line → small gap
    if (line.trim() === "") {
      if (idx > 0 && idx < lines.length - 1) {
        elements.push(<div key={idx} className="h-1" />);
      }
      return;
    }

    elements.push(
      <p key={idx} className="text-sm">
        {inlineFormat(line)}
      </p>
    );
  });

  flushList("end");

  return <>{elements}</>;
}

function inlineFormat(text: string): React.ReactNode {
  // Split on **bold**, `code`, then render
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-muted-foreground/10 rounded px-1 py-0.5 text-[11px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
