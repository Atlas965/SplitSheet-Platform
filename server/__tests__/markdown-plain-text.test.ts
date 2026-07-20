import { describe, it, expect } from "vitest";
import { markdownToPlainTextLines } from "@shared/markdownPlainText";

describe("markdownToPlainTextLines: headings", () => {
  it("strips the '## ' marker and upper-cases the heading text", () => {
    expect(markdownToPlainTextLines("## 1. Acceptance of Terms")).toEqual(["1. ACCEPTANCE OF TERMS"]);
  });
});

describe("markdownToPlainTextLines: bullets", () => {
  it("replaces '- ' with a bullet character", () => {
    expect(markdownToPlainTextLines("- Mutual negotiation")).toEqual(["• Mutual negotiation"]);
  });
});

describe("markdownToPlainTextLines: bold", () => {
  it("strips ** markers from inline bold text", () => {
    expect(markdownToPlainTextLines("This is **very important**.")).toEqual(["This is very important."]);
  });

  it("strips bold markers inside headings and bullets too", () => {
    expect(markdownToPlainTextLines("## **Bold Heading**")).toEqual(["BOLD HEADING"]);
    expect(markdownToPlainTextLines("- **Bold** bullet")).toEqual(["• Bold bullet"]);
  });
});

describe("markdownToPlainTextLines: blank lines and multi-line input", () => {
  it("preserves blank lines as empty string entries (paragraph breaks)", () => {
    expect(markdownToPlainTextLines("Paragraph one.\n\nParagraph two.")).toEqual([
      "Paragraph one.",
      "",
      "Paragraph two.",
    ]);
  });

  it("processes a realistic multi-section legal document correctly", () => {
    const input = [
      "## 1. Acceptance of Terms",
      "By using this platform you agree to these terms.",
      "",
      "## 2. Rights",
      "- Mutual negotiation",
      "- **Mediation**",
    ].join("\n");

    expect(markdownToPlainTextLines(input)).toEqual([
      "1. ACCEPTANCE OF TERMS",
      "By using this platform you agree to these terms.",
      "",
      "2. RIGHTS",
      "• Mutual negotiation",
      "• Mediation",
    ]);
  });
});
