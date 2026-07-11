/**
 * Offline fallback responses when OpenAI is unavailable (quota, network, etc.).
 * Keeps CoPilot useful for core SplitSheet workflow questions.
 */
import { COPILOT_PRICING, resolveCopilotPageKey } from "./copilot-knowledge";

export function getFallbackResponse(userMessage: string, currentPage?: string): string | null {
  const q = userMessage.toLowerCase();
  const pageKey = resolveCopilotPageKey(currentPage) ?? currentPage;

  const matches = (...terms: string[]) => terms.some((t) => q.includes(t));

  if (matches("first project", "start", "get started", "new operator", "begin")) {
    return [
      "Here's how to start your first project on SplitSheet:",
      "",
      "1. Go to **Clients** and add the artist or producer you're working with.",
      "2. Open **Projects** and create a new project linked to that client.",
      "3. Add every contributor with name, email, role, PRO, and ownership %.",
      "4. Make sure composition percentages total exactly **100%** (master % is tracked separately).",
      "5. Click **Generate Confirmation Links** and send each link to contributors.",
      "6. When everyone confirms, the project moves to **Confirmed** and you can export a PDF.",
      "",
      "Need help on a specific step? Tell me which stage you're on.",
    ].join("\n");
  }

  if (matches("split sheet", "what is a split", "why split")) {
    return [
      "A **split sheet** is a written record of who owns what percentage of a song's composition and master recording.",
      "",
      "Without one, collaborators often disagree later about royalties — SOCAN, ASCAP, and distributors need documented splits to pay correctly.",
      "",
      "In SplitSheet: create a project → add contributors → send confirmation links → export PDF once everyone confirms.",
    ].join("\n");
  }

  if (matches("confirmation", "confirm", "link", "contributor confirm")) {
    return [
      "SplitSheet's confirmation flow works like this:",
      "",
      "1. On the project detail page, click **Generate Confirmation Links**.",
      "2. Each contributor gets a unique URL — no account required.",
      "3. They review their split, agree, and confirm (timestamp + IP logged).",
      "4. When **all** contributors confirm, the project status updates automatically.",
      "",
      "Links expire after 72 hours — regenerate if needed.",
    ].join("\n");
  }

  if (matches("100%", "100 percent", "ownership", "percentage", "add up")) {
    return [
      "The **100% rule**: all composition ownership percentages in a project must total exactly 100%.",
      "",
      "Master recording percentages are tracked **separately** — a producer might own 30% of the master but 0% of the composition.",
      "",
      "SplitSheet validates totals before you can send confirmation links.",
    ].join("\n");
  }

  if (matches("pricing", "plan", "cost", "how much", "tier", "free", "session", "pro", "studio")) {
    return [
      "SplitSheet pricing (all CAD):",
      "",
      COPILOT_PRICING,
      "",
      "Visit **Billing** in the sidebar to manage your plan.",
    ].join("\n");
  }

  if (matches("socan", "ascap", "bmi", "pro ", "ipi", "cae")) {
    return [
      "**PROs** (Performance Rights Organizations) collect performance royalties for songwriters.",
      "",
      "• **SOCAN** — default for Canadian operators (performance + mechanical)",
      "• **ASCAP / BMI / SESAC** — US-based PROs",
      "• **IPI/CAE** — 9-digit ID assigned when you register with your PRO; needed for CWR export",
      "",
      "Add each contributor's PRO and IPI when setting up splits.",
    ].join("\n");
  }

  if (matches("rights ledger", "ownership ledger", "iswc", "archive", "deactivate")) {
    return [
      "The **Rights Ledger** (/ownership) is your long-term song asset registry.",
      "",
      "• Register songs with ISWC codes and asset type",
      "• Track ownership history over time",
      "• **Archive** (reversible) or **Deactivate** (permanent)",
      "• View revenue breakdown and activity log per asset",
      "",
      "Projects handle split confirmation; the Rights Ledger tracks assets after registration.",
    ].join("\n");
  }

  if (matches("agreement", "contract", "producer agreement", "template")) {
    return [
      "SplitSheet supports four agreement types:",
      "",
      "1. **Split Sheet** — composition/master ownership",
      "2. **Producer Agreement** — producer fee and royalty terms",
      "3. **Performance Agreement** — live show terms",
      "4. **Management Agreement** — artist management commission",
      "",
      "Go to **Music Agreements** → pick a template → fill fields → add collaborators → send for signature.",
    ].join("\n");
  }

  if (matches("workflow", "walk me through", "full process", "how does splitsheet")) {
    return [
      "The SplitSheet operator workflow has 4 stages:",
      "",
      "1. **Client Intake** — add artists, producers, or labels you work with",
      "2. **Split Setup** — create a project, add contributors, set ownership %",
      "3. **Contributor Confirmation** — send token links; contributors confirm without an account",
      "4. **Confirmed Record** — timestamped agreement, audit trail, PDF export",
      "",
      currentPage
        ? `You're currently on **${pageKey ?? currentPage}** — ask me what to do next on this page.`
        : "Which stage are you on? I can give step-by-step guidance.",
    ].join("\n");
  }

  if (matches("pdf", "export", "download")) {
    return "You can export a PDF at any stage of an agreement from the contract detail page. The PDF includes all filled fields, party names, and confirmation records. Filename format: `{title}_agreement.pdf`.";
  }

  if (matches("legal advice", "lawyer", "binding", "enforceable")) {
    return "SplitSheet is a **workflow and documentation platform**, not a law firm. Documents generated here do not constitute legal advice. For binding contracts or complex deals, consult a qualified music entertainment lawyer.";
  }

  // Page-aware default
  const pageHints: Record<string, string> = {
    "/": "On the **Dashboard**, check pending confirmations and recent projects. Use quick actions to create a client or project.",
    "/clients": "On **Clients**, click **Add Client** to register an artist, producer, songwriter, or label.",
    "/projects": "On **Projects**, create a project, add contributors, validate 100% totals, then generate confirmation links.",
    "/contracts": "On **Music Agreements**, browse templates or open an existing agreement to edit or export.",
    "/ownership": "On the **Rights Ledger**, register song assets and track ownership history over time.",
    "/billing": "On **Billing**, view your plan, upgrade, or manage Stripe subscription.",
    "/analytics": "On **Analytics**, monitor confirmation rates and project activity.",
  };

  if (pageKey && pageHints[pageKey]) {
    return [
      pageHints[pageKey],
      "",
      "Ask me a specific question about this page, or try: \"How do I set up ownership splits?\" or \"What is the confirmation workflow?\"",
    ].join("\n");
  }

  return null;
}

export function getOpenAIErrorMessage(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);

  if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
    return "OpenAI API quota exceeded. Add billing at platform.openai.com or update OPENAI_API_KEY in your .env file. I'm using offline guidance for now.";
  }
  if (msg.includes("401") || msg.toLowerCase().includes("invalid api key")) {
    return "Invalid OpenAI API key. Check OPENAI_API_KEY in your .env file.";
  }
  if (msg.includes("503") || msg.toLowerCase().includes("overloaded")) {
    return "OpenAI is temporarily overloaded. Please try again in a moment.";
  }
  if (msg.toLowerCase().includes("certificate") || msg.toLowerCase().includes("tls")) {
    return "Network SSL error reaching OpenAI. Check your firewall or proxy settings.";
  }
  return "I couldn't reach the AI service right now. Here's what I can tell you from SplitSheet's built-in knowledge:";
}

/** Stream text as SSE chunks (same format the client expects). */
export function streamTextAsSSE(
  res: import("express").Response,
  text: string,
): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  appendTextAsSSE(res, text);
}

/** Append streamed text when SSE headers are already sent. */
export function appendTextAsSSE(
  res: import("express").Response,
  text: string,
): void {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (!word) continue;
    res.write(
      `data: ${JSON.stringify({ choices: [{ delta: { content: word } }] })}\n\n`,
    );
  }
  res.write("data: [DONE]\n\n");
  res.end();
}
