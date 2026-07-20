/**
 * server/adminAuth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Platform-admin authorization middleware (`users.role === "admin"`).
 * Extracted from server/routes.ts into its own module so other route files
 * (e.g. server/legal-routes.ts) can import it without creating a circular
 * dependency on routes.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export async function isAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const isAdminUser = (dbUser as any).role === "admin";
    if (!isAdminUser) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
