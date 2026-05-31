/**
 * client/src/pages/confirm-split.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC page — no login required.
 * Route: /confirm/:contractId/:token
 *
 * Mobile-first, fast, simple. Three states:
 *  1. Loading  → spinner
 *  2. Form     → review split + confirm / request change
 *  3. Done     → success or change-request acknowledgement
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { CheckCircle2, AlertCircle, Clock, Music2, ChevronDown, ChevronUp } from "lucide-react";

interface ConfirmPageData {
  alreadyConfirmed:    boolean;
  confirmedAt?:        string;
  confirmationId:      string;
  contractTitle:       string;
  collaboratorName:    string;
  collaboratorEmail?:  string;
  collaboratorRole:    string;
  ownershipPercentage: number;
  expiresAt?:          string;
  allCollaborators:    { name: string; role: string; ownershipPercentage: number }[];
}

// ── Bar chart for splits ──────────────────────────────────────────────────────
const COLORS = ["#3b6ef5", "#22a06b", "#f59e0b", "#e05252", "#9b59b6", "#1abc9c"];

function SplitBar({ collaborators }: { collaborators: { name: string; ownershipPercentage: number }[] }) {
  return (
    <div className="w-full">
      {/* Bar */}
      <div className="flex w-full h-3 rounded-full overflow-hidden mb-3">
        {collaborators.map((c, i) => (
          <div
            key={c.name}
            style={{ width: `${c.ownershipPercentage}%`, background: COLORS[i % COLORS.length] }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="space-y-2">
        {collaborators.map((c, i) => (
          <div key={c.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span style={{ color: "#1a1d2e", fontWeight: 500 }}>{c.name}</span>
            </div>
            <span style={{ color: "#1a1d2e", fontWeight: 700 }}>{c.ownershipPercentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ConfirmSplit() {
  const { contractId, token } = useParams<{ contractId: string; token: string }>();

  const [pageData, setPageData]     = useState<ConfirmPageData | null>(null);
  const [loadError, setLoadError]   = useState("");
  const [isExpired, setIsExpired]   = useState(false);
  const [showAll, setShowAll]       = useState(false);

  // Form state
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [note,   setNote]   = useState("");
  const [agreed, setAgreed] = useState(false);

  // Submit state
  const [submitting,    setSubmitting]    = useState(false);
  const [doneAction,    setDoneAction]    = useState<"confirm" | "request_change" | null>(null);
  const [successMsg,    setSuccessMsg]    = useState("");
  const [submitError,   setSubmitError]  = useState("");

  // Load page data
  useEffect(() => {
    if (!contractId || !token) return;
    fetch(`/api/confirm/${contractId}/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          if (r.status === 410) setIsExpired(true);
          setLoadError(data.error ?? "Could not load this confirmation link.");
          return;
        }
        setPageData(data);
        // Pre-fill name/email if known
        if (data.collaboratorName)  setName(data.collaboratorName);
        if (data.collaboratorEmail) setEmail(data.collaboratorEmail);
      })
      .catch(() => setLoadError("Network error. Please check your connection and try again."));
  }, [contractId, token]);

  async function handleSubmit(action: "confirm" | "request_change") {
    if (action === "confirm" && !agreed) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const r = await fetch(`/api/confirm/${contractId}/${token}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, name, email, note }),
      });
      const data = await r.json();
      if (!r.ok) { setSubmitError(data.error ?? "Something went wrong. Please try again."); return; }
      setDoneAction(action);
      setSuccessMsg(data.message);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const styles = {
    page:    { minHeight: "100vh", background: "#f5f6fa", display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "24px 16px 40px" },
    card:    { background: "#fff", borderRadius: "16px", border: "1px solid #e2e6ef", padding: "24px", width: "100%", maxWidth: "480px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" },
    logo:    { display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" },
    label:   { fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#7c84a0", marginBottom: "4px" },
    input:   { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e6ef", fontSize: "15px", color: "#1a1d2e", outline: "none", boxSizing: "border-box" as const, background: "#fafbff" },
    textarea:{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e6ef", fontSize: "14px", color: "#1a1d2e", outline: "none", boxSizing: "border-box" as const, background: "#fafbff", resize: "vertical" as const, minHeight: "80px" },
    btnPrimary: { width: "100%", padding: "14px", borderRadius: "10px", background: "#3b6ef5", color: "#fff", border: "none", fontSize: "16px", fontWeight: 600, cursor: "pointer", opacity: 1 },
    btnGhost:   { width: "100%", padding: "12px", borderRadius: "10px", background: "none", color: "#7c84a0", border: "1px solid #e2e6ef", fontSize: "14px", fontWeight: 500, cursor: "pointer", marginTop: "10px" },
    divider:    { border: "none", borderTop: "1px solid #e2e6ef", margin: "20px 0" },
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!pageData && !loadError) {
    return (
      <div style={{ ...styles.page, justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #3b6ef5", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#7c84a0", fontSize: "14px" }}>Loading your confirmation…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error / Expired ──────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.logo }}>
            <Music2 size={20} color="#3b6ef5" />
            <span style={{ fontWeight: 700, fontSize: "18px", color: "#1a1d2e" }}>SplitSheet</span>
          </div>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {isExpired
              ? <Clock size={40} color="#f59e0b" style={{ marginBottom: 12 }} />
              : <AlertCircle size={40} color="#e05252" style={{ marginBottom: 12 }} />}
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1d2e", marginBottom: 8 }}>
              {isExpired ? "Link Expired" : "Invalid Link"}
            </h2>
            <p style={{ fontSize: "14px", color: "#7c84a0", lineHeight: 1.6 }}>{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Already confirmed ────────────────────────────────────────────────────────
  if (pageData?.alreadyConfirmed) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <Music2 size={20} color="#3b6ef5" />
            <span style={{ fontWeight: 700, fontSize: "18px", color: "#1a1d2e" }}>SplitSheet</span>
          </div>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2 size={48} color="#22a06b" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1d2e", marginBottom: 8 }}>Already Confirmed</h2>
            <p style={{ fontSize: "14px", color: "#7c84a0" }}>
              You've already confirmed your split for <strong>"{pageData.contractTitle}"</strong>.<br />
              {pageData.confirmedAt && `Confirmed on ${new Date(pageData.confirmedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Done (submitted) ─────────────────────────────────────────────────────────
  if (doneAction) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <Music2 size={20} color="#3b6ef5" />
            <span style={{ fontWeight: 700, fontSize: "18px", color: "#1a1d2e" }}>SplitSheet</span>
          </div>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {doneAction === "confirm"
              ? <CheckCircle2 size={52} color="#22a06b" style={{ marginBottom: 12 }} />
              : <AlertCircle  size={52} color="#f59e0b" style={{ marginBottom: 12 }} />}
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1d2e", marginBottom: 10 }}>
              {doneAction === "confirm" ? "Split Confirmed!" : "Change Request Sent"}
            </h2>
            <p style={{ fontSize: "15px", color: "#7c84a0", lineHeight: 1.7 }}>{successMsg}</p>
            {doneAction === "confirm" && (
              <div style={{ marginTop: 20, padding: "14px", background: "#edfdf7", borderRadius: "10px", border: "1px solid #a7f0cf" }}>
                <p style={{ fontSize: "13px", color: "#1a7a52", fontWeight: 500 }}>
                  Your agreement has been recorded with a timestamp and IP address for legal reference.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main confirmation form ────────────────────────────────────────────────────
  const data = pageData!;
  const allCollabs = data.allCollaborators ?? [];
  const visibleCollabs = showAll ? allCollabs : allCollabs.slice(0, 3);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.logo}>
          <Music2 size={20} color="#3b6ef5" />
          <span style={{ fontWeight: 700, fontSize: "18px", color: "#1a1d2e" }}>SplitSheet</span>
        </div>

        <p style={{ fontSize: "12px", fontWeight: 600, color: "#7c84a0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
          Split Confirmation
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#1a1d2e", marginBottom: 4, lineHeight: 1.3 }}>
          {data.contractTitle}
        </h1>
        <p style={{ fontSize: "14px", color: "#7c84a0", marginBottom: 20 }}>
          Hey <strong>{data.collaboratorName}</strong> — please review your split and confirm below.
        </p>

        <hr style={styles.divider} />

        {/* Your share callout */}
        <div style={{ background: "#eef2fe", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "12px", color: "#5b7be8", fontWeight: 600, marginBottom: 2 }}>Your share</p>
            <p style={{ fontSize: "14px", color: "#1a1d2e", fontWeight: 500 }}>{data.collaboratorRole}</p>
          </div>
          <p style={{ fontSize: "36px", fontWeight: 800, color: "#3b6ef5" }}>{data.ownershipPercentage}%</p>
        </div>

        {/* All splits */}
        {allCollabs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ ...styles.label, marginBottom: 12 }}>Full split breakdown</p>
            <SplitBar collaborators={allCollabs} />
            {allCollabs.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                style={{ background: "none", border: "none", color: "#3b6ef5", fontSize: "13px", cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}
              >
                {showAll ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {allCollabs.length} collaborators</>}
              </button>
            )}
          </div>
        )}

        <hr style={styles.divider} />

        {/* Name field */}
        <div style={{ marginBottom: 14 }}>
          <p style={styles.label}>Your name <span style={{ color: "#e05252" }}>*</span></p>
          <input
            style={styles.input}
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        {/* Email field */}
        <div style={{ marginBottom: 14 }}>
          <p style={styles.label}>Email <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", color: "#a0a8c0" }}>(optional — for your records)</span></p>
          <input
            style={styles.input}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        {/* Checkbox */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 20, padding: "12px", background: "#f5f6fa", borderRadius: 10, border: agreed ? "1px solid #3b6ef5" : "1px solid #e2e6ef" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2, width: 18, height: 18, accentColor: "#3b6ef5", shrink: 0, cursor: "pointer" }}
          />
          <span style={{ fontSize: "14px", color: "#1a1d2e", lineHeight: 1.5 }}>
            I agree to the ownership split shown above for <strong>"{data.contractTitle}"</strong>. I understand this is a legally binding confirmation.
          </span>
        </label>

        {/* Submit error */}
        {submitError && (
          <div style={{ background: "#fff0f0", border: "1px solid #f09595", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c0392b" }}>
            {submitError}
          </div>
        )}

        {/* Confirm button */}
        <button
          style={{ ...styles.btnPrimary, opacity: (!agreed || !name.trim() || submitting) ? 0.45 : 1, cursor: (!agreed || !name.trim()) ? "not-allowed" : "pointer" }}
          disabled={!agreed || !name.trim() || submitting}
          onClick={() => handleSubmit("confirm")}
        >
          {submitting ? "Submitting…" : "✓ Confirm Agreement"}
        </button>

        {/* Request change — collapsible */}
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 13, color: "#7c84a0", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronDown size={14} />
            Request a change instead
          </summary>
          <div style={{ paddingTop: 12 }}>
            <p style={{ ...styles.label, marginBottom: 8 }}>What would you like to change?</p>
            <textarea
              style={styles.textarea}
              placeholder="Describe what needs to be changed, e.g. 'My percentage should be 40% not 35%'"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              style={{ ...styles.btnGhost, marginTop: 10 }}
              disabled={!note.trim() || submitting}
              onClick={() => handleSubmit("request_change")}
            >
              Send Change Request
            </button>
          </div>
        </details>

        {/* Footer */}
        <p style={{ fontSize: 11, color: "#a0a8c0", textAlign: "center", marginTop: 24, lineHeight: 1.5 }}>
          Powered by <strong>SplitSheet</strong> · SoundLedger Technologies Inc. · Ontario, Canada<br />
          Your confirmation is timestamped and stored securely.
        </p>
      </div>
    </div>
  );
}