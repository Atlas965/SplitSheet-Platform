import { describe, it, expect } from "vitest";
import {
  clientDuplicateKey,
  clientProfileSchema,
  parseClientCsv,
  parseOptionalPercent,
} from "../../shared/client-profile";

describe("client profile validation", () => {
  it("requires a name and accepts a valid email", () => {
    expect(clientProfileSchema.safeParse({ name: "" }).success).toBe(false);
    expect(clientProfileSchema.safeParse({ name: "Maya", email: "maya@x.com" }).success).toBe(true);
    expect(clientProfileSchema.safeParse({ name: "Maya", email: "not-an-email" }).success).toBe(false);
  });

  it("rejects percentages outside 0–100", () => {
    expect(() => parseOptionalPercent(110, "Default ownership")).toThrow(/0 and 100/);
    expect(parseOptionalPercent("", "Default ownership")).toBeNull();
    expect(parseOptionalPercent("40%", "Default ownership")).toBe(40);
  });

  it("dedupes by email when present", () => {
    expect(clientDuplicateKey("Maya@X.com", "Maya")).toBe("email:maya@x.com");
    expect(clientDuplicateKey("", "Maya Chen")).toBe("name:maya chen");
  });

  it("treats quoted commas as a single field", () => {
    const csv = `name,email,notes
"Chen, Maya",maya@x.com,"Label, Toronto"`;
    const { rows, errors } = parseClientCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows[0].name).toBe("Chen, Maya");
    expect(rows[0].notes).toBe("Label, Toronto");
  });

  it("parses a safe CSV and reports bad rows", () => {
    const csv = `name,email,ownership
Jordan,jordan@studio.com,40
,bad@x.com,10
Ava,not-email,20`;
    const { rows, errors } = parseClientCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Jordan");
    expect(errors.length).toBeGreaterThan(0);
  });
});
