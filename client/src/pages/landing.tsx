import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

// ── Quick Split Calculator ────────────────────────────────────────────────────
function QuickSplitCalculator() {
  const [names, setNames] = useState(["", ""]);
  const [percentages, setPercentages] = useState([50, 50]);

  const equalize = () => {
    const equal = Math.floor(100 / names.length);
    const remainder = 100 - equal * names.length;
    setPercentages(names.map((_, i) => (i === 0 ? equal + remainder : equal)));
  };

  const addPerson = () => {
    setNames([...names, ""]);
    setPercentages([...percentages, 0]);
  };

  const removePerson = (i: number) => {
    if (names.length <= 2) return;
    setNames(names.filter((_, idx) => idx !== i));
    setPercentages(percentages.filter((_, idx) => idx !== i));
  };

  const updatePct = (i: number, val: number) => {
    const updated = [...percentages];
    updated[i] = Math.max(0, Math.min(100, val));
    setPercentages(updated);
  };

  const total = percentages.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-foreground text-lg">Quick Split Preview</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Try it — no account required</p>
        </div>
        <button
          onClick={equalize}
          className="bg-accent text-accent-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
        >
          ⚖ Equal Split
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="text"
              placeholder={`Collaborator ${i + 1}`}
              value={name}
              onChange={(e) => {
                const n = [...names];
                n[i] = e.target.value;
                setNames(n);
              }}
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition-colors"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={percentages[i]}
              onChange={(e) => updatePct(i, parseInt(e.target.value) || 0)}
              className="w-16 bg-muted border border-border rounded-lg px-2 py-2 text-sm text-center text-foreground outline-none focus:border-accent transition-colors"
            />
            <span className="text-sm text-muted-foreground">%</span>
            {names.length > 2 && (
              <button
                onClick={() => removePerson(i)}
                className="text-muted-foreground hover:text-destructive transition-colors text-xl leading-none w-6 text-center"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        className={`rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between text-sm font-medium ${
          total === 100
            ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
            : "bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800"
        }`}
      >
        <span>Total ownership</span>
        <span className="font-bold">
          {total}%{" "}
          {total === 100
            ? "✓"
            : total < 100
            ? `(${100 - total}% remaining)`
            : `(${total - 100}% over)`}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={addPerson}
          className="flex-1 border border-border text-muted-foreground text-sm py-2 rounded-lg hover:border-accent hover:text-accent transition-colors"
        >
          + Add collaborator
        </button>
        <a
          href="/api/login"
          className={`flex-1 text-center text-sm py-2 rounded-lg font-semibold transition-opacity ${
            total === 100
              ? "bg-accent text-accent-foreground hover:opacity-90"
              : "bg-muted text-muted-foreground opacity-50 pointer-events-none"
          }`}
        >
          Save &amp; Send →
        </a>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        Signing up takes under 60 seconds.
      </p>
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
export default function Landing() {
  const demoSplits = [
    { name: "Jordan S.", role: "Producer",  pct: 40, color: "#3b6ef5" },
    { name: "Maya C.",   role: "Writer",    pct: 35, color: "#22a06b" },
    { name: "Dev P.",    role: "Co-writer", pct: 25, color: "#f59e0b" },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Logo />
              <span className="text-xl font-bold text-primary">SplitSheet</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features"     className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing"      className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="/api/login"    className="text-muted-foreground hover:text-foreground transition-colors">Sign In</a>
              <a href="/api/login"    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                Get Started Free
              </a>
            </div>
            <div className="md:hidden">
              <a href="/api/login" className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Professional Music Agreements Made{" "}
                <span className="text-accent">Simple</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Create and manage split sheets, performance agreements, producer
                contracts, and management deals. Built for indie artists, producers,
                and music industry professionals — with Canadian copyright principles
                in mind.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                <a
                  href="/api/login"
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors w-full sm:w-auto text-center"
                >
                  Start Creating Music Agreements
                </a>
                <a
                  href="#demo"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <i className="fas fa-play mr-2" />
                  See Example Split
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-check text-green-500" /> Free to start
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-check text-green-500" /> e-Sign included
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-check text-green-500" /> No credit card
                </span>
              </div>
            </div>
            <QuickSplitCalculator />
          </div>
        </div>
      </section>

      {/* Sample Split Sheet */}
      <section id="demo" className="py-20 bg-muted px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              See a Sample Split Sheet
            </h2>
            <p className="text-xl text-muted-foreground">
              A clear, structured agreement that all parties can review and sign.
            </p>
          </div>

          <div className="max-w-2xl mx-auto bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Split Sheet — Sample Only
                </p>
                <h3 className="text-xl font-bold text-foreground">Midnight Drive</h3>
              </div>
              <span className="bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                All Signed
              </span>
            </div>

            <div className="flex rounded-full overflow-hidden h-3 mb-4">
              {demoSplits.map((s) => (
                <div key={s.name} style={{ width: `${s.pct}%`, background: s.color }} />
              ))}
            </div>

            <div className="space-y-2.5 mb-5">
              {demoSplits.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.color }} />
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{s.pct}%</span>
                    <span className="text-xs text-green-600 dark:text-green-400">✓ Signed</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted rounded-xl p-3 border border-border/50 mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Activity Log
              </p>
              <div className="space-y-1.5">
                {[
                  { event: "Agreement created", who: "Jordan S.", time: "Today 2:14 PM" },
                  { event: "Viewed",             who: "Maya C.",   time: "Today 2:22 PM" },
                  { event: "Signed",             who: "Maya C.",   time: "Today 2:23 PM" },
                  { event: "Signed",             who: "Dev P.",    time: "Today 2:31 PM" },
                  { event: "Signed",             who: "Jordan S.", time: "Today 2:35 PM" },
                ].map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <span className="text-accent mr-1.5">⊙</span>
                      {entry.event} · <span className="font-medium">{entry.who}</span>
                    </span>
                    <span className="text-muted-foreground">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <a
                href="/api/login"
                className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-accent/90 transition-colors inline-block"
              >
                Create Your Split Sheet →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage Music Agreements
            </h2>
            <p className="text-xl text-muted-foreground">
              Professional templates, secure storage, and collaboration tools — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon:  "fas fa-file-contract",
                title: "Structured Contract Templates",
                desc:  "Templates for split sheets, performance agreements, producer contracts, and management deals — designed to help all parties clearly document their arrangement.",
              },
              {
                icon:  "fas fa-equals",
                title: "One-Click Equal Split",
                desc:  "Divide ownership evenly across all collaborators in a single click. Adjust individual percentages at any time before the agreement is finalised.",
              },
              {
                icon:  "fas fa-eye",
                title: "Collaborator Status Tracking",
                desc:  "See when each party has received, opened, and signed the agreement. Full visibility throughout the signing process for everyone involved.",
              },
              {
                icon:  "fas fa-pen-nib",
                title: "Electronic Signature",
                desc:  "Parties can draw or type their signature on any device. Each signature is recorded with a timestamp for reference in your activity log.",
              },
              {
                icon:  "fas fa-shield-alt",
                title: "Secure Document Storage",
                desc:  "Agreements are stored securely in the cloud. Export a PDF copy at any time for your own records or to share with your PRO or publisher.",
              },
              {
                icon:  "fas fa-mobile-alt",
                title: "Works on Any Device",
                desc:  "Access, review, and sign agreements from any phone, tablet, or desktop. No app download required — everything runs in the browser.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-card p-6 rounded-xl border border-border hover:border-accent/40 transition-colors">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                  <i className={`${f.icon} text-white text-xl`} />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              From track name to signed agreement — straightforward from start to finish.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step:  "01",
                icon:  "🎵",
                title: "Enter your song details",
                desc:  "Add the track title, list each collaborator by name and role, and assign ownership percentages. Use Equal Split or set custom splits.",
              },
              {
                step:  "02",
                icon:  "📱",
                title: "Invite collaborators to sign",
                desc:  "Each party receives a link by email. They can review the full agreement and add their signature on any device — no app needed.",
              },
              {
                step:  "03",
                icon:  "📄",
                title: "Download your signed agreement",
                desc:  "Once all parties have signed, download a PDF copy. An activity log records every step — created, viewed, and signed — with timestamps.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-xs font-bold text-accent bg-accent/10 border border-accent/20 rounded-full px-2.5 py-0.5">
                    Step {s.step}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground max-w-2xl mx-auto mt-10">
            SplitSheet provides tools to help you document and manage your agreements.
            For complex arrangements or legal advice, we recommend consulting a qualified
            music industry lawyer.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your music career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">

            {/* Free */}
            <div className="bg-card p-8 rounded-xl border border-border flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="text-4xl font-bold text-primary mb-2">$0</div>
                <p className="text-muted-foreground text-sm">Per month · no card needed</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "3 agreements per month",
                  "Split sheet template",
                  "PDF export",
                  "Electronic signature",
                  "Email support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <i className="fas fa-check text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/api/login"
                className="block w-full bg-secondary text-secondary-foreground py-3 rounded-lg font-semibold hover:bg-secondary/80 transition-colors text-center text-sm"
              >
                Get Started
              </a>
            </div>

            {/* Pro */}
            <div className="bg-card p-8 rounded-xl border-2 border-accent relative flex flex-col">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold text-primary mb-2">$19</div>
                <p className="text-muted-foreground text-sm">Per month</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Unlimited agreements",
                  "All contract templates",
                  "Collaborator status tracking",
                  "Payment status dashboard",
                  "Activity log with timestamps",
                  "Receipt vault",
                  "Priority support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <i className="fas fa-check text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/api/login"
                className="block w-full bg-accent text-accent-foreground py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors text-center text-sm"
              >
                Start Pro Trial
              </a>
            </div>

            {/* Label */}
            <div className="bg-card p-8 rounded-xl border border-border flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Label</h3>
                <div className="text-4xl font-bold text-primary mb-2">$49</div>
                <p className="text-muted-foreground text-sm">Per month</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Everything in Pro",
                  "Team management",
                  "Multi-artist roster",
                  "Custom templates",
                  "SMS notifications",
                  "Dedicated support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <i className="fas fa-check text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/api/login"
                className="block w-full bg-secondary text-secondary-foreground py-3 rounded-lg font-semibold hover:bg-secondary/80 transition-colors text-center text-sm"
              >
                Contact Sales
              </a>
            </div>

            {/* Enterprise */}
            <div className="bg-primary text-primary-foreground p-8 rounded-xl border border-primary relative flex flex-col">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-foreground text-primary px-4 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                  🏢 Enterprise
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                <div className="text-2xl font-bold mb-2 opacity-90">Custom Pricing</div>
                <p className="text-primary-foreground/70 text-sm">Invoiced billing · no credit card</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Everything in Label, plus:",
                  "Unlimited team members & artist rosters",
                  "White-label branding — your client's logo",
                  "Custom contract templates per jurisdiction",
                  "API access for platform integrations",
                  "Dedicated account manager",
                  "SLA — guaranteed uptime commitment",
                  "SSO / Single Sign-On",
                  "Bulk contract processing (50+ artists)",
                  "Advanced audit trails & compliance reports",
                  "Custom data retention & export policies",
                  "Priority onboarding & staff training",
                  "Invoicing instead of credit card",
                ].map((f, i) => (
                  <li
                    key={f}
                    className={`flex items-start gap-3 text-sm ${
                      i === 0
                        ? "font-semibold text-primary-foreground/90 border-b border-primary-foreground/20 pb-2 mb-1"
                        : "text-primary-foreground/85"
                    }`}
                  >
                    {i !== 0 && (
                      <i className="fas fa-check text-primary-foreground/60 mt-0.5 shrink-0" />
                    )}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:enterprise@splitsheet.ca"
                className="block w-full bg-primary-foreground text-primary py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity text-center text-sm"
              >
                Contact Enterprise Sales →
              </a>
              <p className="text-xs text-primary-foreground/60 text-center mt-3">
                Response within 1 business day
              </p>
            </div>

          </div>

          {/* Enterprise callout strip */}
          <div className="mt-10 max-w-7xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <i className="fas fa-building text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Running a label, distributor, or publishing platform?
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Enterprise includes white-label options, API access, SSO, and invoiced billing — built around how music businesses actually operate.
                  </p>
                </div>
              </div>
              <a
                href="mailto:enterprise@splitsheet.ca"
                className="shrink-0 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors text-sm whitespace-nowrap"
              >
                Talk to Sales
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-muted px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Start Documenting Your Music Agreements Today
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join artists and producers who use SplitSheet to keep their
            collaborations clear, organised, and properly documented.
          </p>
          <a
            href="/api/login"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors inline-block"
          >
            Create Your First Split Sheet Free →
          </a>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required to get started.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}