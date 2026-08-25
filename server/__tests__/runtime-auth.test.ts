import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  useLocalAuthProvider,
  useSocialAuthProvider,
  isProductionLike,
} from "../runtime";

describe("runtime auth mode (Phase 1)", () => {
  const keys = [
    "AUTH_PROVIDER",
    "ALLOW_LOCAL_AUTH_IN_PRODUCTION",
    "NODE_ENV",
    "VERCEL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "LOCAL_DEV",
  ] as const;
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) snapshot[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of keys) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it("does not auto-enable local auth on Vercel without credentials", () => {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_PROVIDER;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION;
    expect(isProductionLike()).toBe(true);
    expect(useLocalAuthProvider()).toBe(false);
  });

  it("requires ALLOW_LOCAL_AUTH_IN_PRODUCTION for local on production", () => {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    process.env.AUTH_PROVIDER = "local";
    delete process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION;
    expect(useLocalAuthProvider()).toBe(false);

    process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION = "true";
    expect(useLocalAuthProvider()).toBe(true);
  });

  it("uses social when AUTH_PROVIDER=social", () => {
    process.env.AUTH_PROVIDER = "social";
    process.env.GOOGLE_CLIENT_ID = "x.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(useSocialAuthProvider()).toBe(true);
    expect(useLocalAuthProvider()).toBe(false);
  });
});
