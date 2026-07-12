import { describe, it, expect } from "vitest";
import { calculateSplits, deductPlatformFee, toCents, fromCents } from "../payment-service";

describe("payment-service: currency-safe math", () => {
  it("converts dollars to integer cents without float drift", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1)).toBe(10);
    expect(toCents(100)).toBe(10000);
  });

  it("converts cents back to a 2-decimal dollar string", () => {
    expect(fromCents(1999)).toBe("19.99");
    expect(fromCents(10)).toBe("0.10");
    expect(fromCents(0)).toBe("0.00");
  });

  it("deducts the default 2.5% platform fee", () => {
    const { netCents, feeCents } = deductPlatformFee(10_000); // $100.00
    expect(feeCents).toBe(250); // 2.5%
    expect(netCents).toBe(9_750);
    expect(netCents + feeCents).toBe(10_000);
  });

  it("supports a custom fee in basis points", () => {
    const { netCents, feeCents } = deductPlatformFee(10_000, 1000); // 10%
    expect(feeCents).toBe(1_000);
    expect(netCents).toBe(9_000);
  });
});

describe("payment-service: calculateSplits (largest-remainder method)", () => {
  const payee = (userId: string, ownershipPct: number) => ({
    userId,
    stripeAccountId: `acct_${userId}`,
    ownershipPct,
  });

  it("splits an even 3-way 33.33/33.33/33.34 split without losing a cent", () => {
    const collaborators = [
      payee("a", 33.33),
      payee("b", 33.33),
      payee("c", 33.34),
    ];
    const result = calculateSplits(10_000, collaborators); // $100.00
    const sum = result.reduce((s, r) => s + r.cents, 0);
    expect(sum).toBe(10_000); // no cent lost or duplicated to rounding
    expect(result).toHaveLength(3);
  });

  it("handles an uneven split (e.g. 3-way even thirds) using largest remainder", () => {
    const collaborators = [payee("a", 33.333), payee("b", 33.333), payee("c", 33.334)];
    const result = calculateSplits(100, collaborators); // $1.00 = 100 cents
    const sum = result.reduce((s, r) => s + r.cents, 0);
    expect(sum).toBe(100);
  });

  it("gives 100% of the pot to a single collaborator", () => {
    const result = calculateSplits(5_000, [payee("solo", 100)]);
    expect(result).toEqual([{ userId: "solo", stripeAccountId: "acct_solo", cents: 5_000, ownershipPct: 100 }]);
  });

  it("throws when ownership percentages do not sum to 100%", () => {
    expect(() => calculateSplits(1_000, [payee("a", 40), payee("b", 40)])).toThrow(
      /must sum to 100%/
    );
  });

  it("never produces a negative or NaN cent amount for any split", () => {
    const collaborators = [payee("a", 12.5), payee("b", 37.5), payee("c", 50)];
    const result = calculateSplits(7, collaborators); // tiny pot — stress rounding
    for (const r of result) {
      expect(Number.isInteger(r.cents)).toBe(true);
      expect(r.cents).toBeGreaterThanOrEqual(0);
    }
    expect(result.reduce((s, r) => s + r.cents, 0)).toBe(7);
  });

  it("is stable across many collaborators (20-way split)", () => {
    const collaborators = Array.from({ length: 20 }, (_, i) => payee(`u${i}`, 5));
    const result = calculateSplits(999, collaborators); // not evenly divisible by 20
    expect(result.reduce((s, r) => s + r.cents, 0)).toBe(999);
  });
});
