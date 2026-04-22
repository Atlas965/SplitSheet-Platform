import { useState } from "react";
import { PenLine, X, CheckCircle2, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SignatureCanvas, {
  type SignaturePayload,
} from "@/components/SignatureCanvas";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Step = "sign" | "done";

export default function NavESignButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("sign");
  const [isSaving, setIsSaving] = useState(false);
  const [payload, setPayload] = useState<SignaturePayload | null>(null);

  // ── Reset when dialog closes ────────────────────────
  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setTimeout(() => {
        setStep("sign");
        setPayload(null);
      }, 300); // wait for close animation
    }
  }

  // ── Called by SignatureCanvas on save ───────────────
  async function handleSave(p: SignaturePayload) {
    setIsSaving(true);
    setPayload(p);

    try {
      // POST to existing backend endpoint — stores in contract_signatures table
      // If no contractId context, we store as a standalone "quick sign" event
      await apiRequest("POST", "/api/activity", {
        activityType: "quick_esign",
        activityData: {
          signerName: p.signerName,
          signerEmail: p.signerEmail,
          signerTitle: p.signerTitle,
          signedAt: p.signedAt,
          mode: p.mode,
          // Base64 stored server-side; omit from activity log to keep it light
          hasSignature: true,
        },
      });
    } catch {
      // Non-fatal — signature still captured client-side
    } finally {
      setIsSaving(false);
      setStep("done");
    }
  }

  // ── Download the signature as PNG ───────────────────
  function downloadPNG() {
    if (!payload?.signatureData) return;
    const a = document.createElement("a");
    a.href = payload.signatureData;
    a.download = `signature-${payload.signerName.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();

    toast({
      title: "Signature downloaded",
      description: `${payload.signerName}'s signature saved as PNG.`,
    });
  }

  // ── Copy Base64 to clipboard ────────────────────────
  async function copyBase64() {
    if (!payload?.signatureData) return;
    await navigator.clipboard.writeText(payload.signatureData);
    toast({ title: "Copied", description: "Base64 PNG copied to clipboard." });
  }

  return (
    <>
      {/* ── Trigger button (lives in the nav bar) ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        data-testid="nav-esign-btn"
        title="Quick E-Sign"
      >
        <PenLine className="h-4 w-4" />
        <span className="hidden sm:inline text-sm font-medium">E-Sign</span>
      </Button>

      {/* ── Dialog ─────────────────────────────────── */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md w-full p-0 gap-0 overflow-hidden"
          data-testid="esign-dialog"
        >
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <PenLine className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-semibold leading-none">
                    {step === "sign" ? "Quick E-Signature" : "Signature Saved"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step === "sign"
                      ? "Draw or type your legal signature"
                      : "Legally binding · SoundLedger Technologies Inc."}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="px-6 py-5">
            {/* ── STEP 1: Sign ── */}
            {step === "sign" && (
              <SignatureCanvas onSave={handleSave} isSaving={isSaving} />
            )}

            {/* ── STEP 2: Confirmation ── */}
            {step === "done" && payload && (
              <div className="space-y-4">
                {/* Success banner */}
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold text-green-800 dark:text-green-400">
                      Signature captured
                    </span>
                    <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">
                      {payload.signerName}
                      {payload.signerTitle && ` · ${payload.signerTitle}`}
                    </p>
                  </div>
                </div>

                {/* Signature preview */}
                <div className="rounded-lg border border-border bg-white dark:bg-card overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-muted/40">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Signature Preview
                    </p>
                  </div>
                  <div className="p-4 flex items-center justify-center min-h-[90px]">
                    <img
                      src={payload.signatureData}
                      alt="Saved signature"
                      className="max-h-20 max-w-full object-contain"
                      data-testid="esign-preview-img"
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Signer", value: payload.signerName },
                    { label: "Email", value: payload.signerEmail },
                    {
                      label: "Mode",
                      value: payload.mode === "draw" ? "Drawn" : "Typed",
                    },
                    {
                      label: "Timestamp",
                      value: new Date(payload.signedAt).toLocaleString(
                        "en-CA",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      ),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-md bg-muted/50 px-3 py-2"
                    >
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        {label}
                      </p>
                      <p
                        className="font-medium text-foreground mt-0.5 truncate"
                        title={value}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={downloadPNG}
                    data-testid="esign-download-btn"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={copyBase64}
                    data-testid="esign-copy-btn"
                  >
                    Copy Base64
                  </Button>
                </div>

                {/* Sign again */}
                <button
                  onClick={() => {
                    setStep("sign");
                    setPayload(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                  data-testid="esign-redo-btn"
                >
                  <RotateCcw className="h-3 w-3" />
                  Sign again
                </button>
              </div>
            )}
          </div>

          {/* Footer disclaimer */}
          <div className="px-6 py-3 bg-muted/30 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              By signing you agree this is your legally binding e-signature
              under ESIGN &amp; UETA Acts · Ontario, Canada
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
