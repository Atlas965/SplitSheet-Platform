/**
 * client/src/components/ConfirmationTracker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Operator-facing panel for split confirmation management.
 * Drop inside ContractDetails page:
 *
 *   import ConfirmationTracker from "@/components/ConfirmationTracker";
 *   <ConfirmationTracker contractId={contract.id} contractTitle={contract.title} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, Send, Copy, RefreshCw,
  MessageCircle, Smartphone, Link2, ChevronDown,
  ChevronUp, AlertTriangle, Loader2, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Collaborator {
  id: string;
  name: string;
  email?: string;
  role: string;
  ownershipPercentage: number;
}

interface ConfirmationRecord {
  id:               string;
  token:            string;
  status:           "not_sent" | "sent" | "confirmed" | "change_requested";
  sentAt?:          string;
  confirmedAt?:     string;
  expiresAt?:       string;
  confirmedName?:   string;
  confirmedEmail?:  string;
  confirmationNote?: string;
  collaborator:     Collaborator;
  link:             string;
  whatsapp:         string;
  sms:              string;
}

interface TrackingData {
  contractId:     string;
  contractTitle:  string;
  contractStatus: string;
  allConfirmed:   boolean;
  summary: {
    total:          number;
    confirmed:      number;
    pending:        number;
    notSent:        number;
    changeRequested: number;
  };
  confirmations: ConfirmationRecord[];
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ConfirmationRecord["status"] }) {
  const config = {
    not_sent:        { label: "Not Sent",        className: "bg-muted text-muted-foreground border-border" },
    sent:            { label: "Sent · Pending",  className: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800" },
    confirmed:       { label: "Confirmed",       className: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
    change_requested:{ label: "Change Requested",className: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800" },
  };
  const { label, className } = config[status] ?? config.not_sent;
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${className} flex items-center gap-1.5 shrink-0`}>
      {status === "confirmed"        && <CheckCircle2 className="h-3 w-3" />}
      {status === "sent"             && <Clock className="h-3 w-3" />}
      {status === "change_requested" && <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ── Share dropdown for one collaborator ───────────────────────────────────────
function SharePanel({
  record,
  onMarkSent,
}: {
  record: ConfirmationRecord;
  onMarkSent: (id: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(record.link).then(() => {
      toast({ title: "Link copied", description: `Confirmation link for ${record.collaborator.name} copied.` });
    });
  }

  function copyMessage() {
    const msg = `Hey ${record.collaborator.name} — please review and confirm your split for "${record.collaborator.name}'s track" here: ${record.link}`;
    navigator.clipboard.writeText(msg).then(() => {
      toast({ title: "Message copied", description: "Paste it into WhatsApp, Instagram, or SMS." });
    });
  }

  function openWhatsApp() {
    window.open(record.whatsapp, "_blank");
    onMarkSent(record.id);
  }

  function openSMS() {
    window.open(record.sms, "_blank");
    onMarkSent(record.id);
  }

  if (record.status === "confirmed") return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 text-xs"
        data-testid={`btn-share-${record.collaborator.id}`}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden">

            {/* Link preview */}
            <div className="px-3 py-2.5 bg-muted/50 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Confirmation link</p>
              <p className="text-xs text-foreground font-mono truncate">{record.link}</p>
            </div>

            {/* Actions */}
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => { openWhatsApp(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-green-50 dark:hover:bg-green-950/30 text-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                Open WhatsApp
              </button>

              <button
                onClick={() => { openSMS(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 text-foreground transition-colors"
              >
                <Smartphone className="h-4 w-4 text-blue-600" />
                Open SMS / iMessage
              </button>

              <button
                onClick={() => { copyLink(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors text-foreground"
              >
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Copy Link
              </button>

              <button
                onClick={() => { copyMessage(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors text-foreground"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
                Copy Message
              </button>
            </div>

            <div className="px-3 py-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Paste into WhatsApp, Instagram, SMS — any app
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface ConfirmationTrackerProps {
  contractId:    string;
  contractTitle: string;
}

export default function ConfirmationTracker({ contractId, contractTitle }: ConfirmationTrackerProps) {
  const { toast }  = useToast();
  const qc         = useQueryClient();

  // Fetch tracking data
  const { data, isLoading, refetch } = useQuery<TrackingData>({
    queryKey:  [`/api/contracts/${contractId}/confirmations`],
    enabled:   !!contractId,
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  // Generate / refresh tokens
  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/contracts/${contractId}/generate-confirmations`, {}).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/contracts/${contractId}/confirmations`] });
      toast({ title: "Links generated", description: "Confirmation links are ready to share." });
    },
    onError: () => toast({ title: "Failed", description: "Could not generate links.", variant: "destructive" }),
  });

  // Mark as sent
  const markSentMutation = useMutation({
    mutationFn: (confirmId: string) =>
      apiRequest("POST", `/api/contracts/${contractId}/confirmations/${confirmId}/mark-sent`, {}).then((r) => r.json()),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [`/api/contracts/${contractId}/confirmations`] }),
  });

  const hasLinks = (data?.confirmations?.length ?? 0) > 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Send className="h-4 w-4 text-accent" />
            Confirmation Tracking
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send links via WhatsApp, SMS, or Instagram — track confirmations here
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="btn-generate-confirmations"
          >
            {generateMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating…</>
              : hasLinks ? "Refresh Links" : "Generate Links"}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {data?.summary && hasLinks && (
        <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center gap-4 flex-wrap">
          {[
            { label: "Total",      val: data.summary.total,          color: "text-foreground" },
            { label: "Confirmed",  val: data.summary.confirmed,       color: "text-green-600 dark:text-green-400" },
            { label: "Pending",    val: data.summary.pending,         color: "text-yellow-600 dark:text-yellow-400" },
            { label: "Not Sent",   val: data.summary.notSent,         color: "text-muted-foreground" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold ${color}`}>{val}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}

          {data.allConfirmed && (
            <Badge className="ml-auto bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Fully Confirmed
            </Badge>
          )}
        </div>
      )}

      {/* Collaborator rows */}
      <div className="divide-y divide-border">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {!isLoading && !hasLinks && (
          <div className="py-10 text-center">
            <Send className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No confirmation links yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Generate Links" to create a unique confirmation link for each collaborator.
            </p>
          </div>
        )}

        {data?.confirmations.map((record) => (
          <div key={record.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">

              {/* Collaborator info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground text-sm truncate">{record.collaborator.name}</p>
                  <span className="text-xs text-muted-foreground">{record.collaborator.role}</span>
                  <span className="text-xs font-bold text-accent">{record.collaborator.ownershipPercentage}%</span>
                </div>
                {record.collaborator.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{record.collaborator.email}</p>
                )}

                {/* Timestamps */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <StatusBadge status={record.status} />
                  {record.sentAt && (
                    <span className="text-xs text-muted-foreground">
                      Sent {new Date(record.sentAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {record.confirmedAt && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✓ {new Date(record.confirmedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {record.expiresAt && record.status !== "confirmed" && (
                    <span className="text-xs text-muted-foreground">
                      Expires {new Date(record.expiresAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>

                {/* Change request note */}
                {record.status === "change_requested" && record.confirmationNote && (
                  <div className="mt-2 px-3 py-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-400">Change requested:</p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">{record.confirmationNote}</p>
                  </div>
                )}

                {/* Confirmed by */}
                {record.status === "confirmed" && record.confirmedName && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Signed as: {record.confirmedName}
                    {record.confirmedEmail && ` · ${record.confirmedEmail}`}
                  </p>
                )}
              </div>

              {/* Share button */}
              <SharePanel
                record={record}
                onMarkSent={(id) => markSentMutation.mutate(id)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      {hasLinks && (
        <div className="px-5 py-3 bg-muted/20 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Links expire 72 hours after generation · Auto-refreshes every 30s · Clicks "Open WhatsApp" auto-marks as Sent
          </p>
        </div>
      )}
    </div>
  );
}