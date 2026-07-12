import { useState } from "react";
import Logo from "@/components/Logo";

type LegalModal = "terms" | "privacy" | "split-template" | null;

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ backgroundColor: "hsl(210, 100%, 60%)", opacity: 0.15 }}
            />
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center absolute"
              style={{ backgroundColor: "transparent" }}
            >
              <i
                className="fas fa-file-contract"
                style={{ color: "hsl(210, 100%, 60%)", fontSize: "13px" }}
              />
            </div>
            <span className="font-semibold text-foreground text-sm ml-7">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div
            className="prose prose-sm max-w-none"
            style={{
              color: "var(--muted-foreground)",
              fontSize: "13px",
              lineHeight: "1.7",
            }}
          >
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            SoundLedger Technologies Inc. · Ontario, Canada
          </span>
          <button
            onClick={onClose}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3
        style={{
          color: "var(--foreground)",
          fontWeight: 600,
          fontSize: "13px",
          marginBottom: "6px",
        }}
      >
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: "6px" }}>{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{ marginLeft: "16px", listStyleType: "disc", marginBottom: "3px" }}
    >
      {children}
    </li>
  );
}

// ─── Legal content components ─────────────────────────────────────────────────

export function TermsContent() {
  return (
    <>
      <p
        style={{
          fontSize: "11px",
          color: "var(--muted-foreground)",
          marginBottom: "16px",
        }}
      >
        SoundLedger Technologies Inc. – SplitSheet Product · Governing Law: Ontario, Canada
      </p>

      <Section title="1. Acceptance of Terms">
        <P>
          By accessing or using SplitSheet ("Platform"), you agree to these
          Terms. If you do not agree, do not use the Platform.
        </P>
      </Section>

      <Section title="2. Platform Liability">
        <P>
          SplitSheet acts solely as a platform to facilitate agreements and is{" "}
          <strong>not a party to any agreement between users</strong>. We are
          not responsible for disputes, performance, or enforcement of
          user-created agreements.
        </P>
      </Section>

      <Section title="3. User Responsibility">
        <P>
          Users are solely responsible for the{" "}
          <strong>accuracy, legality, and enforceability</strong> of the
          agreements they create.
        </P>
      </Section>

      <Section title="4. As-Is Disclaimer">
        <P>
          The Platform and all documents are provided{" "}
          <strong>"as-is" without guarantees or warranties</strong>, express or
          implied.
        </P>
      </Section>
      <Section title="5. No Legal Advice">
        <P>
          SplitSheet is <strong>not a law firm</strong> and does not provide
          legal advice. All templates, documents, and tools are provided for
          general informational purposes only and may not be suitable for every
          situation.
        </P>
        <P>
          Users are strongly encouraged to seek{" "}
          <strong>independent legal advice</strong> from a qualified lawyer
          before entering into any agreement.
        </P>
      </Section>

      <Section title="6. Intellectual Property">
        <P>
          All content, logos, and trademarks on SplitSheet are the{" "}
          <strong>exclusive property of SoundLedger Technologies Inc.</strong>
        </P>
      </Section>

      <Section title="6. Dispute Resolution">
        <P>
          Disputes arising from use of the Platform will be resolved in the
          following order:
        </P>
        <ul>
          <Li>Mutual negotiation</Li>
          <Li>Mediation</Li>
          <Li>Arbitration (costs shared equally)</Li>
        </ul>
      </Section>

      <Section title="8. Eligibility">
        <ul>
          <Li>Must be 18+ or age of majority in your jurisdiction</Li>
          <Li>Must have authority to enter binding agreements</Li>
        </ul>
      </Section>

      <Section title="9. User Accounts & Content">
        <ul>
          <Li>Maintain account security</Li>
          <Li>You own all uploaded content</Li>
          <Li>
            You grant SplitSheet a limited license to operate the platform
          </Li>
        </ul>
      </Section>

      <Section title="10. Payments & Subscriptions">
        <ul>
          <Li>
            Fees may apply; payments are non-refundable unless required by law
          </Li>
          <Li>Pricing may change with notice</Li>
        </ul>
      </Section>

      <Section title="11. Termination">
        <P>
          Accounts may be suspended or terminated for violating terms,
          fraudulent activity, or abuse.
        </P>
      </Section>

      <Section title="12. Limitation of Liability">
        <P>
          SplitSheet is{" "}
          <strong>not liable for indirect or consequential damages</strong>, and
          total liability is limited to fees paid in the last 12 months.
        </P>
      </Section>

      <Section title="13. Changes">
        <P>We may update these Terms; continued use constitutes acceptance.</P>
      </Section>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <p
        style={{
          fontSize: "11px",
          color: "var(--muted-foreground)",
          marginBottom: "16px",
        }}
      >
        SoundLedger Technologies Inc. – SplitSheet Product · GDPR & Canadian Privacy Law
        Aligned
      </p>

      <Section title="1. Information We Collect">
        <ul>
          <Li>
            <strong>Account info:</strong> name, email, username
          </Li>
          <Li>
            <strong>Contract data:</strong> royalty splits, ownership
            percentages, agreement terms
          </Li>
          <Li>
            <strong>Usage data:</strong> device info, IP address, interaction
            data
          </Li>
        </ul>
      </Section>

      <Section title="2. How We Use Information">
        <ul>
          <Li>Operate the platform</Li>
          <Li>Store agreements</Li>
          <Li>Improve user experience</Li>
          <Li>Ensure security</Li>
        </ul>
      </Section>

      <Section title="3. Data Sharing">
        <P>
          We <strong>do NOT sell user data</strong>. We may share with cloud
          providers, payment processors, or legal authorities if required.
        </P>
      </Section>

      <Section title="4. Data Storage & Security">
        <ul>
          <Li>Stored securely with encryption</Li>
          <Li>Access controls and secure authentication</Li>
        </ul>
      </Section>

      <Section title="5. Your Rights (Canada / GDPR)">
        <P>
          You have the right to access, correct, or request deletion of your
          data.
        </P>
      </Section>

      <Section title="6. Data Retention">
        <P>
          Retained while your account is active and as required for legal
          compliance.
        </P>
      </Section>

      <Section title="7. Platform Liability">
        <P>
          SplitSheet is{" "}
          <strong>not responsible for the content or legality</strong> of
          user-created agreements.
        </P>
      </Section>

      <Section title="8. Children">
        <P>Platform is not for users under 18.</P>
      </Section>

      <Section title="9. Dispute Resolution">
        <P>
          Privacy-related disputes follow: negotiation → mediation → arbitration
          (costs shared equally).
        </P>
      </Section>

      <Section title="10. Changes">
        <P>Policy updates may occur; continued use constitutes acceptance.</P>
      </Section>
    </>
  );
}

function SplitTemplateContent() {
  return (
    <>
      <p
        style={{
          fontSize: "11px",
          color: "var(--muted-foreground)",
          marginBottom: "16px",
        }}
      >
        SoundLedger Technologies Inc. · Standard Split Agreement Template · Ontario, Canada
      </p>

      <div
        style={{
          background: "hsl(42, 92%, 56%, 0.08)",
          border: "1px solid hsl(42, 92%, 56%, 0.3)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "16px",
          fontSize: "12px",
          color: "hsl(42, 60%, 35%)",
        }}
      >
        <i className="fas fa-exclamation-triangle mr-2" />
        This template is provided as-is. Users are solely responsible for
        accuracy and legal enforceability. SplitSheet is not a party to any
        agreement created using this template.
      </div>

      <Section title="Parties">
        <ul>
          <Li>Contributor A: [Full Legal Name]</Li>
          <Li>Contributor B: [Full Legal Name]</Li>
          <Li>Contributor C: [Full Legal Name]</Li>
        </ul>
        <P style={{ marginTop: "6px" }}>
          Collectively referred to as the "Parties".
        </P>
      </Section>

      <Section title="Work">
        <P>Song / Project Title: [Song Name / Project Name]</P>
      </Section>

      <Section title="Ownership Split">
        <ul>
          <Li>Contributor A: [%]</Li>
          <Li>Contributor B: [%]</Li>
          <Li>Contributor C: [%]</Li>
        </ul>
        <P>Total must equal 100%.</P>
      </Section>

      <Section title="Revenue Sources Covered">
        <ul>
          <Li>Streaming revenue</Li>
          <Li>Publishing royalties</Li>
          <Li>Performance royalties</Li>
          <Li>Licensing / sync deals</Li>
        </ul>
      </Section>

      <Section title="User Responsibility">
        <P>
          Users are solely responsible for the accuracy and legality of this
          agreement. SplitSheet provides it "as-is" without guarantees.
        </P>
      </Section>

      <Section title="Payment Responsibility">
        <P>
          Each party registers with relevant PROs (e.g. SOCAN, ASCAP, BMI) and
          collects their own shares unless otherwise agreed in writing.
        </P>
      </Section>

      <Section title="Representations">
        <P>
          Each party warrants they contributed to the work and have full
          authority to enter this agreement.
        </P>
      </Section>

      <Section title="Dispute Resolution">
        <P>
          Disputes resolved via: mutual negotiation → mediation → arbitration
          (costs shared equally). Governing law: Ontario, Canada.
        </P>
      </Section>

      <Section title="Amendments">
        <P>
          Must be agreed upon by all parties and updated through SplitSheet.
        </P>
      </Section>

      <Section title="Digital Execution">
        <P>Electronically signed agreements are legally binding.</P>
      </Section>

      <Section title="Intellectual Property">
        <P>
          All SplitSheet content, logos, and templates are exclusive property of{" "}
          <strong>SoundLedger Technologies Inc.</strong>
        </P>
      </Section>

      <div
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: "20px",
          paddingTop: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
        }}
      >
        {["Contributor A", "Contributor B", "Contributor C"].map((name) => (
          <div key={name}>
            <p
              style={{
                fontSize: "11px",
                color: "var(--muted-foreground)",
                marginBottom: "4px",
              }}
            >
              {name}
            </p>
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                height: "32px",
              }}
            />
            <p
              style={{
                fontSize: "10px",
                color: "var(--muted-foreground)",
                marginTop: "4px",
              }}
            >
              Signature / Date
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main Footer ──────────────────────────────────────────────────────────────

export default function Footer() {
  const [modal, setModal] = useState<LegalModal>(null);
  const year = new Date().getFullYear();

  const links: { label: string; modal: LegalModal }[] = [
    { label: "Terms of Service", modal: "terms" },
    { label: "Privacy Policy", modal: "privacy" },
    { label: "Split Agreement Template", modal: "split-template" },
  ];

  return (
    <>
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Top row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "20px",
            }}
          >
            {/* Brand */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Logo />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "var(--foreground)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  SplitSheet
                </span>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--muted-foreground)",
                  maxWidth: "240px",
                  lineHeight: "1.5",
                }}
              >
                Professional music contracts for indie artists, producers, and
                labels.
              </p>
            </div>

            {/* Legal links */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Legal
              </p>
              {links.map(({ label, modal: m }) => (
                <button
                  key={label}
                  onClick={() => setModal(m)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "var(--muted-foreground)",
                    textAlign: "left",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--foreground)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--muted-foreground)")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* Bottom row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              © {year} SoundLedger Technologies Inc. All rights reserved.
            </p>

            {/* Compliance badges */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { icon: "fa-shield-alt", label: "Ontario Law" },
                { icon: "fa-lock", label: "Encrypted" },
                { icon: "fa-file-signature", label: "e-Sign Ready" },
                { icon: "fa-user-check", label: "18+ Only" },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "11px",
                    color: "var(--muted-foreground)",
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                  }}
                >
                  <i className={`fas ${icon}`} style={{ fontSize: "10px" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Legal disclaimer */}
          <p
            style={{
              fontSize: "11px",
              color: "var(--muted-foreground)",
              lineHeight: "1.6",
              borderTop: "1px solid var(--border)",
              paddingTop: "14px",
              opacity: 0.75,
            }}
          >
            <strong>Disclaimer:</strong> SplitSheet acts solely as a platform to
            facilitate agreements and is not a party to any agreement between
            users. All documents are provided "as-is" without guarantees or
            warranties, express or implied. Users are solely responsible for the
            accuracy, legality, and enforceability of all agreements created.
            Not a substitute for legal advice. Governed by Ontario law.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {modal === "terms" && (
        <Modal title="Terms of Service" onClose={() => setModal(null)}>
          <TermsContent />
        </Modal>
      )}
      {modal === "privacy" && (
        <Modal title="Privacy Policy" onClose={() => setModal(null)}>
          <PrivacyContent />
        </Modal>
      )}
      {modal === "split-template" && (
        <Modal title="Split Agreement Template" onClose={() => setModal(null)}>
          <SplitTemplateContent />
        </Modal>
      )}
    </>
  );
}
