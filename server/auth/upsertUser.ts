/**
 * server/auth/upsertUser.ts — shared user upsert from OIDC/local claims.
 */
import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import type { AuthUserClaims } from "./IAuthProvider";

export async function upsertUserFromClaims(claims: AuthUserClaims): Promise<void> {
  const existingUser = await storage.getUser(claims.sub);

  if (existingUser) {
    await storage.updateUser(claims.sub, {
      email: claims.email,
      firstName: claims.first_name,
      lastName: claims.last_name,
      profileImageUrl: claims.profile_image_url ?? undefined,
    });
  } else {
    await db.insert(users).values({
      id: claims.sub,
      email: claims.email,
      firstName: claims.first_name,
      lastName: claims.last_name,
      profileImageUrl: claims.profile_image_url ?? undefined,
    });
  }
}
