/**
 * shared/markdownPlainText.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts the small markdown-lite subset used by counsel-authored legal text
 * (`## heading`, `- bullet`, `**bold**` — see client/src/lib/legalMarkdown.tsx)
 * into plain text lines, for renderers that can't do rich text — currently
 * client/src/lib/pdfGenerator.ts (jsPDF has no markdown/HTML support).
 *
 * Lives in shared/ (not client/src/lib/) so it can be unit tested from
 * server/__tests__ per this repo's vitest config, and reused server-side by
 * a future real PDF renderer (Priority 3.1) without duplication.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Strips the two inline markers this subset supports (`**bold**`) down to plain text. */
function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

/**
 * Converts markdown-lite body text into an array of plain-text lines ready
 * for a fixed-width PDF renderer: headings are upper-cased on their own
 * line, bullets become "• " prefixed lines, blank lines are preserved as
 * paragraph breaks (empty string entries).
 */
export function markdownToPlainTextLines(markdown: string): string[] {
  const lines = markdown.split("\n");
  const output: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      output.push(stripInlineMarkdown(line.slice(3)).toUpperCase());
      continue;
    }

    if (line.startsWith("- ")) {
      output.push(`• ${stripInlineMarkdown(line.slice(2))}`);
      continue;
    }

    output.push(stripInlineMarkdown(line));
  }

  return output;
}
