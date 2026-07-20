/**
 * client/src/lib/legalMarkdown.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal, dependency-free renderer for the counsel-authored legal markdown
 * stored in `legal_documents.markdown_body` (server/legal-routes.ts). Only
 * supports the small subset of markdown these documents actually use:
 * `## Heading`, `- bullet`, `**bold**`, and blank-line-separated paragraphs.
 *
 * Deliberately NOT a general-purpose markdown-to-HTML renderer and does not
 * use dangerouslySetInnerHTML — every text run is rendered as plain React
 * text nodes, so there is no injection risk even though the text originates
 * from an admin-only publish endpoint.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from "react";

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function LegalMarkdown({ markdown }: { markdown: string }): JSX.Element {
  const lines = markdown.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} style={{ paddingLeft: "1.25rem", marginBottom: "12px" }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ marginBottom: "4px" }}>
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push(
      <p key={`p-${blocks.length}`} style={{ marginBottom: "12px" }}>
        {renderInline(paragraphBuffer.join(" "))}
      </p>
    );
    paragraphBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h-${blocks.length}`} style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "16px", marginBottom: "8px" }}>
          {line.slice(3)}
        </h3>
      );
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listBuffer.push(line.slice(2));
      continue;
    }

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }
  flushParagraph();
  flushList();

  return <>{blocks}</>;
}
