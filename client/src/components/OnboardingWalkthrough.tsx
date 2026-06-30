import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const STORAGE_KEY = "sl_onboarding_completed";
const STORAGE_STEP = "sl_onboarding_step";

interface Step {
  phase: string;
  title: string;
  body: string;
  cta?: string;
  type: "center" | "tooltip";
  targetPath?: string; // which page this step belongs to
}

const STEPS: Step[] = [
  // Phase 1 — Welcome & Orientation
  {
    phase: "Phase 1 of 4 · Welcome",
    title: "Welcome to SoundLedger SplitSheet",
    body: "Welcome, Operator! You're now in your Command Center. From here, you'll manage clients, track song assets, and finalize legally-binding music agreements. Ready to start your first project?",
    cta: "Let's Go!",
    type: "center",
    targetPath: "/",
  },
  {
    phase: "Phase 1 of 4 · Dashboard",
    title: "Your Operator Dashboard",
    body: "Monitor your business at a glance. Track active projects, pending signatures, and confirmed agreements across your entire roster. Every stat updates in real time.",
    cta: "Got it",
    type: "center",
    targetPath: "/",
  },
  {
    phase: "Phase 1 of 4 · First Step",
    title: "Your First Step: Create a Project",
    body: "Start here. A Project is the workspace where you'll define song splits and invite collaborators to sign. Use the \"New Split Sheet Project\" button in Quick Actions.",
    cta: "Next",
    type: "center",
    targetPath: "/",
  },

  // Phase 2 — Building the Workspace
  {
    phase: "Phase 2 of 4 · Client Intake",
    title: "Client Intake",
    body: "Assign a project to a Client — Artist, Producer, or Label. If they're new, you can add them to your CRM directly from the Clients page. Each client gets their own project history.",
    cta: "Next",
    type: "center",
    targetPath: "/clients",
  },
  {
    phase: "Phase 2 of 4 · Contributors",
    title: "The Contributor Registry",
    body: "Add everyone with an ownership stake. Enter PRO affiliation, IPI number, and ownership percentage for each person. The platform ensures all percentages total exactly 100%.",
    cta: "Next",
    type: "center",
    targetPath: "/projects",
  },

  // Phase 3 — Legal Integrity
  {
    phase: "Phase 3 of 4 · Agreements",
    title: "Choosing the Right Template",
    body: "Select the right tool for the job. Use a Split Sheet for songwriting, a Producer Agreement for beat licensing, or a Performance Agreement for live bookings. All templates are lawyer-informed.",
    cta: "Next",
    type: "center",
    targetPath: "/contracts",
  },
  {
    phase: "Phase 3 of 4 · Metadata",
    title: "Industry-Standard Metadata",
    body: "Ensure accurate royalty collection by entering PRO affiliations (e.g., SOCAN, ASCAP, BMI) and IPI/CAE numbers. This information routes royalties to the right people through performing rights organizations.",
    cta: "Next",
    type: "center",
    targetPath: "/contracts",
  },
  {
    phase: "Phase 3 of 4 · Confirmation",
    title: "Zero-Friction Confirmation",
    body: "Ready to sign? Generate unique links for your collaborators. They can confirm from any device with no account required — no login, no friction. Confirmations are timestamped and IP-logged automatically.",
    cta: "Next",
    type: "center",
    targetPath: "/projects",
  },

  // Phase 4 — Rights Ledger
  {
    phase: "Phase 4 of 4 · Rights Ledger",
    title: "Your Rights Ledger",
    body: "Once confirmed, song assets live here permanently. This is your versioned record of ownership, ISWC codes, revenue history, and activity logs. Every change is audited and cannot be erased.",
    cta: "Finish Setup",
    type: "center",
    targetPath: "/ownership",
  },
];

export default function OnboardingWalkthrough() {
  const [location] = useLocation();
  const [step, setStep] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    const saved = localStorage.getItem(STORAGE_STEP);
    const savedStep = saved ? parseInt(saved, 10) : 0;
    setStep(savedStep);
    setVisible(true);
  }, []);

  if (!visible || step === null) return null;
  if (step >= STEPS.length) return null;

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const advance = () => {
    const next = step + 1;
    if (next >= STEPS.length) {
      finish();
    } else {
      setStep(next);
      localStorage.setItem(STORAGE_STEP, String(next));
    }
  };

  const back = () => {
    if (step === 0) return;
    const prev = step - 1;
    setStep(prev);
    localStorage.setItem(STORAGE_STEP, String(prev));
  };

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.removeItem(STORAGE_STEP);
    setVisible(false);
    setStep(null);
  };

  const skip = () => finish();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={skip} />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          data-testid={`onboarding-step-${step}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-1">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {current.phase}
            </Badge>
            <button
              onClick={skip}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-onboarding-skip"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Icon + Content */}
          <div className="px-6 py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">{current.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
              </div>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 pb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setStep(i);
                  localStorage.setItem(STORAGE_STEP, String(i));
                }}
                className={`rounded-full transition-all ${
                  i === step ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/30"
                }`}
                data-testid={`onboarding-dot-${i}`}
              />
            ))}
          </div>

          {/* Actions */}
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
                {current.cta ?? "Next"} {step < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
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
  window.location.reload();
}
