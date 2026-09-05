import { describe, it, expect } from "vitest";
import {
  dueReminderStage,
  estimatedMinutesSaved,
  mostCommonSplit,
  parseApiPage,
  titlesLookSimilar,
  validateCustomFieldValue,
} from "../../shared/feature-policy";

describe("reminder stages", () => {
  const sent = new Date("2026-01-01T00:00:00Z");
  it("does not remind before day 3", () => {
    expect(dueReminderStage(sent, [], Date.parse("2026-01-02T00:00:00Z"))).toBeNull();
  });
  it("returns the latest due stage that has not been sent", () => {
    expect(dueReminderStage(sent, [], Date.parse("2026-01-10T00:00:00Z"))).toBe("day_7");
    expect(dueReminderStage(sent, ["day_3"], Date.parse("2026-01-20T00:00:00Z"))).toBe("day_14");
    expect(dueReminderStage(sent, ["day_3", "day_7", "day_14"], Date.parse("2026-02-01T00:00:00Z"))).toBeNull();
  });
});

describe("custom fields and analytics helpers", () => {
  it("rejects unknown select options and required empties", () => {
    expect(validateCustomFieldValue({ fieldType: "select", label: "Territory", options: ["CA"], required: true }, "US").ok).toBe(false);
    expect(validateCustomFieldValue({ fieldType: "text", label: "Note", required: true }, "").ok).toBe(false);
    expect(validateCustomFieldValue({ fieldType: "number", label: "Fee" }, "12").ok).toBe(true);
  });
  it("caps API pages and estimates time saved", () => {
    expect(parseApiPage({ limit: "999", offset: "-4" })).toEqual({ limit: 100, offset: 0 });
    expect(estimatedMinutesSaved(2)).toBe(50);
  });
  it("detects similar titles and common splits", () => {
    expect(titlesLookSimilar("Midnight Drive", "midnight-drive")).toBe(true);
    expect(mostCommonSplit([50, 50, 60])?.label).toBe("50.00%");
  });
});
