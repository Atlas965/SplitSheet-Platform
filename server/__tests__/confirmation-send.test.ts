import { describe, it, expect } from "vitest";
import {
  classifyRecipientSkip,
  isContractSendable,
  parseBulkProjectIds,
  DUPLICATE_WINDOW_MS,
  RESEND_COOLDOWN_MS,
} from "../../shared/confirmation-send";

describe("bulk confirmation send policy", () => {
  it("parses unique project ids and rejects an empty selection", () => {
    expect(parseBulkProjectIds({}).ok).toBe(false);
    expect(parseBulkProjectIds({ projectIds: ["a", "a", "b"] })).toEqual({
      ok: true,
      ids: ["a", "b"],
    });
    expect(parseBulkProjectIds({ sessionIds: ["s1"] }).ok).toBe(true);
  });

  it("blocks completed or cancelled sessions", () => {
    expect(isContractSendable("signed")).toEqual({ ok: false, code: "session_completed" });
    expect(isContractSendable("cancelled")).toEqual({ ok: false, code: "session_cancelled" });
    expect(isContractSendable("pending").ok).toBe(true);
    expect(isContractSendable("draft").ok).toBe(true);
  });

  it("skips confirmed, revoked, and missing emails", () => {
    expect(classifyRecipientSkip({
      mode: "send",
      confirmationStatus: "confirmed",
      email: "a@x.com",
    }).skip).toBe(true);
    expect(classifyRecipientSkip({
      mode: "send",
      confirmationStatus: "revoked",
      email: "a@x.com",
    })).toEqual({ skip: true, code: "revoked" });
    expect(classifyRecipientSkip({
      mode: "resend",
      confirmationStatus: "revoked",
      email: "a@x.com",
    }).skip).toBe(false);
    expect(classifyRecipientSkip({
      mode: "send",
      confirmationStatus: "not_sent",
      email: "",
    })).toEqual({ skip: true, code: "no_email" });
  });

  it("is idempotent inside the duplicate window unless this is an explicit resend", () => {
    const sentAt = new Date(Date.now() - 60_000);
    expect(classifyRecipientSkip({
      mode: "send",
      confirmationStatus: "sent",
      email: "a@x.com",
      sentAt,
    })).toEqual({ skip: true, code: "already_sent" });
    expect(classifyRecipientSkip({
      mode: "remind",
      confirmationStatus: "sent",
      email: "a@x.com",
      sentAt,
    })).toEqual({ skip: true, code: "already_sent" });
    expect(classifyRecipientSkip({
      mode: "resend",
      confirmationStatus: "sent",
      email: "a@x.com",
      sentAt,
    }).skip).toBe(false);
    expect(classifyRecipientSkip({
      mode: "send",
      confirmationStatus: "sent",
      email: "a@x.com",
      sentAt: new Date(Date.now() - DUPLICATE_WINDOW_MS - 1000),
    }).skip).toBe(false);
  });

  it("cools down a double-click resend", () => {
    expect(classifyRecipientSkip({
      mode: "resend",
      confirmationStatus: "sent",
      email: "a@x.com",
      sentAt: new Date(Date.now() - RESEND_COOLDOWN_MS + 5_000),
    })).toEqual({ skip: true, code: "already_sent" });
  });

  it("reminds only people who already received a first send", () => {
    expect(classifyRecipientSkip({
      mode: "remind",
      confirmationStatus: "not_sent",
      email: "a@x.com",
    })).toEqual({ skip: true, code: "not_yet_sent" });
  });
});
