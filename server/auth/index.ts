/**
 * server/auth/index.ts — provider factory (Priority 2.1).
 */
import type { IAuthProvider } from "./IAuthProvider";
import { resolveAuthProviderName } from "./IAuthProvider";
import { LocalDevProvider } from "./providers/LocalDevProvider";
import { ReplitOIDCProvider } from "./providers/ReplitOIDCProvider";
import { GenericOIDCProvider } from "./providers/GenericOIDCProvider";

let cached: IAuthProvider | null = null;

export function getAuthProvider(): IAuthProvider {
  if (cached) return cached;
  const name = resolveAuthProviderName();
  switch (name) {
    case "local":
      cached = new LocalDevProvider();
      break;
    case "oidc":
      cached = new GenericOIDCProvider();
      break;
    case "replit":
    default:
      cached = new ReplitOIDCProvider();
      break;
  }
  console.log(`[auth] Using AUTH_PROVIDER=${name}`);
  return cached;
}

export { resolveAuthProviderName } from "./IAuthProvider";
export type { IAuthProvider, AuthUserClaims } from "./IAuthProvider";
