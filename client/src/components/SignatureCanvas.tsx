import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Save, RotateCcw } from "lucide-react";

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  isSaving?: boolean;
  disabled?: boolean;
}

export default function SignatureCanvas({ onSave, isSaving = false, disabled = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCanvas = () => canvasRef.current;
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = getCtx();
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = getCanvas();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    setIsEmpty(false);
    lastPos.current = pos;

    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
  }, [disabled]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos || !lastPos.current) return;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
  }, [isDrawing, disabled]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    const canvas = getCanvas();
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-white overflow-hidden"
           style={{ height: "140px" }}>
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <p className="text-slate-400 text-sm font-light tracking-wide">
              Draw your signature here
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
          aria-label="Signature drawing area"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={isEmpty || disabled || isSaving}
          className="flex-1"
          data-testid="button-clear-signature"
        >
          <Eraser className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isEmpty || disabled || isSaving}
          className="flex-1"
          data-testid="button-save-signature"
        >
          {isSaving ? (
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </div>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Sign & Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
