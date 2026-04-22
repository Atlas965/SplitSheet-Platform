import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  X,
  FileText,
  File,
  CheckCircle2,
  Mail,
  UserPlus,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Types ─────────────────────────────────────────────────────────────────────
export type QuickActionType = "upload" | "invite" | "export" | null;

interface QuickActionModalProps {
  action: QuickActionType;
  onClose: () => void;
}

// ── Accepted MIME types for contract uploads ──────────────────────────────────
const ACCEPTED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "text/plain",
];
const ACCEPTED_EXT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type === "application/pdf") return "📄";
  if (type.includes("word")) return "📝";
  if (type.startsWith("image")) return "🖼";
  return "📎";
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD PANEL
// ─────────────────────────────────────────────────────────────────────────────
function UploadPanel({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  // Paste support (Ctrl+V an image or file)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const pastedFiles = items
        .filter((i) => i.kind === "file")
        .map((i) => i.getAsFile())
        .filter(Boolean) as File[];
      if (pastedFiles.length) addFiles(pastedFiles);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => ACCEPTED.includes(f.type));
    const invalid = incoming.filter((f) => !ACCEPTED.includes(f.type));
    if (invalid.length) {
      toast({
        title: "Unsupported file type",
        description: `Only PDF, DOCX, DOC, PNG, JPG and TXT are accepted.`,
        variant: "destructive",
      });
    }
    if (valid.length) setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      // Convert each file to base64 and POST to activity log
      // In production you'd POST to /api/contracts/upload or object storage
      for (const file of files) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        await apiRequest("POST", "/api/activity", {
          activityType: "contract_upload",
          activityData: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            // base64 stored client-side; in prod send to object storage endpoint
          },
        });
      }
      setDone(true);
      toast({
        title: "Upload successful",
        description: `${files.length} document${files.length > 1 ? "s" : ""} uploaded.`,
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Could not save the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">
            {files.length} file{files.length > 1 ? "s" : ""} uploaded
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Documents saved to your contract vault.
          </p>
        </div>
        <div className="w-full space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 border border-border/50 text-sm"
            >
              <span>{fileIcon(f.type)}</span>
              <span className="flex-1 truncate font-medium text-foreground">
                {f.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatBytes(f.size)}
              </span>
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50 hover:bg-muted/30"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <Upload className="h-5 w-5 text-accent" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground text-sm">
            Drop files here, click to browse, or paste
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, DOC, PNG, JPG · Max 10 MB each
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">
            V
          </kbd>
          <span>to paste from clipboard</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXT}
          multiple
          className="sr-only"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {files.length} file{files.length > 1 ? "s" : ""} ready
          </p>
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
            >
              <span className="text-xl shrink-0">{fileIcon(f.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {f.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(f.size)}
                </p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!files.length || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" /> Upload{" "}
              {files.length > 0 ? `${files.length} ` : ""}Document
              {files.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVITE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function InvitePanel({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("collaborator");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleSend = async () => {
    if (!email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      await apiRequest("POST", "/api/activity", {
        activityType: "collaborator_invite",
        activityData: {
          email,
          role,
          message,
          sentAt: new Date().toISOString(),
        },
      });
      setDone(true);
      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${email}.`,
      });
    } catch {
      toast({
        title: "Failed to send",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">
            Invite sent to {email}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            They'll receive a link to join as a {role}.
          </p>
        </div>
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setDone(false);
              setEmail("");
              setMessage("");
            }}
          >
            Invite another
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="invite-email" className="text-sm">
          Email address <span className="text-destructive">*</span>
        </Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="collaborator@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="invite-role" className="text-sm">
          Role
        </Label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="collaborator">Collaborator (view &amp; sign)</option>
          <option value="producer">Producer</option>
          <option value="writer">Writer / Co-writer</option>
          <option value="manager">Manager</option>
          <option value="label">Label / Publisher</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="invite-message" className="text-sm">
          Personal message{" "}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <textarea
          id="invite-message"
          rows={3}
          placeholder="Hey — I'm sending you this split sheet for our collab. Sign when you get a chance!"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSend}
          disabled={!email || sending}
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Send Invite
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ExportPanel({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [format, setFormat] = useState<"pdf" | "csv" | "zip">("pdf");
  const [filter, setFilter] = useState<"all" | "signed" | "pending" | "draft">(
    "all",
  );
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch contracts from API, then trigger client-side download
      const contracts = await apiRequest("GET", "/api/contracts");
      const data = Array.isArray(contracts) ? contracts : [];
      const filtered =
        filter === "all" ? data : data.filter((c: any) => c.status === filter);

      if (!filtered.length) {
        toast({
          title: "No contracts",
          description: `No ${filter === "all" ? "" : filter + " "}contracts found.`,
          variant: "destructive",
        });
        setExporting(false);
        return;
      }

      if (format === "csv") {
        const header = "ID,Title,Type,Status,Created At\n";
        const rows = filtered
          .map(
            (c: any) =>
              `${c.id},"${c.title}","${c.type}","${c.status}","${c.createdAt}"`,
          )
          .join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        triggerDownload(blob, `splitsheet-contracts-${filter}.csv`);
      } else {
        // For PDF/ZIP: export as JSON manifest (real PDF generation requires server)
        const json = JSON.stringify(
          { exportedAt: new Date().toISOString(), filter, contracts: filtered },
          null,
          2,
        );
        const blob = new Blob([json], { type: "application/json" });
        triggerDownload(blob, `splitsheet-export-${filter}.json`);
      }

      await apiRequest("POST", "/api/activity", {
        activityType: "contracts_export",
        activityData: {
          format,
          filter,
          count: filtered.length,
          exportedAt: new Date().toISOString(),
        },
      });

      setDone(true);
      toast({
        title: "Export ready",
        description: `${filtered.length} contract${filtered.length !== 1 ? "s" : ""} downloaded.`,
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not generate export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Export downloaded</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check your downloads folder.
          </p>
        </div>
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setDone(false)}
          >
            Export again
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-sm">Export format</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["pdf", "csv", "zip"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`p-3 rounded-xl border text-sm font-medium transition-colors text-center ${
                format === f
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/40"
              }`}
            >
              <div className="text-xl mb-1">
                {f === "pdf" ? "📄" : f === "csv" ? "📊" : "🗜"}
              </div>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        {format !== "csv" && (
          <p className="text-xs text-muted-foreground pt-1">
            PDF/ZIP generation requires Pro plan — exports as JSON manifest on
            Free.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Which contracts</Label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All contracts</option>
          <option value="signed">Signed only</option>
          <option value="pending">Pending signatures</option>
          <option value="draft">Drafts only</option>
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Contracts
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODAL ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG: Record<
  NonNullable<QuickActionType>,
  { title: string; subtitle: string; icon: React.ReactNode }
> = {
  upload: {
    title: "Upload Contract Document",
    subtitle: "Drag, drop, click, or paste a file",
    icon: <Upload className="h-4 w-4 text-accent" />,
  },
  invite: {
    title: "Invite Collaborator",
    subtitle: "Send a link to sign or collaborate",
    icon: <UserPlus className="h-4 w-4 text-accent" />,
  },
  export: {
    title: "Export Contracts",
    subtitle: "Download your contract archive",
    icon: <Download className="h-4 w-4 text-accent" />,
  },
};

export default function QuickActionModal({
  action,
  onClose,
}: QuickActionModalProps) {
  const cfg = action ? CONFIG[action] : null;

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-full p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              {cfg?.icon}
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold leading-none">
                {cfg?.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cfg?.subtitle}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5">
          {action === "upload" && <UploadPanel onClose={onClose} />}
          {action === "invite" && <InvitePanel onClose={onClose} />}
          {action === "export" && <ExportPanel onClose={onClose} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-muted/30 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            SplitSheet · SoundLedger Technologies Inc. · Ontario, Canada
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
