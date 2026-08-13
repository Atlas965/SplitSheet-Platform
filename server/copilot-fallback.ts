/**
 * Offline fallback responses when OpenAI is unavailable (quota, network, etc.).
 * Keeps CoPilot useful for core SplitSheet workflow questions — answers from product catalog only.
 */
import {
  CATALOG_TEMPLATES,
  LEGAL_DISCLAIMER,
  TEMPLATE_CATEGORIES,
} from "@shared/agreement-catalog";
import { MVP_TEMPLATE_TYPES } from "@shared/agreement-mvp";
import {
  COPILOT_PRICING,
  findCatalogTemplateHint,
  resolveCopilotPageKey,
} from "./copilot-knowledge";
import {
  legalAdviceRefusal,
  ledgerDataRedirect,
  summarizeProductTemplate,
} from "./copilot-product-grounding";

function templateDisclaimerLine(): string {
  return `\n\n_${LEGAL_DISCLAIMER}_`;
}

export function getFallbackResponse(userMessage: string, currentPage?: string): string | null {
  const q = userMessage.toLowerCase();
  const pageKey = resolveCopilotPageKey(currentPage) ?? currentPage;

  const matches = (...terms: string[]) => terms.some((t) => q.includes(t));

  if (matches("legal advice", "lawyer", "binding", "enforceable", "attorney", "law firm", "should i sue")) {
    return legalAdviceRefusal();
  }

  if (matches("who owns", "ownership of this", "my split", "points on this")) {
    return ledgerDataRedirect();
  }

  const named = findCatalogTemplateHint(q);
  if (
    named &&
    matches(
      "template",
      "agreement",
      "what is",
      "what's",
      "explain",
      "tell me about",
      "when do i use",
      "when should",
      "use a",
      "use the",
    )
  ) {
    return summarizeProductTemplate(q);
  }

  if (named && (q.includes(named.type) || q.includes(named.name.toLowerCase()))) {
    if (matches("agreement", "template", "license", "sheet", "contract") || named.name.split(" ").length <= 4) {
      return summarizeProductTemplate(q);
    }
  }

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
      "Need an agreement scaffold beyond the split? Browse **Templates** for producer, master, publishing, licensing, or live docs.",
      "",
      "Need help on a specific step? Tell me which stage you're on.",
    ].join("\n");
  }

  if (matches("split sheet", "what is a split", "why split")) {
    return (
      summarizeProductTemplate("split sheet") ??
      [
        "A **split sheet** in SplitSheet is a workflow template to document who owns what percentage of a song's composition (and related collaborator roles).",
        templateDisclaimerLine(),
      ].join("\n")
    );
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
      "The **100% rule** (product validation): all composition ownership percentages in a project must total exactly 100%.",
      "",
      "Master recording percentages are tracked **separately** in the product — e.g. a producer might have 30% on the master fields and 0% on composition fields.",
      "",
      "These are SplitSheet documentation fields, not a legal determination of title.",
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
      "The **Rights Ledger** (/ownership) is your long-term song asset registry in SplitSheet.",
      "",
      "• Register songs with ISWC codes and asset type",
      "• Track ownership history over time (append-only versions)",
      "• **Archive** (reversible) or **Deactivate** (permanent)",
      "• Executed ownership/license agreements can sync structured records into the ledger",
      "",
      "Ledger rows are **stored product records**, not legal ownership determinations.",
      "",
      "Projects handle split confirmation; the Rights Ledger tracks assets after registration.",
    ].join("\n");
  }

  if (matches("template library", "all templates", "list templates", "what templates", "agreement template", "music agreement")) {
    const cats = TEMPLATE_CATEGORIES.filter((c) => !(c as { reserved?: boolean }).reserved)
      .map((c) => `• **${c.label}**`)
      .join("\n");
    return [
      `SplitSheet's **Entertainment Agreement Template Library** has **${CATALOG_TEMPLATES.length}** workflow templates under **Templates** in the sidebar.`,
      `**${MVP_TEMPLATE_TYPES.length}** are activated for normal create.`,
      "",
      "Categories:",
      cats,
      "",
      "Each card shows description, rights tags, required parties, risk level, version, and legal-review status.",
      "Ask me about a specific template by name (e.g. “What is a Producer Agreement?” or “When do I use a Sync License?”).",
      templateDisclaimerLine(),
    ].join("\n");
  }

  if (matches("agreement", "contract", "producer agreement", "template", "sync license", "publishing", "master license")) {
    if (named) return summarizeProductTemplate(q);

    return [
      `SplitSheet has an expanded **template library** (${CATALOG_TEMPLATES.length} workflow templates; ${MVP_TEMPLATE_TYPES.length} active for create), including:`,
      "",
      "• **Song Creation** — Split Sheet, Co-Writing, Producer, Featured Artist, Remixer, …",
      "• **Master Rights** — Master ownership, assignment, exclusive/non-exclusive licenses, studio agreements",
      "• **Publishing** — Publishing, co-pub, admin, mechanical, sync, catalogue admin",
      "• **Artist & Label** — Management, recording artist, distribution, merch, marketing",
      "• **Licensing** — Sync / film / TV / ad / game / podcast / creator licenses",
      "• **Live & Touring** — Performance, venue, promoter, booking, tour, sponsorship",
      "",
      "Go to **Templates**, filter by category or rights, then **Create Agreement**.",
      "I can explain what each template is *for in the workflow* — not whether it is legally sufficient for your deal.",
      templateDisclaimerLine(),
    ].join("\n");
  }

  if (matches("workflow", "walk me through", "full process", "how does splitsheet")) {
    return [
      "The SplitSheet operator workflow has these core stages:",
      "",
      "1. **Client Intake** — add artists, producers, or labels you work with",
      "2. **Split Setup** — create a project, add contributors, set ownership %",
      "3. **Contributor Confirmation** — send token links; contributors confirm without an account",
      "4. **Confirmed Record** — timestamped documentation, audit trail, PDF export",
      "5. **Templates / Agreements** — use the library when you need producer, master, publishing, licensing, or live documentation scaffolds",
      "",
      currentPage
        ? `You're currently on **${pageKey ?? currentPage}** — ask me what to do next on this page.`
        : "Which stage are you on? I can give step-by-step guidance.",
    ].join("\n");
  }

  if (matches("pdf", "export", "download")) {
    return "You can export a PDF at any stage of an agreement from the contract detail page. The PDF includes filled fields, party names, and confirmation records. Filename format: `{title}_agreement.pdf`.";
  }

  const pageHints: Record<string, string> = {
    "/": "On the **Dashboard**, check pending confirmations and recent projects. Use quick actions to create a client or project.",
    "/clients": "On **Clients**, click **Add Client** to register an artist, producer, songwriter, or label.",
    "/projects": "On **Projects**, create a project, add contributors, validate 100% totals, then generate confirmation links. Check **Recommended Agreements** on a project for template suggestions.",
    "/contracts": "On **Contracts**, open an existing agreement to edit, confirm, or export. To start from a scaffold, open **Agreements** (Entertainment Agreement Templates Library).",
    "/templates": "On **Entertainment Agreement Templates**, browse the library. Filter by category, rights, risk, or status, then Preview or Create Agreement. Ask me about any template by name.",
    "/ownership": "On the **Rights Ledger**, register song assets and track ownership history over time. Ledger data is stored product information, not a legal determination.",
    "/billing": "On **Billing**, view your plan, upgrade, or manage Stripe subscription.",
    "/analytics": "On **Analytics**, monitor confirmation rates and project activity.",
    "/admin": "On **Admin → Agreements**, operators with admin role can activate, version, archive, and update legal-review status for templates.",
  };

  if (pageKey && pageHints[pageKey]) {
    return [
      pageHints[pageKey],
      "",
      "Ask me a specific question about this page, or try: \"Which template should I use for a producer?\" or \"What is a Sync License template for?\"",
      templateDisclaimerLine(),
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
