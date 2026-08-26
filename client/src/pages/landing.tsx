import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

/** Mirrors billing.tsx plan names/prices — do not invent. */
const OPERATOR_PLANS = [
  {
    name: "Starter Split",
    price: "$0",
    billing: "Free · no card needed",
    features: [
      "1 collaboration project",
      "Up to 2 contributors",
      "Basic split allocation",
      "Contributor confirmation links",
      "Timestamped agreement summary",
      "PDF export",
    ],
    featured: false,
  },
  {
    name: "Pay-Per-Session",
    price: "$25 CAD",
    billing: "Per completed session",
    features: [
      "Up to 5 contributors",
      "Split percentage configuration",
      "Contributor verification workflow",
      "Agreement completion tracking",
      "PDF export package",
      "Audit log storage",
      "Email confirmations",
    ],
    featured: true,
  },
  {
    name: "Creator Pro",
    price: "$15 CAD/mo",
    billing: "Unlimited sessions",
    features: [
      "Unlimited sessions (no per-session fee)",
      "Project history storage",
      "Saved contributor profiles",
      "Discounted premium exports",
    ],
    featured: false,
  },
  {
    name: "Studio Pro",
    price: "$49 CAD/mo",
    billing: "Unlimited projects & team",
    features: [
      "Unlimited projects and contributors",
      "Team management dashboard",
      "Role-based permissions",
      "Advanced audit logs",
      "Bulk exports",
      "Priority support",
    ],
    featured: false,
  },
] as const;

const WORKFLOW_STEPS = [
  { n: "01", title: "Create project", desc: "Open a song or project and enter contributors." },
  { n: "02", title: "Set splits", desc: "Define roles and ownership percentages." },
  { n: "03", title: "Build agreement", desc: "Populate the agreement workflow from your project data." },
  { n: "04", title: "Validate", desc: "Check required fields and ownership totals before sending." },
  { n: "05", title: "Confirm", desc: "Send contributors a secure link to review and confirm." },
  { n: "06", title: "Capture evidence", desc: "Record confirmation status, timestamps, and related event data." },
  { n: "07", title: "Record rights", desc: "Keep resulting ownership information in the rights ledger." },
] as const;

const TEMPLATE_CATEGORIES = [
  "Split sheets",
  "Producer agreements",
  "Master rights",
  "Publishing",
  "Licensing",
  "Artist / label",
  "Management",
  "Live / touring",
] as const;

function ProductMock() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/[0.06]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 text-xs font-medium text-muted-foreground">
          Operator workspace · Projects
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-[11rem_1fr]">
        <aside className="hidden space-y-2 border-r border-border bg-muted/30 p-4 md:block">
          {["Projects", "Clients", "Agreements", "Ownership", "Billing"].map((item, i) => (
            <div
              key={item}
              className={`rounded-md px-3 py-2 text-xs font-medium ${
                i === 0 ? "bg-accent/15 text-foreground" : "text-muted-foreground"
              }`}
            >
              {item}
            </div>
          ))}
        </aside>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active project
              </p>
              <p className="text-lg font-semibold text-foreground">Midnight Drive</p>
              <p className="text-xs text-muted-foreground">3 contributors · splits set</p>
            </div>
            <span className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground">
              Pending confirmation
            </span>
          </div>
          <div className="space-y-2">
            {[
              { name: "Jordan S.", role: "Producer", pct: "40%", status: "Confirmed" },
              { name: "Maya C.", role: "Writer", pct: "35%", status: "Sent" },
              { name: "Dev P.", role: "Co-writer", pct: "25%", status: "Not sent" },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{row.pct}</p>
                  <p className="text-[11px] text-muted-foreground">{row.status}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Send confirmations
            </span>
            <span className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Open agreement
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-tight text-primary">SplitSheet</span>
          </a>
          <div className="hidden items-center gap-7 text-sm md:flex">
            <a href="#how-it-works" className="text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </a>
            <a href="#product" className="text-muted-foreground transition-colors hover:text-foreground">
              Product
            </a>
            <a href="#templates" className="text-muted-foreground transition-colors hover:text-foreground">
              Templates
            </a>
            <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#security" className="text-muted-foreground transition-colors hover:text-foreground">
              Security
            </a>
            <a href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
              Sign In
            </a>
            <a
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </a>
          </div>
          <a
            href="/login"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground md:hidden"
          >
            Get Started
          </a>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,hsl(210_100%_60%/0.14),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-wide text-accent">SplitSheet</p>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Music rights documentation, built for the people who run it.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              SplitSheet helps studios, producers, and labels manage splits,
              agreements, contributor confirmations, evidence, and rights records
              in one operator-managed workflow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get Started
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
              >
                See How It Works
              </a>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Software for rights workflows — not a law firm, marketplace, or escrow service.
            </p>
          </div>
          <ProductMock />
        </div>
      </section>

      <section className="border-b border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold text-foreground">
            Built by{" "}
            <a
              href="https://soundledger.ca"
              className="text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              SoundLedger Technologies Inc.
            </a>
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            SplitSheet is the first product from SoundLedger Technologies Inc.,
            an Ontario technology company building infrastructure for music rights
            and creator workflows.
          </p>
        </div>
      </section>

      <section id="product" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Music rights workflows become complicated fast.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            SplitSheet replaces fragmented documents, messages, spreadsheets, and
            follow-ups with a structured workflow.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Split information gets scattered across tools",
              "Contributors need a clear way to confirm ownership",
              "Agreements need consistent project information",
              "Teams need to know who has confirmed",
              "Records need to stay organized and retrievable",
              "Operators need an auditable history of what happened",
            ].map((item) => (
              <li
                key={item}
                className="border-l-2 border-accent/40 pl-4 text-sm leading-relaxed text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How SplitSheet works
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Project → Contributors → Splits → Agreement → Review → Confirmation →
            Evidence → Rights ledger
          </p>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW_STEPS.map((step) => (
              <li key={step.n} className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-bold tracking-widest text-accent">{step.n}</p>
                <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built around the operator workspace
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Projects, contributors, agreements, confirmation status, rights ledger,
            and billing — the surfaces operators use day to day.
          </p>
          <div className="mt-10 max-w-4xl">
            <ProductMock />
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {[
              "Operator dashboard",
              "Projects",
              "Contributors",
              "Agreements",
              "Confirmation workflow",
              "Rights ledger",
              "Billing",
            ].map((s) => (
              <li key={s} className="rounded-full border border-border bg-card px-3 py-1">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Who it is for
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Built for operators who manage rights workflows for other people.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Studios",
                body: "Manage split sheets and contributor documentation across projects.",
              },
              {
                title: "Producers",
                body: "Keep collaborator information, agreements, confirmations, and rights records organized.",
              },
              {
                title: "Labels / music administrators",
                body: "Manage documentation and rights workflows across multiple creators and projects.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Contributors don&apos;t need another account.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            The operator sends a secure confirmation link. Contributors review the
            relevant information, confirm their details and participation, and
            complete the workflow without creating a SplitSheet account.
          </p>
          <ol className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {["Secure link", "Review", "Confirm", "Evidence recorded"].map((step, i, arr) => (
              <li key={step} className="flex items-center gap-3">
                <span className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="templates" className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One workflow for the documents your projects require.
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Use catalog templates across common music documentation categories.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Templates are workflow and documentation tools. They are not legal
            advice and are not represented as counsel-approved legal instruments
            unless explicitly identified as such.
          </p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Turn completed workflows into organized rights records.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Once contributor information and confirmations are complete, SplitSheet
            keeps the resulting ownership information organized as a rights record
            that can be referenced later.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-2 text-sm">
            {[
              "Song",
              "Composition",
              "Master",
              "Contributors",
              "Ownership",
              "Confirmation history",
            ].map((node, i, arr) => (
              <span key={node} className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-card px-3 py-2 font-medium text-foreground">
                  {node}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Know what happened.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            SplitSheet can retain operational evidence associated with the
            workflow. Evidence supports your records; it does not guarantee a
            legal outcome.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Confirmation status",
              "Timestamps",
              "Contributor information",
              "IP address where applicable",
              "User-agent information where applicable",
              "Document / version information",
              "Signature information where used",
            ].map((item) => (
              <li
                key={item}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="security" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Security, privacy, and control
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Practical controls for operator access and contributor links — without
            overstating certifications we do not hold.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Authenticated operator access",
              "Controlled contributor confirmation links",
              "Server-side authorization",
              "PostgreSQL-backed data",
              "Session management",
              "Stripe billing for operators",
              "Audit and evidence records",
              "Data export and account deletion where implemented",
            ].map((item) => (
              <li
                key={item}
                className="border-l-2 border-border pl-4 text-sm leading-relaxed text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple operator billing
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Operators pay for the workspace. Contributors do not need a paid account.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {OPERATOR_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-xl border bg-card p-6 ${
                  plan.featured
                    ? "border-accent shadow-lg shadow-accent/10"
                    : "border-border"
                }`}
              >
                {plan.featured && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    Popular
                  </p>
                )}
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-3 text-3xl font-bold text-foreground">{plan.price}</p>
                <p className="mt-1 text-xs text-muted-foreground">{plan.billing}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground">
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.featured
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Multi-Creator ($50–$75 CAD, quote-based) and custom operator plans are
            available.{" "}
            <a
              href="mailto:enterprise@splitsheet.ca?subject=Multi-Creator%20plan%20quote"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Request a quote
            </a>
            .
          </p>
        </div>
      </section>

      <section id="legal" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            SplitSheet provides software for documenting music rights workflows. It
            does not provide legal advice, and use of the platform does not guarantee
            the enforceability of an agreement. Users remain responsible for the
            accuracy of their information and for obtaining legal advice where
            appropriate. See Terms of Service and Privacy Policy in the site footer
            for the documents that apply.
          </p>
        </div>
      </section>

      <section className="bg-muted/50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Move your next rights workflow out of the inbox.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create a project, organize the splits, collect confirmations, and
            maintain the record.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              Get Started
            </a>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground hover:bg-muted sm:w-auto"
            >
              Explore SplitSheet
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
