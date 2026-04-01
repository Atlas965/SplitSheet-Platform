import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eraser, PenLine, Type, CheckCircle2 } from "lucide-react";

export interface SignerDetails {
  fullName: string;
  email: string;
  title: string;
}

export interface SignaturePayload {
  signatureData: string;  // Base64 PNG
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  signedAt: string;
  mode: "draw" | "type";
}

interface SignatureCanvasProps {
  onSave: (payload: SignaturePayload) => void;
  isSaving?: boolean;
  disabled?: boolean;
}

const CURSIVE_FONT = "'Dancing Script', 'Pacifico', cursive";

function loadFont() {
  if (document.getElementById("esign-font-link")) return;
  const link = document.createElement("link");
  link.id = "esign-font-link";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap";
  document.head.appendChild(link);
}

export default function SignatureCanvas({ onSave, isSaving = false, disabled = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawIsEmpty, setDrawIsEmpty] = useState(true);
  const [typedName, setTypedName] = useState("");
  const [details, setDetails] = useState<SignerDetails>({ fullName: "", email: "", title: "" });
  const [step, setStep] = useState<"details" | "sign">("details");
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { loadFont(); }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (step === "sign" && mode === "draw") {
      setTimeout(initCanvas, 50);
    }
  }, [step, mode, initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    setDrawIsEmpty(false);
    lastPos.current = pos;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { setIsDrawing(false); lastPos.current = null; };

  const clearDraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawIsEmpty(true);
  };

  const renderTypedToCanvas = (): string => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 600;
    offscreen.height = 150;
    const ctx = offscreen.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 600, 150);
    ctx.font = `64px ${CURSIVE_FONT}`;
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 300, 75);
    return offscreen.toDataURL("image/png");
  };

  const canProceedDetails = details.fullName.trim().length > 1 && details.email.includes("@");
  const canSign = mode === "draw" ? !drawIsEmpty : typedName.trim().length > 1;

  const handleSign = () => {
    let dataUrl = "";
    if (mode === "draw") {
      dataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
    } else {
      dataUrl = renderTypedToCanvas();
    }
    onSave({
      signatureData: dataUrl,
      signerName: details.fullName,
      signerEmail: details.email,
      signerTitle: details.title,
      signedAt: new Date().toISOString(),
      mode,
    });
  };

  if (step === "details") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Enter your details to begin the signing process. This information will appear on the signature certificate.
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="signer-name" className="text-xs font-medium">
              Full Legal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="signer-name"
              placeholder="e.g. Jordan Smith"
              value={details.fullName}
              onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
              className="mt-1 h-9 text-sm"
              data-testid="input-signer-name"
            />
          </div>
          <div>
            <Label htmlFor="signer-email" className="text-xs font-medium">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="signer-email"
              type="email"
              placeholder="you@example.com"
              value={details.email}
              onChange={(e) => setDetails({ ...details, email: e.target.value })}
              className="mt-1 h-9 text-sm"
              data-testid="input-signer-email"
            />
          </div>
          <div>
            <Label htmlFor="signer-title" className="text-xs font-medium">Role / Title</Label>
            <Input
              id="signer-title"
              placeholder="e.g. Producer, Artist, Manager"
              value={details.title}
              onChange={(e) => setDetails({ ...details, title: e.target.value })}
              className="mt-1 h-9 text-sm"
              data-testid="input-signer-title"
            />
          </div>
        </div>
        <Button
          className="w-full"
          disabled={!canProceedDetails}
          onClick={() => setStep("sign")}
          data-testid="button-proceed-to-sign"
        >
          <PenLine className="h-4 w-4 mr-2" />
          Continue to Sign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Signer summary */}
      <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <div className="text-xs">
          <span className="font-semibold">{details.fullName}</span>
          {details.title && <span className="text-muted-foreground"> · {details.title}</span>}
          <p className="text-muted-foreground">{details.email}</p>
        </div>
        <button
          className="ml-auto text-xs text-primary underline"
          onClick={() => setStep("details")}
        >Edit</button>
      </div>

      {/* Mode tabs */}
      <Tabs value={mode} onValueChange={(v) => { setMode(v as "draw" | "type"); clearDraw(); setTypedName(""); }}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="draw" className="text-xs" data-testid="tab-draw-signature">
            <PenLine className="h-3 w-3 mr-1.5" /> Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="text-xs" data-testid="tab-type-signature">
            <Type className="h-3 w-3 mr-1.5" /> Type
          </TabsTrigger>
        </TabsList>

        {/* Draw tab */}
        <TabsContent value="draw" className="mt-3 space-y-2">
          <div
            className="relative rounded-lg border-2 border-dashed border-slate-300 bg-white overflow-hidden"
            style={{ height: "130px" }}
          >
            {drawIsEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-1">
                <PenLine className="h-4 w-4 text-slate-300" />
                <p className="text-slate-400 text-xs">Draw your signature here</p>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              data-testid="signature-canvas"
            />
          </div>
          <button
            onClick={clearDraw}
            disabled={drawIsEmpty}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-30"
            data-testid="button-clear-signature"
          >
            <Eraser className="h-3 w-3" /> Clear
          </button>
        </TabsContent>

        {/* Type tab */}
        <TabsContent value="type" className="mt-3 space-y-2">
          <div>
            <Input
              placeholder="Type your full name to sign"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="h-9 text-sm"
              data-testid="input-typed-signature"
            />
          </div>
          {typedName.trim() && (
            <div
              className="rounded-lg border border-slate-200 bg-white flex items-center justify-center"
              style={{ height: "80px" }}
            >
              <p
                style={{ fontFamily: CURSIVE_FONT, fontSize: "36px", color: "#1e293b", lineHeight: 1 }}
                data-testid="text-typed-preview"
              >
                {typedName}
              </p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Your typed name will be rendered as a cursive signature on the document.
          </p>
        </TabsContent>
      </Tabs>

      {/* Sign button */}
      <Button
        className="w-full"
        onClick={handleSign}
        disabled={!canSign || isSaving || disabled}
        data-testid="button-save-signature"
      >
        {isSaving ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
        ) : (
          <><PenLine className="h-4 w-4 mr-2" />Apply Signature & Sign Contract</>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        By clicking above you agree this is your legally binding e-signature under ESIGN & UETA Acts.
      </p>
    </div>
  );
}
