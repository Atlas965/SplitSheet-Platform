import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, ArrowLeft, Sparkles, Users, Link2 } from "lucide-react";

const STORAGE_KEY = "sl_onboarding_completed";
const STORAGE_STEP = "sl_onboarding_step";

interface Step {
  phase: string;
  title: string;
  body: string;
  cta?: string;
  type: "center" | "spotlight";
  targetPath?: string;
  /** data-tour attribute value to highlight */
  spotlight?: string;
}

const STEPS: Step[] = [
  {
    phase: "1 of 6 · Welcome",
    title: "Welcome to SplitSheet",
    body: "You are the operator — a studio, producer, or label documenting splits and related agreements for other people. Contributors confirm from a link. They do not need a SplitSheet account.",
    cta: "Show me how",
    type: "center",
    targetPath: "/",
  },
  {
    phase: "2 of 6 · Pipeline",
    title: "The job, in order",
    body: "Project → contributors and splits → send a confirmation link or QR → evidence → Rights Ledger. Use this checklist on the dashboard for every song.",
    cta: "Next",
    type: "spotlight",
    targetPath: "/",
    spotlight: "workflow-banner",
  },
  {
    phase: "3 of 6 · Project",
    title: "Create a project first",
    body: "Start from Projects. Enter the song title, then add every contributor with role and ownership percentage. Percentages must total 100% before links can be sent. Clients are the people on your roster — add them here or they appear after you put them on a project.",
    cta: "Go to Projects",
    type: "center",
    targetPath: "/projects",
  },
  {
    phase: "4 of 6 · Confirm",
    title: "Send a link or QR — same workflow",
    body: "Generate a confirmation link and share it by email, WhatsApp, or QR. The contributor opens /confirm on their phone, reviews the split, and confirms. No login. Expired and revoked links stop working.",
    cta: "Next",
    type: "center",
    targetPath: "/projects",
  },
  {
    phase: "5 of 6 · Agreements",
    title: "Agreements are documentation",
    body: "Templates help you assemble the paperwork for a project. They are workflow documents, not legal advice. SplitSheet is not a law firm.",
    cta: "Go to Agreements",
    type: "center",
    targetPath: "/contracts",
  },
  {
    phase: "6 of 6 · Rights Ledger",
    title: "The record after confirmation",
    body: "When every active contributor confirms, SplitSheet writes a versioned rights record. Amendments add a new version. History is kept. This records what was entered and confirmed — it does not determine legal ownership.",
    cta: "Finish",
    type: "center",
    targetPath: "/ownership",
  },
];

function resolvePageKey(path: string): string {
  const roots = ["/clients", "/projects", "/contracts", "/ownership", "/billing"];
  if (path === "/") return "/";
  for (const root of roots) {
    if (path === root || path.startsWith(`${root}/`)) return root;
  }
  return path;
}

export default function OnboardingWalkthrough() {
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null);

  const startTour = useCallback(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;
    const saved = localStorage.getItem(STORAGE_STEP);
    setStep(saved ? parseInt(saved, 10) : 0);
    setVisible(true);
  }, []);

  useEffect(() => {
    startTour();
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_STEP);
      setStep(0);
      setVisible(true);
    };
    window.addEventListener("sl-restart-onboarding", handler);
    return () => window.removeEventListener("sl-restart-onboarding", handler);
  }, [startTour]);

  const current = step !== null ? STEPS[step] : null;

  // Navigate to target page when step requires it
  useEffect(() => {
    if (!visible || step === null || !current?.targetPath) return;
    const pageKey = resolvePageKey(location);
    const targetKey = resolvePageKey(current.targetPath);
    if (pageKey !== targetKey && current.type === "center") {
      setLocation(current.targetPath);
    }
  }, [step, visible, current, location, setLocation]);

  // Spotlight positioning
  useEffect(() => {
    if (!visible || !current?.spotlight) {
      setSpotRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(`[data-tour="${current.spotlight}"]`);
      if (el) setSpotRect(el.getBoundingClientRect());
      else setSpotRect(null);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const t = setTimeout(update, 300);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearTimeout(t);
    };
  }, [visible, current, location, step]);

  if (!visible || step === null || !current) return null;
  if (step >= STEPS.length) return null;

  const progress = ((step + 1) / STEPS.length) * 100;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.removeItem(STORAGE_STEP);
    setVisible(false);
    setStep(null);
  };

  const skip = () => finish();

  const advance = () => {
    const next = step + 1;
    if (next >= STEPS.length) {
      finish();
      return;
    }
    const nextStep = STEPS[next];
    if (nextStep.targetPath && resolvePageKey(location) !== resolvePageKey(nextStep.targetPath)) {
      setLocation(nextStep.targetPath);
    }
    setStep(next);
    localStorage.setItem(STORAGE_STEP, String(next));
  };

  const back = () => {
    if (step === 0) return;
    const prev = step - 1;
    const prevStep = STEPS[prev];
    if (prevStep.targetPath && resolvePageKey(location) !== resolvePageKey(prevStep.targetPath)) {
      setLocation(prevStep.targetPath);
    }
    setStep(prev);
    localStorage.setItem(STORAGE_STEP, String(prev));
  };

  const isB2B2CStep = current.title.includes("B2B2C");

  const modalStyle: React.CSSProperties =
    current.type === "spotlight" && spotRect
      ? {
          position: "fixed",
          top: Math.min(spotRect.bottom + 12, window.innerHeight - 320),
          left: Math.max(16, Math.min(spotRect.left, window.innerWidth - 400)),
          width: "min(380px, calc(100vw - 32px))",
          zIndex: 63,
        }
      : {};

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
        onClick={skip}
        aria-hidden
      />

      {/* Spotlight ring */}
      {current.type === "spotlight" && spotRect && (
        <div
          className="fixed z-[61] pointer-events-none rounded-xl ring-4 ring-primary ring-offset-2 ring-offset-background"
          style={{
            top: spotRect.top - 4,
            left: spotRect.left - 4,
            width: spotRect.width + 8,
            height: spotRect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
          }}
        />
      )}

      {/* Modal */}
      <div
        className={
          current.type === "spotlight" && spotRect
            ? "pointer-events-none"
            : "fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
        }
      >
        <div
          className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          style={current.type === "spotlight" && spotRect ? modalStyle : undefined}
          data-testid={`onboarding-step-${step}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center justify-between px-6 pt-5 pb-1">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {current.phase}
            </Badge>
            <button
              onClick={skip}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-onboarding-skip"
              aria-label="Skip walkthrough"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                {isB2B2CStep ? (
                  <Link2 className="h-5 w-5 text-primary" />
                ) : current.title.includes("Client") ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : (
                  <Sparkles className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">{current.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
                {isB2B2CStep && (
                  <div className="mt-3 p-3 bg-muted rounded-lg text-xs space-y-1.5 font-mono">
                    <p className="text-muted-foreground font-sans font-normal mb-2">Contributor sees:</p>
                    <p>1. Open link on phone</p>
                    <p>2. Review split %</p>
                    <p>3. Tap Confirm ✓</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 pb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setStep(i);
                  localStorage.setItem(STORAGE_STEP, String(i));
                  const s = STEPS[i];
                  if (s.targetPath) setLocation(s.targetPath);
                }}
                className={`rounded-full transition-all ${
                  i === step ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/30"
                }`}
                data-testid={`onboarding-dot-${i}`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
            <button
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-onboarding-skip-text"
            >
              Skip walkthrough
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button size="sm" variant="ghost" onClick={back} data-testid="button-onboarding-back">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
              )}
              <Button size="sm" onClick={advance} data-testid="button-onboarding-next">
                {current.cta ?? "Next"}
                {step < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Call this to re-trigger the walkthrough (e.g., from Help menu) */
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_STEP);
  window.dispatchEvent(new CustomEvent("sl-restart-onboarding"));
}
