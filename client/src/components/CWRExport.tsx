/**
 * Sample CWR-shaped export. Sender IPI is a placeholder (000000000) until
 * SplitSheet is assigned a real PRO sender ID. Do not file this as-is.
 */

import { useState } from "react";
import { Download, FileText, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── CWR record types we generate ─────────────────────────────────────────────
// HDR — Transmission Header
// GRH — Group Header
// NWR — New Works Registration
// SPU — Publisher record (SplitSheet as submitter)
// SPT — Publisher Territory
// SWR — Writer record per collaborator
// SWT — Writer Territory
// PWR — Publisher for Writer
// GRT — Group Trailer
// TRL — Transmission Trailer

interface Collaborator {
  name:                string;
  role:                string;
  ownershipPercentage: number;
  proAffiliation?:     string;
  ipiNumber?:          string;
}

interface CWRExportProps {
  contractId:    string;
  songTitle:     string;
  collaborators: Collaborator[];
  isrc?:         string;
}

// ── CWR field padding helpers ─────────────────────────────────────────────────
function pad(val: string | number, len: number, right = false): string {
  const s = String(val ?? "");
  return right ? s.padEnd(len, " ").slice(0, len) : s.padStart(len, "0").slice(0, len);
}

function today(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function mapRoleToCWR(role: string): string {
  const map: Record<string, string> = {
    writer:    "CA",   // Composer & Author
    "co-writer": "CA",
    producer:  "AR",   // Arranger
    performer: "ES",   // Performing Artist (non-registrant)
    publisher: "AQ",   // Acquirer
    manager:   "SE",   // Sub-publisher
  };
  return map[role.toLowerCase()] ?? "CA";
}

// ── CWR generator ─────────────────────────────────────────────────────────────
function buildCWR(
  songTitle: string,
  collaborators: Collaborator[],
  isrc?: string,
): string {
  const senderIPI   = "000000000";   // SplitSheet placeholder IPI
  const senderName  = pad("SPLITSHEET TECHNOLOGIES INC", 45, true);
  const receiverIPI = "000000000";
  const msgVersion  = "02.10";

  const lines: string[] = [];

  // HDR
  lines.push([
    "HDR",
    pad("PB", 2, true),          // sender type: publisher
    pad(senderIPI, 9),
    senderName,
    pad("01", 3),                // transmission count
    pad(today(), 8),
    pad("000000", 6),            // creation time
    pad(msgVersion, 5, true),
    pad("0000", 4),
  ].join(""));

  // GRH
  lines.push([
    "GRH",
    pad("NWR", 3, true),
    pad("0001", 4),
    pad(msgVersion, 5, true),
    pad("0000000", 7),           // batch request count
    pad("U", 1, true),
  ].join(""));

  // NWR — the work itself
  const title = pad(songTitle.toUpperCase(), 60, true);
  const langCode = pad("EN", 2, true);
  lines.push([
    "NWR",
    pad("0000001", 8),           // transaction sequence
    pad("0", 8),                 // record sequence
    title,
    langCode,
    pad("", 60, true),           // original title
    pad("", 14, true),           // ISWC
    pad("MOD", 3, true),         // musical work distribution
    pad("", 3, true),            // category
    pad("0000", 4),              // duration
    pad("", 60, true),           // text music relationship
    pad("ORI", 3, true),         // composite type
    pad("", 14, true),           // composite component count
    pad("", 45, true),           // submitter work number
    pad(isrc ?? "", 12, true),
    pad("", 1, true),            // recorded indicator
    pad("", 1, true),            // text music indicator
    pad("", 1, true),            // music arrangement
    pad("", 1, true),            // lyric adaptation
    pad("", 4, true),            // contact name
    pad("", 14, true),           // contact ID
    pad("", 1, true),            // CWR work type
    pad("", 1, true),            // grand rights indicator
    pad("", 3, true),            // composite component count
    pad("", 30, true),           // date of publication
    pad("", 3, true),            // exceptional clause
    pad("", 25, true),           // opus number
    pad("", 25, true),           // catalogue number
    pad("", 1, true),            // priority flag
  ].join(""));

  let seq = 2;

  // SPU — publisher (SplitSheet as administrator)
  lines.push([
    "SPU",
    pad("0000001", 8),
    pad(seq++, 8),
    pad("1", 3),                 // publisher sequence
    pad(senderIPI, 9),
    pad("SPLITSHEET TECHNOLOGIES INC", 45, true),
    pad("AQ", 2, true),
    pad("", 9),                  // tax ID
    pad("", 9),                  // IPI base number
    pad("00", 2),                // special agreements indicator
    pad("", 1, true),
    pad("00000", 5),             // PR affiliation society
    pad("000000000000", 12),     // PR ownership share
    pad("00000", 5),
    pad("000000000000", 12),
    pad("00000", 5),
    pad("000000000000", 12),
    pad("", 1, true),
    pad("", 25, true),
    pad("", 14, true),
  ].join(""));

  // SPT — publisher territory (World)
  lines.push([
    "SPT",
    pad("0000001", 8),
    pad(seq++, 8),
    pad("1", 9),
    pad("000", 3, true),         // constant
    pad("000000000000", 12),
    pad("000000000000", 12),
    pad("000000000000", 12),
    pad("I", 1, true),           // inclusion
    pad("2136", 4),              // TIS numeric code — World
    pad("", 1, true),
  ].join(""));

  // SWR + SWT per collaborator
  collaborators.forEach((c, i) => {
    const ipi    = pad(c.ipiNumber ?? "000000000", 9);
    const pct    = Math.round(c.ownershipPercentage * 100); // basis points
    const pctStr = pad(pct, 12);
    const wrRole = mapRoleToCWR(c.role);
    const nameParts = c.name.toUpperCase().split(" ");
    const lastName  = pad(nameParts[nameParts.length - 1] ?? "", 45, true);
    const firstName = pad(nameParts.slice(0, -1).join(" ") ?? "", 30, true);

    lines.push([
      "SWR",
      pad("0000001", 8),
      pad(seq++, 8),
      pad(i + 1, 9),             // writer sequence
      ipi,
      lastName,
      firstName,
      pad("", 1, true),          // unknown indicator
      wrRole,
      pad("", 9),                // tax ID
      pad("", 9),                // IPI base number
      pctStr,                    // PR ownership share
      pctStr,                    // MR ownership share
      pctStr,                    // SR ownership share
      pad("", 1, true),          // reversionary indicator
      pad("", 1, true),          // first recording refusal ind
      pad("", 1, true),          // work for hire indicator
      pad(c.proAffiliation ?? "SOCAN", 5, true), // PRO affiliation
      pad("", 14, true),
      pad("", 12, true),
      pad("", 1, true),
    ].join(""));

    // SWT — writer territory (World)
    lines.push([
      "SWT",
      pad("0000001", 8),
      pad(seq++, 8),
      pad(i + 1, 9),
      pctStr,
      pctStr,
      pctStr,
      pad("I", 1, true),
      pad("2136", 4),
      pad("", 1, true),
    ].join(""));

    // PWR — link writer to publisher
    lines.push([
      "PWR",
      pad("0000001", 8),
      pad(seq++, 8),
      pad(senderIPI, 9),
      pad("SPLITSHEET TECHNOLOGIES INC", 45, true),
      pad("1", 9),
      ipi,
    ].join(""));
  });

  // GRT
  lines.push([
    "GRT",
    pad("0001", 4),
    pad(seq - 1, 8),
    pad("0", 8),
  ].join(""));

  // TRL
  lines.push([
    "TRL",
    pad("01", 3),
    pad("0001", 8),
    pad(seq - 1, 8),
  ].join(""));

  return lines.join("\r\n") + "\r\n";
}

// ── React component ───────────────────────────────────────────────────────────
export default function CWRExport({
  contractId,
  songTitle,
  collaborators,
  isrc,
}: CWRExportProps) {
  const { toast } = useToast();
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    try {
      const cwr  = buildCWR(songTitle, collaborators, isrc);
      const blob = new Blob([cwr], { type: "text/plain;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${songTitle.replace(/\s+/g, "_")}_CWR.cwr`;
      a.click();
      URL.revokeObjectURL(url);

      await apiRequest("POST", "/api/activity", {
        activityType: "cwr_export",
        activityData: {
          contractId,
          songTitle,
          collaboratorCount: collaborators.length,
          exportedAt: new Date().toISOString(),
        },
      });

      setExported(true);
      toast({
        title: "Sample CWR file downloaded",
        description: "This is a preview file. Sender IPI is a placeholder — do not submit it to a PRO for filing.",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not generate CWR file. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Sample CWR export
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    CWR is the format PROs accept. This download uses a placeholder
                    sender IPI (000000000) until SplitSheet has a real sender ID.
                    Use it as a working sample — not as a filing.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
            <p className="text-xs text-muted-foreground">
              Preview only · not ready for PRO filing
            </p>
          </div>
        </div>

        {exported ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            Exported
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="shrink-0 text-xs"
            data-testid="btn-cwr-export"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download sample
          </Button>
        )}
      </div>

      {/* PRO badge row */}
      <div className="flex flex-wrap gap-1.5">
        {["🇨🇦 SOCAN", "BMI", "ASCAP", "PRS", "SESAC", "+77 more"].map((p) => (
          <span
            key={p}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
          >
            {p}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Includes collaborator splits and any IPI / ISRC you entered. Sender IPI is
        currently <span className="font-mono">000000000</span>. Do not submit this
        file to SOCAN, ASCAP, BMI, or PRS until a real sender ID is assigned.
      </p>
    </div>
  );
}